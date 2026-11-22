import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useNotificationsStore } from '@/features/notifications';
import { BUDGETS_PATHS } from '@/features/budgets/paths';
import { IMPORTS_PATHS } from '@/features/imports/paths';
import { SAVINGS_GOALS_PATHS } from '@/features/savings-goals/paths';
import { NET_WORTH_PATHS } from '@/features/net-worth/paths';
import { ASSETS_PATHS } from '@/features/assets/paths';
import { REAL_ESTATE_PATHS } from '@/features/real-estate/paths';
import { INVESTMENTS_PATHS } from '@/features/investments/paths';
import { DEBTS_PATHS } from '@/features/liabilities/paths';
import { TAX_BASE, TAX_PROVISION_PATH } from '@/features/tax/paths';
import { RECURRENCES_PATHS } from '@/features/recurring-payments/paths';
import { FORECASTS_PATH } from '@/features/forecasts/forecasts';
import { LAMAL_COMPARISON_PATH } from '@/features/insurance/lamal';
import { AIDS_PATH } from '@/features/aids/types';
import { RETIREMENT_PATH } from '@/features/retirement/types';
import { COMPOUND_INTEREST_PATH } from '@/features/compound-interest/types';
import { REPAYMENT_SIMULATOR_PATH } from '@/features/liabilities/repayment';
import { MONTH_PATH } from '@/features/dashboard/month-page';
import { SECURITY_PATHS, SETTINGS_PATHS } from '@/features/user-settings/settings-paths';
import {
    AccountsNavIcon,
    DashboardActiveNavIcon,
    FinancesActiveNavIcon,
    GestionActiveNavIcon,
    NetworkActiveNavIcon,
    PlanningActiveNavIcon,
    RecurrencesActiveNavIcon,
    SettingsActiveNavIcon,
    WealthActiveNavIcon,
    AssetsNavIcon,
    BudgetsNavIcon,
    CalendarNavIcon,
    CategoriesNavIcon,
    TagsNavIcon,
    ContractsNavIcon,
    DashboardNavIcon,
    DebtsNavIcon,
    FilesNavIcon,
    FinancesNavIcon,
    ForecastsNavIcon,
    FriendsNavIcon,
    GestionNavIcon,
    GoalsNavIcon,
    HouseholdNavIcon,
    ImportNavIcon,
    NetworkNavIcon,
    InvestmentsNavIcon,
    MonthNavIcon,
    NotificationsNavIcon,
    BanksNavIcon,
    PaymentMethodsNavIcon,
    PlanningNavIcon,
    PreferencesNavIcon,
    PrivacyNavIcon,
    ProfileNavIcon,
    RealEstateNavIcon,
    RecurrencesExpensesNavIcon,
    RecurrencesIncomesNavIcon,
    RecurrencesNavIcon,
    RecurrencesOverviewNavIcon,
    RecurrencesUpcomingNavIcon,
    SecurityNavIcon,
    SettingsNavIcon,
    SubscriptionNavIcon,
    TaxNavIcon,
    TaxProvisionNavIcon,
    ToolsActiveNavIcon,
    ToolsNavIcon,
    LamalNavIcon,
    RepaymentNavIcon,
    CompoundInterestNavIcon,
    AidsNavIcon,
    RetirementNavIcon,
    TiersNavIcon,
    TransactionsNavIcon,
    TransparencyNavIcon,
    WealthNavIcon,
    WealthOverviewNavIcon
} from '../solarNavIcons';
import type { NavIcon, NavItem, NavLeaf } from '../types/navigation';
import { applyNavOrder, useNavOrder } from '../navOrder';

export const SHELL_NAV_IDS = {
    dashboard: 'dashboard',
    calendar: 'calendar',
    finances: 'finances',
    accounts: 'accounts',
    paymentMethods: 'payment-methods',
    banks: 'banks',
    transactions: 'transactions',
    month: 'month',
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
    tags: 'tags',
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
    forecasts: 'forecasts',
    tax: 'tax',
    taxProvision: 'tax-provision',
    lamal: 'lamal',
    repayment: 'repayment',
    compoundInterest: 'compoundInterest',
    aids: 'aids',
    retirement: 'retirement',
    tools: 'tools',
    network: 'network',
    friends: 'friends',
    household: 'household',
    settings: 'settings',
    profile: 'profile',
    preferences: 'preferences',
    notificationSettings: 'notification-settings',
    privacy: 'privacy',
    security: 'security',
    transparency: 'transparency',
    subscription: 'subscription'
} as const;

function pathIs(path: string, prefix: string): boolean {
    return path === prefix || path.startsWith(`${prefix}/`);
}

export function idsFromPath(path: string): { openId: string | null; activeId: string | null } {
    if (path === '/demo' || path.startsWith('/demo/')) {
        path = `/app${path.slice('/demo'.length)}`;
    }
    if (path === '/app' || path === '/app/') {
        return { openId: SHELL_NAV_IDS.dashboard, activeId: SHELL_NAV_IDS.dashboard };
    }
    if (pathIs(path, '/app/calendrier')) {
        return { openId: SHELL_NAV_IDS.calendar, activeId: SHELL_NAV_IDS.calendar };
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
    if (pathIs(path, MONTH_PATH)) {
        return { openId: SHELL_NAV_IDS.finances, activeId: SHELL_NAV_IDS.month };
    }
    if (pathIs(path, IMPORTS_PATHS.list)) {
        return { openId: SHELL_NAV_IDS.finances, activeId: SHELL_NAV_IDS.import };
    }
    if (pathIs(path, '/app/finances/banques')) {
        return { openId: SHELL_NAV_IDS.finances, activeId: SHELL_NAV_IDS.banks };
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
    if (pathIs(path, '/app/gestion/tags')) {
        return { openId: SHELL_NAV_IDS.gestion, activeId: SHELL_NAV_IDS.tags };
    }
    if (pathIs(path, '/app/gestion/categories') || pathIs(path, '/app/gestion')) {
        return { openId: SHELL_NAV_IDS.gestion, activeId: SHELL_NAV_IDS.categories };
    }
    if (pathIs(path, SAVINGS_GOALS_PATHS.list)) {
        return { openId: SHELL_NAV_IDS.planning, activeId: SHELL_NAV_IDS.goals };
    }
    if (pathIs(path, FORECASTS_PATH)) {
        return { openId: SHELL_NAV_IDS.planning, activeId: SHELL_NAV_IDS.forecasts };
    }
    if (pathIs(path, LAMAL_COMPARISON_PATH)) {
        return { openId: SHELL_NAV_IDS.tools, activeId: SHELL_NAV_IDS.lamal };
    }
    if (pathIs(path, REPAYMENT_SIMULATOR_PATH)) {
        return { openId: SHELL_NAV_IDS.tools, activeId: SHELL_NAV_IDS.repayment };
    }
    if (pathIs(path, AIDS_PATH)) {
        return { openId: SHELL_NAV_IDS.tools, activeId: SHELL_NAV_IDS.aids };
    }
    if (pathIs(path, RETIREMENT_PATH)) {
        return { openId: SHELL_NAV_IDS.tools, activeId: SHELL_NAV_IDS.retirement };
    }
    if (pathIs(path, COMPOUND_INTEREST_PATH)) {
        return { openId: SHELL_NAV_IDS.tools, activeId: SHELL_NAV_IDS.compoundInterest };
    }
    if (pathIs(path, TAX_PROVISION_PATH)) {
        return { openId: SHELL_NAV_IDS.tools, activeId: SHELL_NAV_IDS.taxProvision };
    }
    if (pathIs(path, TAX_BASE)) {
        return { openId: SHELL_NAV_IDS.planning, activeId: SHELL_NAV_IDS.tax };
    }
    if (pathIs(path, BUDGETS_PATHS.list) || pathIs(path, '/app/planning')) {
        return { openId: SHELL_NAV_IDS.planning, activeId: SHELL_NAV_IDS.budgets };
    }
    if (pathIs(path, ASSETS_PATHS.list)) {
        return { openId: SHELL_NAV_IDS.wealth, activeId: SHELL_NAV_IDS.assets };
    }
    if (pathIs(path, REAL_ESTATE_PATHS.list)) {
        return { openId: SHELL_NAV_IDS.wealth, activeId: SHELL_NAV_IDS.realEstate };
    }
    if (pathIs(path, INVESTMENTS_PATHS.list)) {
        return { openId: SHELL_NAV_IDS.wealth, activeId: SHELL_NAV_IDS.investments };
    }
    if (pathIs(path, DEBTS_PATHS.liabilities)) {
        return { openId: SHELL_NAV_IDS.wealth, activeId: SHELL_NAV_IDS.debts };
    }
    if (pathIs(path, NET_WORTH_PATHS.overview)) {
        return { openId: SHELL_NAV_IDS.wealth, activeId: SHELL_NAV_IDS.wealthOverview };
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
    if (pathIs(path, SECURITY_PATHS.transparency)) {
        return { openId: SHELL_NAV_IDS.settings, activeId: SHELL_NAV_IDS.transparency };
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

    function live(id: string, label: string, icon: NavIcon, to: string, group?: string): NavLeaf {
        return { id, label, icon, to, group };
    }

    function upcoming(id: string, label: string, icon: NavIcon, group?: string): NavLeaf {
        return { id, label, icon, disabled: true, caption: soon.value, group };
    }

    function section(id: string, label: string, icon: NavIcon, children: NavLeaf[], muted = false, activeIcon?: NavIcon): NavItem {
        return {
            id,
            label,
            icon,
            activeIcon,
            children,
            muted: muted || undefined,
            detail: [{ id: `${id}-pages`, title: label, items: children }]
        };
    }

    /* Du plus quotidien (mois, transactions) à la configuration (comptes, banques) puis l'outil d'import. */
    const financeLeaves = computed<NavLeaf[]>(() => [
        live(SHELL_NAV_IDS.month, t('nav.items.month'), MonthNavIcon, MONTH_PATH),
        live(SHELL_NAV_IDS.transactions, t('nav.items.transactions'), TransactionsNavIcon, '/app/finances/transactions'),
        live(SHELL_NAV_IDS.accounts, t('nav.items.accounts'), AccountsNavIcon, '/app/finances/comptes'),
        live(SHELL_NAV_IDS.paymentMethods, t('nav.items.paymentMethods'), PaymentMethodsNavIcon, '/app/finances/moyens-de-paiement'),
        live(SHELL_NAV_IDS.banks, t('nav.items.banks'), BanksNavIcon, '/app/finances/banques'),
        live(SHELL_NAV_IDS.import, t('nav.items.import'), ImportNavIcon, IMPORTS_PATHS.list)
    ]);

    const recurrencesLeaves = computed<NavLeaf[]>(() => [
        live(SHELL_NAV_IDS.recurrencesOverview, t('nav.items.recurrencesOverview'), RecurrencesOverviewNavIcon, RECURRENCES_PATHS.overview),
        live(SHELL_NAV_IDS.recurrencesExpenses, t('nav.items.recurrencesExpenses'), RecurrencesExpensesNavIcon, RECURRENCES_PATHS.charges),
        live(SHELL_NAV_IDS.recurrencesIncomes, t('nav.items.recurrencesIncomes'), RecurrencesIncomesNavIcon, RECURRENCES_PATHS.revenus),
        live(SHELL_NAV_IDS.recurrencesUpcoming, t('nav.items.recurrencesUpcoming'), RecurrencesUpcomingNavIcon, RECURRENCES_PATHS.echeances)
    ]);

    const gestionLeaves = computed<NavLeaf[]>(() => [
        live(SHELL_NAV_IDS.categories, t('nav.items.categories'), CategoriesNavIcon, '/app/gestion/categories'),
        live(SHELL_NAV_IDS.tiers, t('nav.items.tiers'), TiersNavIcon, '/app/gestion/tiers'),
        live(SHELL_NAV_IDS.tags, t('nav.items.tags'), TagsNavIcon, '/app/gestion/tags'),
        live(SHELL_NAV_IDS.files, t('nav.items.files'), FilesNavIcon, '/app/gestion/files'),
        upcoming(SHELL_NAV_IDS.contracts, t('nav.items.contracts'), ContractsNavIcon)
    ]);

    const planningLeaves = computed<NavLeaf[]>(() => [
        live(SHELL_NAV_IDS.budgets, t('nav.items.budgets'), BudgetsNavIcon, BUDGETS_PATHS.list),
        live(SHELL_NAV_IDS.goals, t('nav.items.goals'), GoalsNavIcon, SAVINGS_GOALS_PATHS.list),
        live(SHELL_NAV_IDS.forecasts, t('nav.items.forecasts'), ForecastsNavIcon, FORECASTS_PATH),
        live(SHELL_NAV_IDS.tax, t('nav.items.tax'), TaxNavIcon, TAX_BASE)
    ]);

    /* Calculateurs ponctuels : on les ouvre quand on en a besoin, hors du suivi quotidien. */
    const toolsLeaves = computed<NavLeaf[]>(() => [
        live(SHELL_NAV_IDS.taxProvision, t('nav.items.taxProvision'), TaxProvisionNavIcon, TAX_PROVISION_PATH),
        live(SHELL_NAV_IDS.lamal, t('nav.items.lamal'), LamalNavIcon, LAMAL_COMPARISON_PATH),
        live(SHELL_NAV_IDS.repayment, t('nav.items.repayment'), RepaymentNavIcon, REPAYMENT_SIMULATOR_PATH),
        live(SHELL_NAV_IDS.compoundInterest, t('nav.items.compoundInterest'), CompoundInterestNavIcon, COMPOUND_INTEREST_PATH),
        live(SHELL_NAV_IDS.aids, t('nav.items.aids'), AidsNavIcon, AIDS_PATH),
        live(SHELL_NAV_IDS.retirement, t('nav.items.retirement'), RetirementNavIcon, RETIREMENT_PATH)
    ]);

    const wealthLeaves = computed<NavLeaf[]>(() => [
        live(SHELL_NAV_IDS.wealthOverview, t('nav.items.wealthOverview'), WealthOverviewNavIcon, NET_WORTH_PATHS.overview),
        live(SHELL_NAV_IDS.assets, t('nav.items.assets'), AssetsNavIcon, ASSETS_PATHS.list),
        live(SHELL_NAV_IDS.investments, t('nav.items.investments'), InvestmentsNavIcon, INVESTMENTS_PATHS.list),
        live(SHELL_NAV_IDS.realEstate, t('nav.items.realEstate'), RealEstateNavIcon, REAL_ESTATE_PATHS.list),
        live(SHELL_NAV_IDS.debts, t('nav.items.debts'), DebtsNavIcon, DEBTS_PATHS.liabilities)
    ]);

    const networkLeaves = computed<NavLeaf[]>(() => [
        live(SHELL_NAV_IDS.friends, t('nav.items.friends'), FriendsNavIcon, '/app/friends'),
        upcoming(SHELL_NAV_IDS.household, t('nav.items.household'), HouseholdNavIcon)
    ]);

    const settingsLeaves = computed<NavLeaf[]>(() => [
        live(SHELL_NAV_IDS.profile, t('nav.items.profile'), ProfileNavIcon, SETTINGS_PATHS.account),
        live(SHELL_NAV_IDS.preferences, t('nav.items.preferences'), PreferencesNavIcon, SETTINGS_PATHS.preferences),
        live(SHELL_NAV_IDS.notificationSettings, t('nav.items.notificationSettings'), NotificationsNavIcon, SETTINGS_PATHS.notifications),
        live(SHELL_NAV_IDS.privacy, t('nav.items.privacy'), PrivacyNavIcon, SETTINGS_PATHS.privacy),
        live(SHELL_NAV_IDS.security, t('nav.items.security'), SecurityNavIcon, SETTINGS_PATHS.security),
        live(SHELL_NAV_IDS.transparency, t('nav.items.transparency'), TransparencyNavIcon, SECURITY_PATHS.transparency),
        upcoming(SHELL_NAV_IDS.subscription, t('nav.items.subscription'), SubscriptionNavIcon)
    ]);

    /* Une rangée par section, comme l'ancienne colonne : un clic déplie ses pages (accordéon).
       Ordre : suivre l'argent, planifier (budgets, prévisions, impôts), mesurer, outils ponctuels, puis les données de support et le réseau. */
    const defaultPrimaryNav = computed<NavItem[]>(() => [
        { ...live(SHELL_NAV_IDS.dashboard, t('nav.items.dashboard'), DashboardNavIcon, '/app'), activeIcon: DashboardActiveNavIcon },
        section(SHELL_NAV_IDS.finances, t('nav.headers.finances'), FinancesNavIcon, financeLeaves.value, false, FinancesActiveNavIcon),
        section(
            SHELL_NAV_IDS.recurrences,
            t('nav.headers.recurrences'),
            RecurrencesNavIcon,
            recurrencesLeaves.value,
            false,
            RecurrencesActiveNavIcon
        ),
        section(SHELL_NAV_IDS.planning, t('nav.headers.planning'), PlanningNavIcon, planningLeaves.value, false, PlanningActiveNavIcon),
        section(SHELL_NAV_IDS.wealth, t('nav.headers.wealth'), WealthNavIcon, wealthLeaves.value, false, WealthActiveNavIcon),
        section(SHELL_NAV_IDS.tools, t('nav.headers.tools'), ToolsNavIcon, toolsLeaves.value, false, ToolsActiveNavIcon),
        section(SHELL_NAV_IDS.gestion, t('nav.headers.gestion'), GestionNavIcon, gestionLeaves.value, false, GestionActiveNavIcon),
        section(SHELL_NAV_IDS.network, t('nav.headers.network'), NetworkNavIcon, networkLeaves.value, false, NetworkActiveNavIcon)
    ]);

    /* L'utilisateur peut réordonner les sections ; Tableau de bord reste en tête. */
    const navOrder = useNavOrder();
    const primaryNav = computed<NavItem[]>(() => applyNavOrder(defaultPrimaryNav.value, navOrder.savedOrder.value));

    const headerLinks = computed<NavLeaf[]>(() => [
        live(SHELL_NAV_IDS.calendar, t('nav.items.calendar'), CalendarNavIcon, '/app/calendrier'),
        live(SHELL_NAV_IDS.files, t('nav.items.files'), FilesNavIcon, '/app/gestion/files'),
        live(SHELL_NAV_IDS.friends, t('nav.items.friends'), FriendsNavIcon, '/app/friends')
    ]);

    /* Paramètres vit en bas de la sidebar, sous le filet 2 px (header : raccourcis seuls). */
    const headerMenus = computed<NavItem[]>(() => []);

    const secondaryNav = computed<NavItem[]>(() => [
        section(SHELL_NAV_IDS.settings, t('nav.headers.settings'), SettingsNavIcon, settingsLeaves.value, false, SettingsActiveNavIcon)
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
        setNavOrder: navOrder.save,
        resetNavOrder: navOrder.reset,
        secondaryNav,
        headerLinks,
        headerMenus,
        unreadCount,
        title: computed(() => t('nav.menu'))
    };
}
