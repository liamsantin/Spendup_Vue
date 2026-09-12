import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth';
import { formatAccountBalance } from '@/features/accounts/format';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { useBudgetsStore } from '@/features/budgets/stores/budgets-store';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';
import {
    DASHBOARD_MASKED_AMOUNT,
    DASHBOARD_RECENT_LIMIT,
    greetingPeriod,
    pickPrimaryCurrency,
    sumVisibleBalances
} from '@/features/dashboard/format';
import { useFilesStore } from '@/features/files/stores/files-store';
import { useFriendsStore } from '@/features/friends/stores/friends-store';
import { useNotificationsStore } from '@/features/notifications/stores/notifications-store';
import { usePaymentMethodsStore } from '@/features/payment-methods/stores/payment-methods-store';
import { useTiersStore } from '@/features/tiers/stores/tiers-store';
import { useTransactionsStore } from '@/features/transactions/stores/transactions-store';
import { useUserSettingsStore } from '@/features/user-settings/stores/user-settings-store';

export function useDashboardOverview() {
    const { t, locale } = useI18n();
    const auth = useAuthStore();
    const settings = useUserSettingsStore();
    const accounts = useAccountsStore();
    const transactions = useTransactionsStore();
    const files = useFilesStore();
    const friends = useFriendsStore();
    const notifications = useNotificationsStore();
    const categories = useCategoriesStore();
    const budgets = useBudgetsStore();
    const tiers = useTiersStore();
    const paymentMethods = usePaymentMethodsStore();

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

    async function load() {
        await Promise.allSettled([
            accounts.bootstrap('Accounts'),
            transactions.bootstrap(),
            files.loadUsage(),
            friends.bootstrap('Friends'),
            friends.loadIncoming(),
            categories.bootstrap(),
            budgets.bootstrap({ isActive: true }),
            tiers.bootstrap(),
            paymentMethods.bootstrap(),
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
        primaryTotal,
        otherTotals,
        accountCount: computed(() => accounts.activeOwnedAccounts.length),
        sharedCount: computed(() => accounts.sharedAccounts.length),
        transactionCount: computed(() => transactions.totalCount),
        recentTransactions,
        fileUsage: computed(() => files.usage),
        friendsCount: computed(() => friends.friendsCount),
        incomingFriends: computed(() => friends.incomingCount),
        unreadCount: computed(() => notifications.unreadCount),
        categoryCount: computed(() => categories.totalCount),
        budgetCount: computed(() => budgets.totalCount),
        overspentBudgetCount: computed(
            () => budgets.items.filter((item) => item.isActive && item.isCurrent && item.remainingAmount < 0).length
        ),
        defaultDashboardView: computed(() => settings.current.defaultDashboardView),
        tierCount: computed(() => tiers.totalCount),
        paymentMethodCount: computed(() => paymentMethods.totalCount)
    };
}
