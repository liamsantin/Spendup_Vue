import type { AccountsState } from './accounts-state';
import type { AccountsCrud } from './accounts-crud';
import type { AccountsShares } from './accounts-shares';
import type { AccountsRealtime } from './accounts-realtime';

type LifecycleDeps = Pick<AccountsCrud, 'loadAccounts'> &
    Pick<AccountsShares, 'loadIncoming'> &
    Pick<AccountsRealtime, 'ensureRealtimeBridge' | 'teardownRealtimeBridge'>;

export function createAccountsLifecycle(state: AccountsState, deps: LifecycleDeps) {
    const {
        accounts,
        incomingShares,
        selectedAccount,
        shares,
        sharesByAccountId,
        balanceSnapshots,
        snapshotsByAccountId,
        loadingAccounts,
        loadingIncoming,
        loadingDetail,
        loadingShares,
        loadingSnapshots,
        acting,
        initialized,
        error,
        focusAccountPublicId,
        focusSharePublicId,
        cache,
        clearPromoteHighlight
    } = state;

    const { loadAccounts, loadIncoming, ensureRealtimeBridge, teardownRealtimeBridge } = deps;

    let prefetchTimer: ReturnType<typeof setTimeout> | number | null = null;

    function cancelIdlePrefetch() {
        if (prefetchTimer == null) return;
        if (typeof cancelIdleCallback === 'function') {
            cancelIdleCallback(prefetchTimer as number);
        }
        clearTimeout(prefetchTimer);
        prefetchTimer = null;
    }

    function scheduleIdlePrefetch(tab: 'Accounts' | 'Invitations') {
        if (import.meta.env.VITEST) return;
        cancelIdlePrefetch();
        const run = () => {
            prefetchTimer = null;
            if (tab === 'Accounts') {
                void loadIncoming().catch(() => undefined);
                return;
            }
            void loadAccounts().catch(() => undefined);
        };
        if (typeof requestIdleCallback === 'function') {
            prefetchTimer = requestIdleCallback(run, { timeout: 2000 });
            return;
        }
        prefetchTimer = setTimeout(run, 2000);
    }

    async function openTab(tab: 'Accounts' | 'Invitations') {
        ensureRealtimeBridge();
        if (tab === 'Accounts') {
            await loadAccounts();
            return;
        }
        await loadIncoming();
    }

    async function bootstrap(tab: 'Accounts' | 'Invitations' = 'Accounts') {
        ensureRealtimeBridge();
        await openTab(tab);
        if (!initialized.value) {
            initialized.value = true;
            scheduleIdlePrefetch(tab);
        }
    }

    function reset() {
        cancelIdlePrefetch();
        cache.reset();
        sharesByAccountId.clear();
        snapshotsByAccountId.clear();
        accounts.value = [];
        incomingShares.value = [];
        selectedAccount.value = null;
        shares.value = [];
        balanceSnapshots.value = [];
        loadingAccounts.value = false;
        loadingIncoming.value = false;
        loadingDetail.value = false;
        loadingShares.value = false;
        loadingSnapshots.value = false;
        acting.value = false;
        initialized.value = false;
        error.value = null;
        focusAccountPublicId.value = null;
        focusSharePublicId.value = null;
        clearPromoteHighlight();
        teardownRealtimeBridge();
    }

    return {
        openTab,
        bootstrap,
        reset
    };
}

export type AccountsLifecycle = ReturnType<typeof createAccountsLifecycle>;
