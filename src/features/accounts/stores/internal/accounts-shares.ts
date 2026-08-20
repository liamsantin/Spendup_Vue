import { accountsApi } from '../../api';
import type { ShareRole } from '../../types';
import { KEY_ACCOUNTS, KEY_INCOMING, type AccountsState } from './accounts-state';
import type { AccountsCrud } from './accounts-crud';

export function createAccountsShares(state: AccountsState, crud: Pick<AccountsCrud, 'loadAccounts'>) {
    const {
        incomingShares,
        shares,
        sharesByAccountId,
        loadingIncoming,
        loadingShares,
        acting,
        error,
        cache,
        clearError,
        setSharesForAccount
    } = state;

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

    async function loadShares(accountPublicId: string, force = false) {
        await cache.ensure(
            `shares:${accountPublicId}`,
            async () => {
                loadingShares.value = true;
                clearError();
                try {
                    const result = await accountsApi.listShares(accountPublicId);
                    setSharesForAccount(accountPublicId, Array.isArray(result?.items) ? result.items : []);
                } catch (e: unknown) {
                    error.value = e instanceof Error ? e.message : String(e);
                    throw e;
                } finally {
                    loadingShares.value = false;
                }
            },
            { force }
        );
        shares.value = sharesByAccountId.get(accountPublicId) ?? [];
    }

    async function inviteShare(accountPublicId: string, userPublicId: string, role: ShareRole, photoUrl?: string | null) {
        acting.value = true;
        clearError();
        try {
            const share = await accountsApi.inviteShare(accountPublicId, { userPublicId, role });
            const merged = {
                ...share,
                photoUrl: share.photoUrl || photoUrl || null
            };
            const current = sharesByAccountId.get(accountPublicId) ?? shares.value;
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

    async function updateShareRole(accountPublicId: string, userPublicId: string, role: ShareRole) {
        acting.value = true;
        clearError();
        try {
            const share = await accountsApi.updateShareRole(accountPublicId, userPublicId, { role });
            const current = sharesByAccountId.get(accountPublicId) ?? shares.value;
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

    async function revokeShare(accountPublicId: string, userPublicId: string) {
        acting.value = true;
        clearError();
        try {
            await accountsApi.revokeShare(accountPublicId, userPublicId);
            const current = sharesByAccountId.get(accountPublicId) ?? shares.value;
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

    async function acceptShare(sharePublicId: string) {
        acting.value = true;
        clearError();
        try {
            await accountsApi.acceptShare(sharePublicId);
            incomingShares.value = incomingShares.value.filter((s) => s.publicId !== sharePublicId);
            cache.touch(KEY_INCOMING);
            await crud.loadAccounts(true);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

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
