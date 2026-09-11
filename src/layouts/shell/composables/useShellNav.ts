import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import {
    AddressBookIcon,
    AdjustmentsHorizontalIcon,
    ArrowsExchangeIcon,
    BellIcon,
    BuildingBankIcon,
    BuildingIcon,
    CalendarEventIcon,
    CarIcon,
    ChartCandleIcon,
    ChartLineIcon,
    ChartPieIcon,
    CreditCardIcon,
    CrownIcon,
    DatabaseExportIcon,
    EyeOffIcon,
    FileImportIcon,
    FileTextIcon,
    FilesIcon,
    FolderIcon,
    HomeHeartIcon,
    HomeIcon,
    LockIcon,
    Receipt2Icon,
    ReceiptTaxIcon,
    RepeatIcon,
    ReportMoneyIcon,
    ScaleIcon,
    TagsIcon,
    TargetIcon,
    TrendingUpIcon,
    UserCircleIcon,
    UsersIcon,
    WalletIcon
} from 'vue-tabler-icons';
import { useNotificationsStore } from '@/features/notifications';
import { RECURRENCES_PATHS } from '@/features/recurring-payments/paths';
import { SETTINGS_PATHS } from '@/features/user-settings/settings-paths';
import DashboardRailIcon from '@/layouts/full/vertical-sidebar/rail-icons/DashboardRailIcon.vue';
import FinancesRailIcon from '@/layouts/full/vertical-sidebar/rail-icons/FinancesRailIcon.vue';
import FriendsRailIcon from '@/layouts/full/vertical-sidebar/rail-icons/FriendsRailIcon.vue';
import SettingsRailIcon from '@/layouts/full/vertical-sidebar/rail-icons/SettingsRailIcon.vue';
import type { NavIcon, NavItem, NavLeaf } from '../types/navigation';

export const SHELL_NAV_IDS = {
    dashboard: 'dashboard',
    calendar: 'calendar',
    finances: 'finances',
    accounts: 'accounts',
    paymentMethods: 'payment-methods',
    transactions: 'transactions',
    import: 'import',
    recurrences: 'recurrences',
    recurrencesOverview: 'recurrences-overview',
    recurrencesExpenses: 'recurrences-expenses',
    recurrencesIncomes: 'recurrences-incomes',
    recurrencesUpcoming: 'recurrences-upcoming',
    gestion: 'gestion',
    files: 'files',
    tiers: 'tiers',
    categories: 'categories',
    contracts: 'contracts',
    planning: 'planning',
    budgets: 'budgets',
    goals: 'goals',
    wealth: 'wealth',
    wealthOverview: 'wealth-overview',
    assets: 'assets',
    investments: 'investments',
    realEstate: 'real-estate',
    debts: 'debts',
    analytics: 'analytics',
    forecasts: 'forecasts',
    tax: 'tax',
    network: 'network',
    friends: 'friends',
    household: 'household',
    settings: 'settings',
    profile: 'profile',
    preferences: 'preferences',
    notificationSettings: 'notification-settings',
    privacy: 'privacy',
    security: 'security',
    subscription: 'subscription',
    account: 'account'
} as const;

function pathIs(path: string, prefix: string): boolean {
    return path === prefix || path.startsWith(`${prefix}/`);
}

export function idsFromPath(path: string): { openId: string | null; activeId: string | null } {
    if (path === '/app' || path === '/app/') {
        return { openId: SHELL_NAV_IDS.dashboard, activeId: SHELL_NAV_IDS.dashboard };
    }
    if (pathIs(path, RECURRENCES_PATHS.charges)) {
        return { openId: SHELL_NAV_IDS.recurrences, activeId: SHELL_NAV_IDS.recurrencesExpenses };
    }
    if (pathIs(path, RECURRENCES_PATHS.revenus)) {
        return { openId: SHELL_NAV_IDS.recurrences, activeId: SHELL_NAV_IDS.recurrencesIncomes };
    }
    if (pathIs(path, RECURRENCES_PATHS.echeances)) {
        return { openId: SHELL_NAV_IDS.recurrences, activeId: SHELL_NAV_IDS.recurrencesUpcoming };
    }
    if (pathIs(path, RECURRENCES_PATHS.overview)) {
        return { openId: SHELL_NAV_IDS.recurrences, activeId: SHELL_NAV_IDS.recurrencesOverview };
    }
    if (pathIs(path, '/app/finances/transactions')) {
        return { openId: SHELL_NAV_IDS.finances, activeId: SHELL_NAV_IDS.transactions };
    }
    if (pathIs(path, '/app/finances/moyens-de-paiement')) {
        return { openId: SHELL_NAV_IDS.finances, activeId: SHELL_NAV_IDS.paymentMethods };
    }
    if (pathIs(path, '/app/finances/comptes') || pathIs(path, '/app/finances')) {
        return { openId: SHELL_NAV_IDS.finances, activeId: SHELL_NAV_IDS.accounts };
    }
    if (pathIs(path, '/app/gestion/files')) {
        return { openId: SHELL_NAV_IDS.gestion, activeId: SHELL_NAV_IDS.files };
    }
    if (pathIs(path, '/app/gestion/tiers')) {
        return { openId: SHELL_NAV_IDS.gestion, activeId: SHELL_NAV_IDS.tiers };
    }
    if (pathIs(path, '/app/gestion/categories') || pathIs(path, '/app/gestion')) {
        return { openId: SHELL_NAV_IDS.gestion, activeId: SHELL_NAV_IDS.categories };
    }
    if (pathIs(path, '/app/friends')) {
        return { openId: SHELL_NAV_IDS.network, activeId: SHELL_NAV_IDS.friends };
    }
    if (pathIs(path, SETTINGS_PATHS.preferences)) {
        return { openId: SHELL_NAV_IDS.settings, activeId: SHELL_NAV_IDS.preferences };
    }
    if (pathIs(path, SETTINGS_PATHS.notifications)) {
        return { openId: SHELL_NAV_IDS.settings, activeId: SHELL_NAV_IDS.notificationSettings };
    }
    if (pathIs(path, SETTINGS_PATHS.privacy)) {
        return { openId: SHELL_NAV_IDS.settings, activeId: SHELL_NAV_IDS.privacy };
    }
    if (pathIs(path, SETTINGS_PATHS.security)) {
        return { openId: SHELL_NAV_IDS.settings, activeId: SHELL_NAV_IDS.security };
    }
    if (pathIs(path, SETTINGS_PATHS.subscription)) {
        return { openId: SHELL_NAV_IDS.settings, activeId: SHELL_NAV_IDS.subscription };
    }
    if (pathIs(path, SETTINGS_PATHS.account) || pathIs(path, '/app/parametres') || pathIs(path, '/app/comptes')) {
        return { openId: SHELL_NAV_IDS.settings, activeId: SHELL_NAV_IDS.profile };
    }
    return { openId: SHELL_NAV_IDS.dashboard, activeId: SHELL_NAV_IDS.dashboard };
}

export function useShellNav() {
    const { t } = useI18n();
    const route = useRoute();
    const notifications = useNotificationsStore();

    const open = ref(false);
    const openId = ref<string | null>(null);
    const activeId = ref<string | null>(null);

    const unreadCount = computed(() => notifications.unreadCount);
    const soon = computed(() => t('nav.subCaptions.soon'));

    function live(id: string, label: string, icon: NavIcon, to: string): NavLeaf {
        return { id, label, icon, to };
    }

    function upcoming(id: string, label: string, icon: NavIcon): NavLeaf {
        return { id, label, icon, disabled: true, caption: soon.value };
    }

    function section(id: string, label: string, icon: NavIcon, children: NavLeaf[]): NavItem {
        return {
            id,
            label,
            icon,
            children,
            detail: [{ id: `${id}-pages`, title: label, items: children }]
        };
    }

    const financeLeaves = computed<NavLeaf[]>(() => [
        live(SHELL_NAV_IDS.accounts, t('nav.items.accounts'), BuildingBankIcon, '/app/finances/comptes'),
        live(SHELL_NAV_IDS.paymentMethods, t('nav.items.paymentMethods'), CreditCardIcon, '/app/finances/moyens-de-paiement'),
        live(SHELL_NAV_IDS.transactions, t('nav.items.transactions'), ArrowsExchangeIcon, '/app/finances/transactions'),
        upcoming(SHELL_NAV_IDS.import, t('nav.items.import'), FileImportIcon)
    ]);

    const recurrencesLeaves = computed<NavLeaf[]>(() => [
        live(SHELL_NAV_IDS.recurrencesOverview, t('nav.items.recurrencesOverview'), RepeatIcon, RECURRENCES_PATHS.overview),
        live(SHELL_NAV_IDS.recurrencesExpenses, t('nav.items.recurrencesExpenses'), Receipt2Icon, RECURRENCES_PATHS.charges),
        live(SHELL_NAV_IDS.recurrencesIncomes, t('nav.items.recurrencesIncomes'), TrendingUpIcon, RECURRENCES_PATHS.revenus),
        live(SHELL_NAV_IDS.recurrencesUpcoming, t('nav.items.recurrencesUpcoming'), CalendarEventIcon, RECURRENCES_PATHS.echeances)
    ]);

    const gestionLeaves = computed<NavLeaf[]>(() => [
        live(SHELL_NAV_IDS.files, t('nav.items.files'), FilesIcon, '/app/gestion/files'),
        live(SHELL_NAV_IDS.tiers, t('nav.items.tiers'), AddressBookIcon, '/app/gestion/tiers'),
        live(SHELL_NAV_IDS.categories, t('nav.items.categories'), TagsIcon, '/app/gestion/categories'),
        upcoming(SHELL_NAV_IDS.contracts, t('nav.items.contracts'), FileTextIcon)
    ]);

    const planningLeaves = computed<NavLeaf[]>(() => [
        upcoming(SHELL_NAV_IDS.budgets, t('nav.items.budgets'), WalletIcon),
        upcoming(SHELL_NAV_IDS.goals, t('nav.items.goals'), TargetIcon)
    ]);

    const wealthLeaves = computed<NavLeaf[]>(() => [
        upcoming(SHELL_NAV_IDS.wealthOverview, t('nav.items.wealthOverview'), ScaleIcon),
        upcoming(SHELL_NAV_IDS.assets, t('nav.items.assets'), CarIcon),
        upcoming(SHELL_NAV_IDS.investments, t('nav.items.investments'), ChartCandleIcon),
        upcoming(SHELL_NAV_IDS.realEstate, t('nav.items.realEstate'), HomeIcon),
        upcoming(SHELL_NAV_IDS.debts, t('nav.items.debts'), ReportMoneyIcon)
    ]);

    const analyticsLeaves = computed<NavLeaf[]>(() => [
        upcoming(SHELL_NAV_IDS.forecasts, t('nav.items.forecasts'), TrendingUpIcon),
        upcoming(SHELL_NAV_IDS.tax, t('nav.items.tax'), ReceiptTaxIcon)
    ]);

    const networkLeaves = computed<NavLeaf[]>(() => [
        live(SHELL_NAV_IDS.friends, t('nav.items.friends'), UsersIcon, '/app/friends'),
        upcoming(SHELL_NAV_IDS.household, t('nav.items.household'), HomeHeartIcon)
    ]);

    const settingsLeaves = computed<NavLeaf[]>(() => [
        live(SHELL_NAV_IDS.profile, t('nav.items.profile'), UserCircleIcon, SETTINGS_PATHS.account),
        live(SHELL_NAV_IDS.preferences, t('nav.items.preferences'), AdjustmentsHorizontalIcon, SETTINGS_PATHS.preferences),
        live(SHELL_NAV_IDS.notificationSettings, t('nav.items.notificationSettings'), BellIcon, SETTINGS_PATHS.notifications),
        live(SHELL_NAV_IDS.privacy, t('nav.items.privacy'), EyeOffIcon, SETTINGS_PATHS.privacy),
        live(SHELL_NAV_IDS.security, t('nav.items.security'), LockIcon, SETTINGS_PATHS.security),
        upcoming(SHELL_NAV_IDS.subscription, t('nav.items.subscription'), CrownIcon),
        live(SHELL_NAV_IDS.account, t('nav.items.account'), DatabaseExportIcon, SETTINGS_PATHS.account)
    ]);

    const primaryNav = computed<NavItem[]>(() => [
        live(SHELL_NAV_IDS.dashboard, t('nav.items.dashboard'), DashboardRailIcon, '/app'),
        upcoming(SHELL_NAV_IDS.calendar, t('nav.items.calendar'), CalendarEventIcon),
        section(SHELL_NAV_IDS.finances, t('nav.headers.finances'), FinancesRailIcon, financeLeaves.value),
        section(SHELL_NAV_IDS.recurrences, t('nav.headers.recurrences'), RepeatIcon, recurrencesLeaves.value),
        section(SHELL_NAV_IDS.gestion, t('nav.headers.gestion'), FolderIcon, gestionLeaves.value),
        section(SHELL_NAV_IDS.planning, t('nav.headers.planning'), ChartPieIcon, planningLeaves.value),
        section(SHELL_NAV_IDS.wealth, t('nav.headers.wealth'), BuildingIcon, wealthLeaves.value),
        section(SHELL_NAV_IDS.analytics, t('nav.headers.analytics'), ChartLineIcon, analyticsLeaves.value),
        section(SHELL_NAV_IDS.network, t('nav.headers.network'), FriendsRailIcon, networkLeaves.value)
    ]);

    const secondaryNav = computed<NavItem[]>(() => [
        section(SHELL_NAV_IDS.settings, t('nav.headers.settings'), SettingsRailIcon, settingsLeaves.value)
    ]);

    watch(
        () => route.path,
        (path) => {
            const ids = idsFromPath(path);
            openId.value = ids.openId;
            activeId.value = ids.activeId;
        },
        { immediate: true }
    );

    return {
        open,
        openId,
        activeId,
        primaryNav,
        secondaryNav,
        unreadCount,
        title: computed(() => t('nav.menu'))
    };
}
