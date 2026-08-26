import type { AccountsState } from '@/features/accounts/stores/internal/accounts-state';
import type { AccountsCrud } from '@/features/accounts/stores/internal/accounts-crud';
import type { AccountsShares } from '@/features/accounts/stores/internal/accounts-shares';
import type { AccountsRealtime } from '@/features/accounts/stores/internal/accounts-realtime';

type LifecycleDeps = Pick<AccountsCrud, 'loadAccounts' | 'cancelPendingDetailLoads'> &
    Pick<AccountsShares, 'loadIncoming' | 'cancelPendingSharesLoads'> &
    Pick<AccountsRealtime, 'ensureRealtimeBridge' | 'teardownRealtimeBridge'> & {
        cancelPendingSnapshotsLoads: () => void;
    };

/**
 * Cycle de vie du store : onglets, bootstrap, prefetch idle, reset.
 * @param state État partagé du store.
 * @param deps Actions de chargement et bridge realtime.
 * @returns Les actions de cycle de vie.
 */
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
        loadingMoreSnapshots,
        initialized,
        error,
        focusAccountPublicId,
        focusSharePublicId,
        cache,
        clearPromoteHighlight,
        resetActing,
        resetSnapshotsPagination
    } = state;

    const {
        loadAccounts,
        loadIncoming,
        ensureRealtimeBridge,
        teardownRealtimeBridge,
        cancelPendingDetailLoads,
        cancelPendingSharesLoads,
        cancelPendingSnapshotsLoads
    } = deps;

    let prefetchTimer: ReturnType<typeof setTimeout> | number | null = null;

    /** Annule le prefetch planifié en idle. */
    function cancelIdlePrefetch() {
        if (prefetchTimer == null) return;
        if (typeof cancelIdleCallback === 'function') {
            cancelIdleCallback(prefetchTimer as number);
        }
        clearTimeout(prefetchTimer);
        prefetchTimer = null;
    }

    /**
     * Précharge en idle l’onglet non actif (invitations ↔ comptes).
     * @param tab Onglet actuellement ouvert.
     */
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

    /**
     * Ouvre un onglet et charge les données associées.
     * @param tab Onglet à ouvrir (`Accounts` ou `Invitations`).
     */
    async function openTab(tab: 'Accounts' | 'Invitations') {
        ensureRealtimeBridge();
        if (tab === 'Accounts') {
            await loadAccounts();
            return;
        }
        await loadIncoming();
    }

    /**
     * Premier chargement de la page comptes + prefetch de l’autre onglet.
     * @param tab Onglet initial (défaut : `Accounts`).
     */
    async function bootstrap(tab: 'Accounts' | 'Invitations' = 'Accounts') {
        ensureRealtimeBridge();
        await openTab(tab);
        if (!initialized.value) {
            initialized.value = true;
            scheduleIdlePrefetch(tab);
        }
    }

    /** Remet le store à zéro (logout / reset session). */
    function reset() {
        cancelIdlePrefetch();
        cancelPendingDetailLoads();
        cancelPendingSharesLoads();
        cancelPendingSnapshotsLoads();
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
        loadingMoreSnapshots.value = false;
        resetActing();
        resetSnapshotsPagination();
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
