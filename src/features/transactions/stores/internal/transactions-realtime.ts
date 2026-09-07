import { useNotificationsStore } from '@/features/notifications';
import { parseAccountChangedPayload } from '@/features/notifications/normalize';
import type { AccountChangedPayload } from '@/features/notifications';
import type { TransactionsCrud } from '@/features/transactions/stores/internal/transactions-crud';
import type { TransactionsState } from '@/features/transactions/stores/internal/transactions-state';

type RealtimeDeps = Pick<TransactionsCrud, 'refetchActive' | 'refreshAccountBalances'>;

const TRANSACTION_CHANGES = new Set(['transactionCreated', 'transactionUpdated', 'transactionDeleted']);

/**
 * Abonnement SignalR `accountChanged` pour invalider les transactions (et les soldes).
 */
export function createTransactionsRealtime(state: TransactionsState, deps: RealtimeDeps) {
    const { removeByAccount, initialized, invalidateAllLists } = state;
    const { refetchActive, refreshAccountBalances } = deps;

    let unsubscribeAccountChanged: (() => void) | null = null;
    let refreshScheduled = false;
    const pendingAccountIds = new Set<string>();

    function flushPendingRefresh() {
        refreshScheduled = false;
        const ids = [...pendingAccountIds];
        pendingAccountIds.clear();
        if (!ids.length) return;
        invalidateAllLists();
        if (initialized.value) {
            void refetchActive(true);
        }
        void refreshAccountBalances(ids);
    }

    function scheduleRefresh(accountPublicId: string) {
        pendingAccountIds.add(accountPublicId);
        if (refreshScheduled) return;
        refreshScheduled = true;
        queueMicrotask(flushPendingRefresh);
    }

    function handleAccountChanged(payload: AccountChangedPayload) {
        const parsed = parseAccountChangedPayload(payload);
        if (!parsed) return;
        const { change, accountPublicId } = parsed;

        if (change === 'revoked') {
            removeByAccount(accountPublicId);
            invalidateAllLists();
            if (initialized.value) {
                void refetchActive(true);
            }
            return;
        }

        if (TRANSACTION_CHANGES.has(change)) {
            scheduleRefresh(accountPublicId);
        }
    }

    function ensureRealtimeBridge() {
        if (unsubscribeAccountChanged) return;
        const notifications = useNotificationsStore();
        unsubscribeAccountChanged = notifications.subscribeToAccountChanged(handleAccountChanged);
    }

    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    function teardownRealtimeBridge() {
        unsubscribeAccountChanged?.();
        unsubscribeAccountChanged = null;
        pendingAccountIds.clear();
        refreshScheduled = false;
    }

    return {
        ensureRealtimeBridge,
        onAuthenticatedSession,
        teardownRealtimeBridge,
        handleAccountChanged
    };
}

export type TransactionsRealtime = ReturnType<typeof createTransactionsRealtime>;
