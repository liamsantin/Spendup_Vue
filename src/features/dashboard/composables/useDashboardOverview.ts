import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth';
import { formatAccountBalance } from '@/features/accounts/format';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { useBudgetsStore } from '@/features/budgets/stores/budgets-store';
import { useSavingsGoalsStore } from '@/features/savings-goals/stores/savings-goals-store';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';
import {
    DASHBOARD_ACCOUNTS_LIMIT,
    DASHBOARD_MASKED_AMOUNT,
    DASHBOARD_RECENT_LIMIT,
    greetingPeriod,
    pickPrimaryCurrency,
    sumVisibleBalances
} from '@/features/dashboard/format';
import { useFriendsStore } from '@/features/friends/stores/friends-store';
import { useNotificationsStore } from '@/features/notifications/stores/notifications-store';
import { useTransactionsStore } from '@/features/transactions/stores/transactions-store';
import { useUserSettingsStore } from '@/features/user-settings/stores/user-settings-store';

export function useDashboardOverview() {
    const { t, locale } = useI18n();
    const auth = useAuthStore();
    const settings = useUserSettingsStore();
    const accounts = useAccountsStore();
    const transactions = useTransactionsStore();
    const friends = useFriendsStore();
    const notifications = useNotificationsStore();
    const categories = useCategoriesStore();
    const budgets = useBudgetsStore();
    const savingsGoals = useSavingsGoalsStore();

    const greetingName = computed(() => {
        const first = auth.user?.firstName?.trim();
        if (first) return first;
        return auth.displayName?.trim() || '';
    });

    const greeting = computed(() => {
        const period = greetingPeriod();
        const name = greetingName.value;
        if (!name) return t(`dashboard.hello.${period}Anonymous`);
        return t(`dashboard.hello.${period}`, { name });
    });

    const todayLabel = computed(() =>
        new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
    );

    const showBalance = computed(() => settings.current.showBalanceOnDashboard);
    const hideAmounts = computed(() => settings.current.hideSensitiveAmounts);

    const balanceTotals = computed(() => sumVisibleBalances(accounts.activeOwnedAccounts));
    const primaryCurrency = computed(() => pickPrimaryCurrency(accounts.activeOwnedAccounts, balanceTotals.value));

    const primaryTotal = computed(() => {
        const currency = primaryCurrency.value;
        if (!currency) return null;
        const row = balanceTotals.value.find((item) => item.currency === currency);
        if (!row) return null;
        return {
            currency,
            text: hideAmounts.value ? DASHBOARD_MASKED_AMOUNT : formatAccountBalance(row.amount, currency, locale.value)
        };
    });

    const otherTotals = computed(() => {
        const currency = primaryCurrency.value;
        return balanceTotals.value
            .filter((row) => row.currency !== currency)
            .map((row) => ({
                currency: row.currency,
                text: hideAmounts.value ? DASHBOARD_MASKED_AMOUNT : formatAccountBalance(row.amount, row.currency, locale.value)
            }));
    });

    const recentTransactions = computed(() => transactions.items.slice(0, DASHBOARD_RECENT_LIMIT));

    /** Comptes actifs (possédés puis partagés), le principal en tête. */
    const topAccounts = computed(() =>
        [...accounts.accounts]
            .filter((account) => account.isActive)
            .sort(
                (a, b) => Number(b.isPrimary) - Number(a.isPrimary) || Number(b.isOwned) - Number(a.isOwned) || a.name.localeCompare(b.name)
            )
            .slice(0, DASHBOARD_ACCOUNTS_LIMIT)
    );
    const activeAccountCount = computed(() => accounts.accounts.filter((account) => account.isActive).length);

    async function load() {
        await Promise.allSettled([
            accounts.bootstrap('Accounts'),
            transactions.bootstrap(),
            friends.loadIncoming(),
            categories.bootstrap(),
            budgets.bootstrap({ isActive: true }),
            savingsGoals.bootstrap({ status: 'active' }),
            notifications.fetchUnreadCount()
        ]);
    }

    onMounted(() => {
        void load();
    });

    return {
        greeting,
        todayLabel,
        showBalance,
        hideAmounts,
        primaryCurrency,
        primaryTotal,
        otherTotals,
        accountCount: computed(() => accounts.activeOwnedAccounts.length),
        topAccounts,
        activeAccountCount,
        recentTransactions,
        incomingFriends: computed(() => friends.incomingCount),
        unreadCount: computed(() => notifications.unreadCount),
        overspentBudgetCount: computed(
            () => budgets.items.filter((item) => item.isActive && item.isCurrent && item.remainingAmount < 0).length
        ),
        overdueSavingsGoalCount: computed(() => savingsGoals.items.filter((item) => item.status === 'active' && item.isOverdue).length),
        defaultDashboardView: computed(() => settings.current.defaultDashboardView),
        categoryById: (publicId: string) => categories.findByPublicId(publicId)
    };
}
