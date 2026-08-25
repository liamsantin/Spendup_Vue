import { accountsApi } from '@/features/accounts/api';
import type { ShareRole } from '@/features/accounts/types';
import { KEY_ACCOUNTS, KEY_INCOMING, type AccountsState } from '@/features/accounts/stores/internal/accounts-state';
import type { AccountsCrud } from '@/features/accounts/stores/internal/accounts-crud';
import { getErrorMessage } from '@/utils/errors/app-error';

/**
 * Actions liées aux partages et invitations entrantes.
 * @param state État partagé du store.
 * @param crud Dépendances CRUD (ex. `loadAccounts` après acceptation).
 * @returns Les actions de partage.
 */
export function createAccountsShares(state: AccountsState, crud: Pick<AccountsCrud, 'loadAccounts'>) {
    const {
        incomingShares,
        sharesByAccountId,
        selectedAccount,
        loadingIncoming,
        loadingShares,
        acting,
        error,
        cache,
        clearError,
        setSharesForAccount,
        activateSharesView
    } = state;

    /** Incrémente à chaque `loadShares` — ignore les réponses tardives d’un autre compte. */
    let sharesRequestSeq = 0;

    /**
     * Charge les invitations de partage reçues.
     * @param force Si `true`, ignore le TTL et refetch.
     */
    async function loadIncoming(force = false) {
        await cache.ensure(
            KEY_INCOMING,
            async () => {
                loadingIncoming.value = true;
                clearError();
                try {
                    const result = await accountsApi.listIncomingShares();
                    incomingShares.value = Array.isArray(result?.items) ? result.items : [];
                } catch (e: unknown) {
                    error.value = e instanceof Error ? e.message : String(e);
                    throw e;
                } finally {
                    loadingIncoming.value = false;
                }
            },
            { force }
        );
    }

    /**
     * Charge les partages d’un compte donné.
     * @param accountPublicId Identifiant public du compte.
     * @param force Si `true`, ignore le TTL et refetch.
     */
    async function loadShares(accountPublicId: string, force = false) {
        const requestId = ++sharesRequestSeq;
        await cache.ensure(
            `shares:${accountPublicId}`,
            async () => {
                if (requestId === sharesRequestSeq) {
                    loadingShares.value = true;
                    clearError();
                }
                try {
                    const result = await accountsApi.listShares(accountPublicId);
                    setSharesForAccount(accountPublicId, Array.isArray(result?.items) ? result.items : []);
                } catch (e: unknown) {
                    if (requestId === sharesRequestSeq) {
                        error.value = e instanceof Error ? e.message : String(e);
                    }
                    throw e;
                } finally {
                    if (requestId === sharesRequestSeq) {
                        loadingShares.value = false;
                    }
                }
            },
            { force }
        );
        if (requestId === sharesRequestSeq && selectedAccount.value?.publicId === accountPublicId) {
            activateSharesView(accountPublicId);
        }
    }

    /**
     * Invite un utilisateur à partager un compte (met à jour la liste locale).
     * @param accountPublicId Identifiant public du compte partagé.
     * @param userPublicId Identifiant public de l’utilisateur invité.
     * @param role Rôle accordé (`viewer`, `editor`, etc.).
     * @param photoUrl Photo de profil optionnelle à conserver côté UI.
     * @returns Le partage créé / fusionné.
     */
    async function inviteShare(accountPublicId: string, userPublicId: string, role: ShareRole, photoUrl?: string | null) {
        acting.value = true;
        clearError();
        try {
            const share = await accountsApi.inviteShare(accountPublicId, { userPublicId, role });
            const merged = {
                ...share,
                photoUrl: share.photoUrl || photoUrl || null
            };
            const current = sharesByAccountId.get(accountPublicId) ?? [];
            const idx = current.findIndex((s) => s.userPublicId === userPublicId);
            const next = idx >= 0 ? [...current.slice(0, idx), merged, ...current.slice(idx + 1)] : [...current, merged];
            setSharesForAccount(accountPublicId, next);
            cache.touch(`shares:${accountPublicId}`);
            return merged;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    /**
     * Change le rôle d’un partage existant.
     * @param accountPublicId Identifiant public du compte.
     * @param userPublicId Identifiant public du bénéficiaire.
     * @param role Nouveau rôle.
     * @returns Le partage mis à jour.
     */
    async function updateShareRole(accountPublicId: string, userPublicId: string, role: ShareRole) {
        acting.value = true;
        clearError();
        try {
            const share = await accountsApi.updateShareRole(accountPublicId, userPublicId, { role });
            const current = sharesByAccountId.get(accountPublicId) ?? [];
            const idx = current.findIndex((s) => s.userPublicId === userPublicId);
            if (idx >= 0) {
                setSharesForAccount(accountPublicId, [...current.slice(0, idx), share, ...current.slice(idx + 1)]);
                cache.touch(`shares:${accountPublicId}`);
            } else {
                await loadShares(accountPublicId, true);
            }
            return share;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    /**
     * Révoque un partage et le retire de la liste locale.
     * @param accountPublicId Identifiant public du compte.
     * @param userPublicId Identifiant public du bénéficiaire à révoquer.
     */
    async function revokeShare(accountPublicId: string, userPublicId: string) {
        acting.value = true;
        clearError();
        try {
            await accountsApi.revokeShare(accountPublicId, userPublicId);
            const current = sharesByAccountId.get(accountPublicId) ?? [];
            setSharesForAccount(
                accountPublicId,
                current.filter((s) => s.userPublicId !== userPublicId)
            );
            cache.touch(`shares:${accountPublicId}`);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    /**
     * Accepte une invitation et recharge la liste des comptes.
     * @param sharePublicId Identifiant public de l’invitation.
     */
    async function acceptShare(sharePublicId: string) {
        acting.value = true;
        clearError();
        try {
            await accountsApi.acceptShare(sharePublicId);
            incomingShares.value = incomingShares.value.filter((s) => s.publicId !== sharePublicId);
            cache.touch(KEY_INCOMING);
            await crud.loadAccounts(true);
        } catch (e: unknown) {
            // Ex. amitié disparue / bloquée — afficher le message métier API, pas seulement “introuvable”.
            error.value = getErrorMessage(e);
            try {
                await loadIncoming(true);
            } catch {
                /* ignore refresh secondary failure */
            }
            throw e;
        } finally {
            acting.value = false;
        }
    }

    /**
     * Refuse une invitation entrante.
     * @param sharePublicId Identifiant public de l’invitation.
     */
    async function refuseShare(sharePublicId: string) {
        acting.value = true;
        clearError();
        try {
            await accountsApi.refuseShare(sharePublicId);
            incomingShares.value = incomingShares.value.filter((s) => s.publicId !== sharePublicId);
            cache.touch(KEY_INCOMING);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    /** Invalide et recharge comptes + invitations. */
    async function refreshAll() {
        cache.invalidate(KEY_ACCOUNTS);
        cache.invalidate(KEY_INCOMING);
        await Promise.all([crud.loadAccounts(true), loadIncoming(true)]);
    }

    return {
        loadIncoming,
        loadShares,
        inviteShare,
        updateShareRole,
        revokeShare,
        acceptShare,
        refuseShare,
        refreshAll
    };
}

export type AccountsShares = ReturnType<typeof createAccountsShares>;
