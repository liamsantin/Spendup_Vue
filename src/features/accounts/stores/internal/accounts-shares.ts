import { accountsApi } from '@/features/accounts/api';
import { canLeaveAccountShare, canManageShares } from '@/features/accounts/rights';
import type { HiddenAccountField, ShareRole } from '@/features/accounts/types';
import { assertAccountAllowed, requireIncomingShare, requireLocalAccount } from '@/features/accounts/stores/internal/accounts-authz';
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
        accounts,
        incomingShares,
        sharesByAccountId,
        selectedAccount,
        loadingIncoming,
        loadingShares,
        error,
        cache,
        clearError,
        beginActing,
        endActing,
        setSharesForAccount,
        activateSharesView,
        removeAccountLocal
    } = state;

    /** Incrémente à chaque `loadShares` — ignore les réponses tardives d’un autre compte. */
    let sharesRequestSeq = 0;
    /** Bumpé après mutation locale — un GET démarré avant ignore son apply. */
    let sharesDataGen = 0;

    function bumpSharesData(accountPublicId: string) {
        sharesDataGen += 1;
        cache.touch(`shares:${accountPublicId}`);
    }

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
        const cacheKey = `shares:${accountPublicId}`;
        const needsFetch = force || !cache.isFresh(cacheKey);
        loadingShares.value = true;
        clearError();

        async function fetchShares(ensureForce: boolean): Promise<boolean> {
            let applied = false;
            const genAtStart = sharesDataGen;
            await cache.ensure(
                cacheKey,
                async () => {
                    try {
                        const result = await accountsApi.listShares(accountPublicId);
                        if (requestId !== sharesRequestSeq) return;
                        if (genAtStart !== sharesDataGen) return;
                        setSharesForAccount(accountPublicId, Array.isArray(result?.items) ? result.items : []);
                        applied = true;
                    } catch (e: unknown) {
                        if (requestId === sharesRequestSeq) {
                            error.value = e instanceof Error ? e.message : String(e);
                        }
                        throw e;
                    }
                },
                { force: ensureForce }
            );
            return applied;
        }

        try {
            const applied = await fetchShares(force);
            if (requestId === sharesRequestSeq && needsFetch && !applied) {
                await fetchShares(true);
            }
        } finally {
            if (requestId === sharesRequestSeq) {
                loadingShares.value = false;
            }
        }
        if (requestId !== sharesRequestSeq) {
            cache.invalidate(cacheKey);
            return;
        }
        if (selectedAccount.value?.publicId === accountPublicId) {
            activateSharesView(accountPublicId);
        }
    }

    /** Ignore les réponses shares en vol (fermeture / changement de compte). */
    function cancelPendingSharesLoads() {
        sharesRequestSeq += 1;
        loadingShares.value = false;
    }

    /**
     * Invite un utilisateur à partager un compte (met à jour la liste locale).
     * @param accountPublicId Identifiant public du compte partagé.
     * @param userPublicId Identifiant public de l’utilisateur invité.
     * @param role Rôle accordé (`viewer`, `editor`, etc.).
     * @param photoUrl Photo de profil optionnelle à conserver côté UI.
     * @param hiddenFields Champs masqués (viewer uniquement ; défaut serveur si omis).
     * @returns Le partage créé / fusionné.
     */
    async function inviteShare(
        accountPublicId: string,
        userPublicId: string,
        role: ShareRole,
        photoUrl?: string | null,
        hiddenFields?: HiddenAccountField[]
    ) {
        beginActing();
        clearError();
        try {
            const local = requireLocalAccount(accounts.value, selectedAccount.value, accountPublicId);
            assertAccountAllowed(canManageShares(local));
            const body = role === 'viewer' && hiddenFields != null ? { userPublicId, role, hiddenFields } : { userPublicId, role };
            const share = await accountsApi.inviteShare(accountPublicId, body);
            const merged = {
                ...share,
                photoUrl: share.photoUrl || photoUrl || null,
                hiddenFields: share.hiddenFields ?? []
            };
            const current = sharesByAccountId.get(accountPublicId) ?? [];
            const idx = current.findIndex((s) => s.userPublicId === userPublicId);
            const next = idx >= 0 ? [...current.slice(0, idx), merged, ...current.slice(idx + 1)] : [...current, merged];
            setSharesForAccount(accountPublicId, next);
            bumpSharesData(accountPublicId);
            return merged;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            endActing();
        }
    }

    /**
     * Change le rôle et/ou les champs masqués d’un partage existant.
     * @param accountPublicId Identifiant public du compte.
     * @param userPublicId Identifiant public du bénéficiaire.
     * @param role Nouveau rôle.
     * @param hiddenFields Champs masqués (viewer uniquement).
     * @returns Le partage mis à jour.
     */
    async function updateShareRole(accountPublicId: string, userPublicId: string, role: ShareRole, hiddenFields?: HiddenAccountField[]) {
        beginActing();
        clearError();
        try {
            const local = requireLocalAccount(accounts.value, selectedAccount.value, accountPublicId);
            assertAccountAllowed(canManageShares(local));
            const body = role === 'viewer' && hiddenFields != null ? { role, hiddenFields } : { role };
            const share = await accountsApi.updateShareRole(accountPublicId, userPublicId, body);
            const normalized = { ...share, hiddenFields: share.hiddenFields ?? [] };
            const current = sharesByAccountId.get(accountPublicId) ?? [];
            const idx = current.findIndex((s) => s.userPublicId === userPublicId);
            if (idx >= 0) {
                setSharesForAccount(accountPublicId, [...current.slice(0, idx), normalized, ...current.slice(idx + 1)]);
                bumpSharesData(accountPublicId);
            } else {
                await loadShares(accountPublicId, true);
            }
            return normalized;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            endActing();
        }
    }

    /**
     * Révoque un partage et le retire de la liste locale.
     * @param accountPublicId Identifiant public du compte.
     * @param userPublicId Identifiant public du bénéficiaire à révoquer.
     */
    async function revokeShare(accountPublicId: string, userPublicId: string) {
        beginActing();
        clearError();
        try {
            const local = requireLocalAccount(accounts.value, selectedAccount.value, accountPublicId);
            assertAccountAllowed(canManageShares(local));
            await accountsApi.revokeShare(accountPublicId, userPublicId);
            const current = sharesByAccountId.get(accountPublicId) ?? [];
            setSharesForAccount(
                accountPublicId,
                current.filter((s) => s.userPublicId !== userPublicId)
            );
            bumpSharesData(accountPublicId);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            endActing();
        }
    }

    /**
     * Quitte un partage actif (destinataire) et retire le compte de la liste locale.
     * @param accountPublicId Identifiant public du compte partagé.
     */
    async function leaveShare(accountPublicId: string) {
        beginActing();
        clearError();
        try {
            const local = requireLocalAccount(accounts.value, selectedAccount.value, accountPublicId);
            assertAccountAllowed(canLeaveAccountShare(local));
            await accountsApi.leaveShare(accountPublicId);
            removeAccountLocal(accountPublicId);
            cache.touch(KEY_ACCOUNTS);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            endActing();
        }
    }

    /**
     * Accepte une invitation et recharge la liste des comptes.
     * @param sharePublicId Identifiant public de l’invitation.
     */
    async function acceptShare(sharePublicId: string) {
        beginActing();
        clearError();
        try {
            requireIncomingShare(incomingShares.value, sharePublicId);
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
            endActing();
        }
    }

    /**
     * Refuse une invitation entrante.
     * @param sharePublicId Identifiant public de l’invitation.
     */
    async function refuseShare(sharePublicId: string) {
        beginActing();
        clearError();
        try {
            requireIncomingShare(incomingShares.value, sharePublicId);
            await accountsApi.refuseShare(sharePublicId);
            incomingShares.value = incomingShares.value.filter((s) => s.publicId !== sharePublicId);
            cache.touch(KEY_INCOMING);
        } catch (e: unknown) {
            error.value = getErrorMessage(e);
            throw e;
        } finally {
            endActing();
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
        cancelPendingSharesLoads,
        inviteShare,
        updateShareRole,
        revokeShare,
        leaveShare,
        acceptShare,
        refuseShare,
        refreshAll
    };
}

export type AccountsShares = ReturnType<typeof createAccountsShares>;
