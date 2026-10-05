import { onMounted, ref, shallowRef } from 'vue';
import { recurringExpensesApi, recurringIncomesApi } from '@/features/recurring-payments/api';
import type { RecurringExpense, RecurringIncome } from '@/features/recurring-payments/types';
import { transactionsApi } from '@/features/transactions/api';
import { TRANSACTION_PAGE_SIZE_MAX, type Transaction } from '@/features/transactions/types';
import { DASHBOARD_UPCOMING_DAYS, monthToDateRanges, ymd, type DateRange } from '@/features/dashboard/format';

/** Garde-fou : 10 pages de 200 transactions par période. */
const MAX_PAGES = 10;
const RECURRING_PAGE_SIZE = 200;

async function loadAllTransactions(range: DateRange): Promise<Transaction[]> {
    const items: Transaction[] = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
        const result = await transactionsApi.list({ from: range.from, to: range.to, page, pageSize: TRANSACTION_PAGE_SIZE_MAX });
        const batch = Array.isArray(result?.items) ? result.items : [];
        items.push(...batch);
        if (!batch.length || items.length >= (result?.totalCount ?? 0)) break;
    }
    return items;
}

/**
 * Chiffres du mois pour le tableau de bord : transactions du mois en cours et de la même période
 * du mois précédent, et modèles récurrents actifs dont l’échéance tombe dans les 30 prochains jours.
 * Appels directs à l’API : la liste active des stores (page Transactions, Récurrences) n’est pas touchée.
 */
export function useDashboardMonth() {
    const ranges = monthToDateRanges();
    const today = new Date();
    const upcomingRange: DateRange = {
        from: ymd(today),
        to: ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + DASHBOARD_UPCOMING_DAYS))
    };

    const loading = ref(true);
    const failed = ref(false);
    const current = shallowRef<Transaction[]>([]);
    const previous = shallowRef<Transaction[]>([]);
    const expenses = shallowRef<RecurringExpense[]>([]);
    const incomes = shallowRef<RecurringIncome[]>([]);

    async function load() {
        loading.value = true;
        failed.value = false;
        const recurringQuery = { isActive: true, from: upcomingRange.from, to: upcomingRange.to, pageSize: RECURRING_PAGE_SIZE };
        const [cur, prev, exp, inc] = await Promise.allSettled([
            loadAllTransactions(ranges.current),
            loadAllTransactions(ranges.previous),
            recurringExpensesApi.list(recurringQuery),
            recurringIncomesApi.list(recurringQuery)
        ]);
        current.value = cur.status === 'fulfilled' ? cur.value : [];
        previous.value = prev.status === 'fulfilled' ? prev.value : [];
        expenses.value = exp.status === 'fulfilled' && Array.isArray(exp.value?.items) ? exp.value.items : [];
        incomes.value = inc.status === 'fulfilled' && Array.isArray(inc.value?.items) ? inc.value.items : [];
        failed.value = cur.status === 'rejected';
        loading.value = false;
    }

    onMounted(() => {
        void load();
    });

    return { ranges, upcomingRange, loading, failed, current, previous, expenses, incomes, reload: load };
}
