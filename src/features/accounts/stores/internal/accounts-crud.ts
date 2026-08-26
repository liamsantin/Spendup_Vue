import { accountsApi } from '@/features/accounts/api';
import {
    canArchiveAccount,
    canDeleteAccount,
    canEditAccount,
    canRestoreAccount,
    canSetPrimaryAccount,
    sanitizeUpdateAccountPayload
} from '@/features/accounts/rights';
import type { Account, CreateAccountPayload, UpdateAccountPayload } from '@/features/accounts/types';
import {
    assertAccountAllowed,
    requireLocalAccount
} from '@/features/accounts/stores/internal/accounts-authz';
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
        error,
        cache,
        clearError,
        beginActing,
        endActing,
        upsertAccount,
        removeAccountLocal,
        hydrateSelectedFromList,
        applyPrimaryLocally,
        markPromoted,
        syncSelectedWithList
    } = state;

    /** Incrémente à chaque `loadAccountDetail` — les réponses tardives d’un id précédent sont ignorées. */
    let detailRequestSeq = 0;
    /** Bumpé après mutation locale sur un compte — ignore un GET détail démarré avant. */
    let detailDataGen = 0;

    function bumpDetailData(publicId: string) {
        detailDataGen += 1;
        cache.touch(KEY_ACCOUNTS);
        cache.touch(`detail:${publicId}`);
    }

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
     * `loadingDetail` est géré hors du loader cache (cache hit / courses).
     * @param publicId Identifiant public du compte.
     * @param force Si `true`, ignore le TTL et refetch.
     * @returns Le compte sélectionné, ou `null`.
     */
    async function loadAccountDetail(publicId: string, force = false) {
        const requestId = ++detailRequestSeq;
        const existedAtStart = accounts.value.some((a) => a.publicId === publicId);
        const cacheKey = `detail:${publicId}`;
        // Soft + TTL frais : pas de GET. Sinon un join d’inflight périmé (cancel/reopen) doit refetch.
        const needsFetch = force || !cache.isFresh(cacheKey, ACCOUNTS_DETAIL_MAX_AGE_MS);
        hydrateSelectedFromList(publicId);
        loadingDetail.value = true;
        clearError();

        async function fetchDetail(ensureForce: boolean): Promise<boolean> {
            let applied = false;
            const genAtStart = detailDataGen;
            await cache.ensure(
                cacheKey,
                async () => {
                    try {
                        const account = normalizeAccount(await accountsApi.get(publicId));
                        // Ne pas écraser liste / sélection avec une réponse périmée.
                        if (requestId !== detailRequestSeq) {
                            return;
                        }
                        if (genAtStart !== detailDataGen) {
                            return;
                        }
                        // Revoke / leave pendant le GET : ne pas ressusciter le compte.
                        if (existedAtStart && !accounts.value.some((a) => a.publicId === account.publicId)) {
                            return;
                        }
                        upsertAccount(account);
                        selectedAccount.value = account;
                        applied = true;
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
                    }
                },
                { force: ensureForce, maxAgeMs: ACCOUNTS_DETAIL_MAX_AGE_MS }
            );
            return applied;
        }

        try {
            const applied = await fetchDetail(force);
            // Join d’un GET annulé (même clé) : le loader partagé early-return sans upsert — forcer un vrai GET.
            // Pas de retry si le compte a disparu (revoke / leave) pendant le GET.
            if (
                requestId === detailRequestSeq &&
                needsFetch &&
                !applied &&
                accounts.value.some((a) => a.publicId === publicId)
            ) {
                await fetchDetail(true);
            }
        } finally {
            if (requestId === detailRequestSeq) {
                loadingDetail.value = false;
            }
        }
        if (requestId !== detailRequestSeq) {
            // Loader périmé a quand même marqué le TTL : invalider pour forcer un refetch à la réouverture.
            cache.invalidate(cacheKey);
            return selectedAccount.value;
        }
        if (selectedAccount.value?.publicId !== publicId) {
            hydrateSelectedFromList(publicId);
        }
        return selectedAccount.value;
    }

    /** Invalide les loads détail en cours (fermeture modale / reset) — ignore les réponses tardives. */
    function cancelPendingDetailLoads() {
        detailRequestSeq += 1;
        loadingDetail.value = false;
    }

    /**
     * Crée un compte et l’ajoute en tête de liste (gère le primary si besoin).
     * @param payload Données de création du compte.
     * @returns Le compte créé.
     */
    async function createAccount(payload: CreateAccountPayload) {
        beginActing();
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
            endActing();
        }
    }

    /**
     * Met à jour un compte existant.
     * @param publicId Identifiant public du compte.
     * @param payload Champs à mettre à jour.
     * @returns Le compte mis à jour.
     */
    async function updateAccount(publicId: string, payload: UpdateAccountPayload) {
        beginActing();
        clearError();
        try {
            const local = requireLocalAccount(accounts.value, selectedAccount.value, publicId);
            assertAccountAllowed(canEditAccount(local));
            const body = sanitizeUpdateAccountPayload(local, payload);
            const account = normalizeAccount(await accountsApi.update(publicId, body));
            upsertAccount(account);
            bumpDetailData(publicId);
            if (account.isOwned && account.isPrimary) {
                applyPrimaryLocally(account.publicId, account);
            }
            return account;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            endActing();
        }
    }

    /**
     * Définit le compte comme principal et déclenche le highlight UI.
     * @param publicId Identifiant public du compte à promouvoir.
     * @returns Le compte promu.
     */
    async function setPrimary(publicId: string) {
        beginActing();
        clearError();
        try {
            const local = requireLocalAccount(accounts.value, selectedAccount.value, publicId);
            assertAccountAllowed(canSetPrimaryAccount(local));
            const account = normalizeAccount(await accountsApi.setPrimary(publicId));
            applyPrimaryLocally(publicId, account);
            bumpDetailData(publicId);
            markPromoted(publicId);
            return account;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            endActing();
        }
    }

    /**
     * Archive un compte (soft).
     * @param publicId Identifiant public du compte à archiver.
     * @returns Le compte archivé.
     */
    async function archiveAccount(publicId: string) {
        beginActing();
        clearError();
        try {
            const local = requireLocalAccount(accounts.value, selectedAccount.value, publicId);
            assertAccountAllowed(canArchiveAccount(local));
            const account = normalizeAccount(await accountsApi.archive(publicId));
            upsertAccount(account);
            bumpDetailData(publicId);
            return account;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            endActing();
        }
    }

    /**
     * Restaure un compte archivé.
     * @param publicId Identifiant public du compte à restaurer.
     * @returns Le compte restauré.
     */
    async function restoreAccount(publicId: string) {
        beginActing();
        clearError();
        try {
            const local = requireLocalAccount(accounts.value, selectedAccount.value, publicId);
            assertAccountAllowed(canRestoreAccount(local));
            const account = normalizeAccount(await accountsApi.restore(publicId));
            upsertAccount(account);
            bumpDetailData(publicId);
            return account;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            endActing();
        }
    }

    /**
     * Supprime définitivement un compte.
     * @param publicId Identifiant public du compte à supprimer.
     */
    async function deleteAccount(publicId: string) {
        beginActing();
        clearError();
        try {
            const local = requireLocalAccount(accounts.value, selectedAccount.value, publicId);
            assertAccountAllowed(canDeleteAccount(local));
            await accountsApi.remove(publicId);
            removeAccountLocal(publicId);
            cache.touch(KEY_ACCOUNTS);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            endActing();
        }
    }

    return {
        loadAccounts,
        loadAccountDetail,
        cancelPendingDetailLoads,
        createAccount,
        updateAccount,
        setPrimary,
        archiveAccount,
        restoreAccount,
        deleteAccount
    };
}

export type AccountsCrud = ReturnType<typeof createAccountsCrud>;
