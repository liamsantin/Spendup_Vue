import { useNotificationsStore } from '@/features/notifications';
import { parseBudgetChangedPayload } from '@/features/notifications/normalize';
import type { AccountChangedPayload, BudgetChangedPayload, RecurringExpenseChangedPayload } from '@/features/notifications';
import type { BudgetsCrud } from '@/features/budgets/stores/internal/budgets-crud';
import type { BudgetsState } from '@/features/budgets/stores/internal/budgets-state';

type RealtimeDeps = Pick<BudgetsCrud, 'refetchActive' | 'fetchBudget'>;

const SPENT_ACCOUNT_CHANGES = new Set(['transactionCreated', 'transactionUpdated', 'transactionDeleted']);

/**
 * `budgetChanged` (CRUD) + `accountChanged` / `recurringExpenseChanged` (consommé).
 */
export function createBudgetsRealtime(state: BudgetsState, deps: RealtimeDeps) {
    const { consumeLocalMutation, initialized, invalidateAllLists, removeItemLocal, notifyDeleted, knownById } = state;
    const { refetchActive, fetchBudget } = deps;

    let unsubscribeBudgetChanged: (() => void) | null = null;
    let unsubscribeAccountChanged: (() => void) | null = null;
    let unsubscribeRecurringExpense: (() => void) | null = null;
    let refreshScheduled = false;

    function scheduleRefetch() {
        if (refreshScheduled) return;
        refreshScheduled = true;
        queueMicrotask(() => {
            refreshScheduled = false;
            if (!initialized.value) return;
            void refetchActive(true);
        });
    }

    function handleBudgetChanged(payload: BudgetChangedPayload) {
        const parsed = parseBudgetChangedPayload(payload);
        if (!parsed) return;
        const { change, budgetPublicId } = parsed;

        if (consumeLocalMutation(budgetPublicId)) return;

        if (change === 'budgetDeleted') {
            removeItemLocal(budgetPublicId);
            invalidateAllLists();
            notifyDeleted(budgetPublicId);
            scheduleRefetch();
            return;
        }

        invalidateAllLists();
        if (change === 'budgetUpdated' && knownById.has(budgetPublicId)) {
            void fetchBudget(budgetPublicId, true).catch(() => undefined);
        }
        scheduleRefetch();
    }

    function handleAccountChanged(payload: AccountChangedPayload) {
        if (!SPENT_ACCOUNT_CHANGES.has(payload?.change)) return;
        invalidateAllLists();
        scheduleRefetch();
    }

    function handleRecurringExpenseChanged(payload: RecurringExpenseChangedPayload) {
        if (!payload?.change) return;
        invalidateAllLists();
        scheduleRefetch();
    }

    function ensureRealtimeBridge() {
        if (unsubscribeBudgetChanged && unsubscribeAccountChanged && unsubscribeRecurringExpense) return;
        const notifications = useNotificationsStore();
        unsubscribeBudgetChanged ??= notifications.subscribeToBudgetChanged(handleBudgetChanged);
        unsubscribeAccountChanged ??= notifications.subscribeToAccountChanged(handleAccountChanged);
        unsubscribeRecurringExpense ??= notifications.subscribeToRecurringExpenseChanged(handleRecurringExpenseChanged);
    }

    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    function teardownRealtimeBridge() {
        unsubscribeBudgetChanged?.();
        unsubscribeAccountChanged?.();
        unsubscribeRecurringExpense?.();
        unsubscribeBudgetChanged = null;
        unsubscribeAccountChanged = null;
        unsubscribeRecurringExpense = null;
        refreshScheduled = false;
    }

    return {
        ensureRealtimeBridge,
        onAuthenticatedSession,
        teardownRealtimeBridge,
        handleBudgetChanged
    };
}

export type BudgetsRealtime = ReturnType<typeof createBudgetsRealtime>;
