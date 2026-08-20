import { accountsApi } from '../../api';
import type { CreateAccountPayload, UpdateAccountPayload } from '../../types';
import { ACCOUNTS_DETAIL_MAX_AGE_MS, KEY_ACCOUNTS, type AccountsState } from './accounts-state';

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
        markPromoted
    } = state;

    async function loadAccounts(force = false) {
        await cache.ensure(
            KEY_ACCOUNTS,
            async () => {
                loadingAccounts.value = true;
                clearError();
                try {
                    const result = await accountsApi.list();
                    accounts.value = Array.isArray(result?.items) ? result.items : [];
                } catch (e: unknown) {
                    error.value = e instanceof Error ? e.message : String(e);
                    throw e;
                } finally {
                    loadingAccounts.value = false;
                }
            },
            { force }
        );
    }

    async function loadAccountDetail(publicId: string, force = false) {
        hydrateSelectedFromList(publicId);
        await cache.ensure(
            `detail:${publicId}`,
            async () => {
                loadingDetail.value = true;
                clearError();
                try {
                    const account = await accountsApi.get(publicId);
                    selectedAccount.value = account;
                    upsertAccount(account);
                    return;
                } catch (e: unknown) {
                    error.value = e instanceof Error ? e.message : String(e);
                    if (!accounts.value.some((a) => a.publicId === publicId)) {
                        selectedAccount.value = null;
                    }
                    throw e;
                } finally {
                    loadingDetail.value = false;
                }
            },
            { force, maxAgeMs: ACCOUNTS_DETAIL_MAX_AGE_MS }
        );
        if (selectedAccount.value?.publicId !== publicId) {
            hydrateSelectedFromList(publicId);
        }
        return selectedAccount.value;
    }

    async function createAccount(payload: CreateAccountPayload) {
        acting.value = true;
        clearError();
        try {
            const account = await accountsApi.create(payload);
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

    async function updateAccount(publicId: string, payload: UpdateAccountPayload) {
        acting.value = true;
        clearError();
        try {
            const account = await accountsApi.update(publicId, payload);
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

    async function setPrimary(publicId: string) {
        acting.value = true;
        clearError();
        try {
            const account = await accountsApi.setPrimary(publicId);
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

    async function archiveAccount(publicId: string) {
        acting.value = true;
        clearError();
        try {
            const account = await accountsApi.archive(publicId);
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

    async function restoreAccount(publicId: string) {
        acting.value = true;
        clearError();
        try {
            const account = await accountsApi.restore(publicId);
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
