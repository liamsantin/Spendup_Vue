import { onMounted, ref, shallowRef, watch, type Ref } from 'vue';
import { recurringExpensesApi, recurringIncomesApi } from '@/features/recurring-payments/api';
import type { RecurringExpense, RecurringIncome } from '@/features/recurring-payments/types';
import { DASHBOARD_UPCOMING_DAYS, monthToDateRanges, ymd, type DateRange } from '@/features/dashboard/format';
import { insightsApi, type MonthInsights } from '@/features/dashboard/insights';

const RECURRING_PAGE_SIZE = 200;

/** Résumé d’une période du mois, calculé par l’API (`GET /api/insights/month`, sans pagination). */
function loadPeriod(range: DateRange, currency: string): Promise<MonthInsights> {
    return insightsApi.month(range.from.slice(0, 7), currency, range.to);
}

/**
 * Chiffres du mois pour le tableau de bord : résumé du mois en cours jusqu’à aujourd’hui et de la même période
 * du mois précédent (calculés côté serveur, sans troncature), et modèles récurrents actifs dont l’échéance
 * tombe dans les 30 prochains jours. Rechargé quand la devise du résumé change.
 * @param currency Devise des chiffres (celle du compte principal).
 */
export function useDashboardMonth(currency: Readonly<Ref<string>>) {
    const ranges = monthToDateRanges();
    const today = new Date();
    const upcomingRange: DateRange = {
        from: ymd(today),
        to: ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + DASHBOARD_UPCOMING_DAYS))
    };

    const loading = ref(true);
    const failed = ref(false);
    const current = shallowRef<MonthInsights | null>(null);
    const previous = shallowRef<MonthInsights | null>(null);
    const expenses = shallowRef<RecurringExpense[]>([]);
    const incomes = shallowRef<RecurringIncome[]>([]);
    let seq = 0;

    async function load() {
        const ticket = ++seq;
        loading.value = true;
        failed.value = false;
        const recurringQuery = { isActive: true, from: upcomingRange.from, to: upcomingRange.to, pageSize: RECURRING_PAGE_SIZE };
        const [cur, prev, exp, inc] = await Promise.allSettled([
            loadPeriod(ranges.current, currency.value),
            loadPeriod(ranges.previous, currency.value),
            recurringExpensesApi.list(recurringQuery),
            recurringIncomesApi.list(recurringQuery)
        ]);
        if (ticket !== seq) return;
        current.value = cur.status === 'fulfilled' ? cur.value : null;
        previous.value = prev.status === 'fulfilled' ? prev.value : null;
        expenses.value = exp.status === 'fulfilled' && Array.isArray(exp.value?.items) ? exp.value.items : [];
        incomes.value = inc.status === 'fulfilled' && Array.isArray(inc.value?.items) ? inc.value.items : [];
        // un seul chargement en échec suffit : sans cela, « Revenus 0.00 » s'affichait comme un vrai chiffre
        failed.value = [cur, prev, exp, inc].some((result) => result.status === 'rejected');
        loading.value = false;
    }

    onMounted(() => {
        void load();
    });
    watch(currency, () => void load());

    return { ranges, upcomingRange, loading, failed, current, previous, expenses, incomes, reload: load };
}
