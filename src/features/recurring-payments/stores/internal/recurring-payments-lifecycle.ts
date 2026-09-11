import { listCacheKey, type RecurringPaymentsState } from '@/features/recurring-payments/stores/internal/recurring-payments-state';
import type { RecurringPaymentsCrud } from '@/features/recurring-payments/stores/internal/recurring-payments-crud';
import type { RecurringPaymentsRealtime } from '@/features/recurring-payments/stores/internal/recurring-payments-realtime';
import { RECURRING_PAGE_SIZE_DEFAULT } from '@/features/recurring-payments/types';

type LifecycleDeps = Pick<RecurringPaymentsCrud, 'loadExpenses' | 'loadIncomes' | 'cancelPendingLoads'> &
    Pick<RecurringPaymentsRealtime, 'ensureRealtimeBridge' | 'teardownRealtimeBridge'>;

export function createRecurringPaymentsLifecycle(state: RecurringPaymentsState, deps: LifecycleDeps) {
    const { cancelPendingLoads, loadExpenses, loadIncomes, ensureRealtimeBridge, teardownRealtimeBridge } = deps;

    async function bootstrap(kind?: 'expense' | 'income' | 'both', accountPublicId?: string | null) {
        ensureRealtimeBridge();
        const account = accountPublicId ?? undefined;
        if (kind === 'income') {
            await loadIncomes({ accountPublicId: account });
            return;
        }
        if (kind === 'expense') {
            await loadExpenses({ accountPublicId: account });
            return;
        }
        await Promise.all([loadExpenses({ accountPublicId: account }), loadIncomes({ accountPublicId: account })]);
    }

    function reset() {
        cancelPendingLoads();
        state.cache.reset();
        state.expensesByKey.clear();
        state.incomesByKey.clear();
        state.details.clear();
        state.duesByTemplate.clear();
        state.detailsEpoch.value += 1;
        state.duesEpoch.value += 1;
        state.activateExpenseList(listCacheKey('expense'));
        state.activateIncomeList(listCacheKey('income'));
        state.expenses.value = [];
        state.incomes.value = [];
        state.loadingExpenses.value = false;
        state.loadingIncomes.value = false;
        state.loadingMoreExpenses.value = false;
        state.loadingMoreIncomes.value = false;
        state.resetActing();
        state.initializedExpenses.value = false;
        state.initializedIncomes.value = false;
        state.error.value = null;
        state.expensePage.value = 1;
        state.expensePageSize.value = RECURRING_PAGE_SIZE_DEFAULT;
        state.expenseTotalCount.value = 0;
        state.incomePage.value = 1;
        state.incomePageSize.value = RECURRING_PAGE_SIZE_DEFAULT;
        state.incomeTotalCount.value = 0;
        teardownRealtimeBridge();
    }

    return { bootstrap, reset };
}

export type RecurringPaymentsLifecycle = ReturnType<typeof createRecurringPaymentsLifecycle>;
