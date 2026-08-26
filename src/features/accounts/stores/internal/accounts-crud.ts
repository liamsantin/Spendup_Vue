import { accountsApi } from '@/features/accounts/api';
import type { Account, CreateAccountPayload, UpdateAccountPayload } from '@/features/accounts/types';
import { ACCOUNTS_DETAIL_MAX_AGE_MS, KEY_ACCOUNTS, type AccountsState } from '@/features/accounts/stores/internal/accounts-state';
import { AppError } from '@/utils/errors/app-error';

function normalizeAccount(account: Account): Account {
    return {
        ...account,
        hiddenFields: Array.isArray(account.hiddenFields) ? account.hiddenFields : []
    };
}

/**
 * Actions CRUD et chargement des comptes.
 * @param state État partagé du store.
 * @returns Les actions CRUD.
 */
export function createAccountsCrud(state: AccountsState) {
    const {
        accounts,
        selectedAccount,
        loadingAccounts,
        loadingDetail,
        acting,
        error,
        cache,
        clearError,
        upsertAccount,
        removeAccountLocal,
        hydrateSelectedFromList,
        applyPrimaryLocally,
        markPromoted,
        syncSelectedWithList,
        clearSelected
    } = state;

    /** Incrémente à chaque `loadAccountDetail` — les réponses tardives d’un id précédent sont ignorées. */
    let detailRequestSeq = 0;

    /**
     * Charge la liste des comptes (TTL cache).
     * @param force Si `true`, ignore le TTL et refetch.
     */
    async function loadAccounts(force = false) {
        await cache.ensure(
            KEY_ACCOUNTS,
            async () => {
                loadingAccounts.value = true;
                clearError();
                try {
                    const result = await accountsApi.list();
                    accounts.value = (Array.isArray(result?.items) ? result.items : []).map(normalizeAccount);
                    syncSelectedWithList();
                } catch (e: unknown) {
                    error.value = e instanceof Error ? e.message : String(e);
                    throw e;
                } finally {
                    loadingAccounts.value = false;
                }
            },
            { force }
        );
        // Cache hit : la liste n’a pas bougé, mais on réaligne quand même (sécurité).
        syncSelectedWithList();
    }

    /**
     * Charge le détail d’un compte (hydrate d’abord depuis la liste).
     * @param publicId Identifiant public du compte.
     * @param force Si `true`, ignore le TTL et refetch.
     * @returns Le compte sélectionné, ou `null`.
     */
    async function loadAccountDetail(publicId: string, force = false) {
        const requestId = ++detailRequestSeq;
        hydrateSelectedFromList(publicId);
        await cache.ensure(
            `detail:${publicId}`,
            async () => {
                if (requestId === detailRequestSeq) {
                    loadingDetail.value = true;
                    clearError();
                }
                try {
                    const account = normalizeAccount(await accountsApi.get(publicId));
                    upsertAccount(account);
                    if (requestId === detailRequestSeq) {
                        selectedAccount.value = account;
                    }
                } catch (e: unknown) {
                    if (requestId === detailRequestSeq) {
                        const err = AppError.fromUnknown(e);
                        error.value = err.message;
                        // Soft-delete / partage purgé : retirer de la liste et invalider caches locaux.
                        if (err.status === 404 || !accounts.value.some((a) => a.publicId === publicId)) {
                            removeAccountLocal(publicId);
                        }
                    }
                    throw e;
                } finally {
                    if (requestId === detailRequestSeq) {
                        loadingDetail.value = false;
                    }
                }
            },
            { force, maxAgeMs: ACCOUNTS_DETAIL_MAX_AGE_MS }
        );
        if (requestId !== detailRequestSeq) {
            return selectedAccount.value;
        }
        if (selectedAccount.value?.publicId !== publicId) {
            hydrateSelectedFromList(publicId);
        }
        return selectedAccount.value;
    }

    /**
     * Crée un compte et l’ajoute en tête de liste (gère le primary si besoin).
     * @param payload Données de création du compte.
     * @returns Le compte créé.
     */
    async function createAccount(payload: CreateAccountPayload) {
        acting.value = true;
        clearError();
        try {
            const account = normalizeAccount(await accountsApi.create(payload));
            upsertAccount(account, true);
            cache.touch(KEY_ACCOUNTS);
            cache.touch(`detail:${account.publicId}`);
            const onlyOwned = accounts.value.filter((a) => a.isOwned).length === 1;
            if (account.isOwned && (account.isPrimary || onlyOwned)) {
                applyPrimaryLocally(account.publicId, { ...account, isPrimary: true });
            }
            return account;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    /**
     * Met à jour un compte existant.
     * @param publicId Identifiant public du compte.
     * @param payload Champs à mettre à jour.
     * @returns Le compte mis à jour.
     */
    async function updateAccount(publicId: string, payload: UpdateAccountPayload) {
        acting.value = true;
        clearError();
        try {
            const account = normalizeAccount(await accountsApi.update(publicId, payload));
            upsertAccount(account);
            cache.touch(KEY_ACCOUNTS);
            cache.touch(`detail:${publicId}`);
            if (account.isOwned && account.isPrimary) {
                applyPrimaryLocally(account.publicId, account);
            }
            return account;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    /**
     * Définit le compte comme principal et déclenche le highlight UI.
     * @param publicId Identifiant public du compte à promouvoir.
     * @returns Le compte promu.
     */
    async function setPrimary(publicId: string) {
        acting.value = true;
        clearError();
        try {
            const account = normalizeAccount(await accountsApi.setPrimary(publicId));
            applyPrimaryLocally(publicId, account);
            markPromoted(publicId);
            return account;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    /**
     * Archive un compte (soft).
     * @param publicId Identifiant public du compte à archiver.
     * @returns Le compte archivé.
     */
    async function archiveAccount(publicId: string) {
        acting.value = true;
        clearError();
        try {
            const account = normalizeAccount(await accountsApi.archive(publicId));
            upsertAccount(account);
            cache.touch(KEY_ACCOUNTS);
            cache.touch(`detail:${publicId}`);
            return account;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    /**
     * Restaure un compte archivé.
     * @param publicId Identifiant public du compte à restaurer.
     * @returns Le compte restauré.
     */
    async function restoreAccount(publicId: string) {
        acting.value = true;
        clearError();
        try {
            const account = normalizeAccount(await accountsApi.restore(publicId));
            upsertAccount(account);
            cache.touch(KEY_ACCOUNTS);
            cache.touch(`detail:${publicId}`);
            return account;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    /**
     * Supprime définitivement un compte.
     * @param publicId Identifiant public du compte à supprimer.
     */
    async function deleteAccount(publicId: string) {
        acting.value = true;
        clearError();
        try {
            await accountsApi.remove(publicId);
            removeAccountLocal(publicId);
            cache.touch(KEY_ACCOUNTS);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    return {
        loadAccounts,
        loadAccountDetail,
        createAccount,
        updateAccount,
        setPrimary,
        archiveAccount,
        restoreAccount,
        deleteAccount
    };
}

export type AccountsCrud = ReturnType<typeof createAccountsCrud>;
