export { default as DashboardContent } from '@/features/dashboard/components/DashboardContent.vue';
export { useDashboardModules } from '@/features/dashboard/composables/useDashboardModules';
export { useDashboardOverview } from '@/features/dashboard/composables/useDashboardOverview';
export type { DashboardModule } from '@/features/dashboard/composables/useDashboardModules';
export {
    greetingPeriod,
    sumVisibleBalances,
    pickPrimaryCurrency,
    DASHBOARD_MASKED_AMOUNT,
    DASHBOARD_RECENT_LIMIT
} from '@/features/dashboard/format';
export type { CurrencyTotal, GreetingPeriod } from '@/features/dashboard/format';
