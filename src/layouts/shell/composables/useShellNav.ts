import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { AdjustmentsHorizontalIcon, BellIcon, BuildingBankIcon, CreditCardIcon, LockIcon, UserCircleIcon } from 'vue-tabler-icons';
import { useNotificationsStore } from '@/features/notifications';
import { SETTINGS_PATHS } from '@/features/user-settings/settings-paths';
import DashboardRailIcon from '@/layouts/full/vertical-sidebar/rail-icons/DashboardRailIcon.vue';
import FinancesRailIcon from '@/layouts/full/vertical-sidebar/rail-icons/FinancesRailIcon.vue';
import FriendsRailIcon from '@/layouts/full/vertical-sidebar/rail-icons/FriendsRailIcon.vue';
import SettingsRailIcon from '@/layouts/full/vertical-sidebar/rail-icons/SettingsRailIcon.vue';
import type { NavItem, NavLeaf } from '../types/navigation';

export const SHELL_NAV_IDS = {
    dashboard: 'dashboard',
    notifications: 'notifications',
    friends: 'friends',
    finances: 'finances',
    accounts: 'accounts',
    paymentMethods: 'payment-methods',
    settings: 'settings',
    profile: 'profile',
    preferences: 'preferences',
    notificationSettings: 'notification-settings',
    security: 'security'
} as const;

export function idsFromPath(path: string): { openId: string | null; activeId: string | null } {
    if (path === '/app' || path === '/app/') {
        return { openId: SHELL_NAV_IDS.dashboard, activeId: SHELL_NAV_IDS.dashboard };
    }
    if (path === '/app/notifications' || path.startsWith('/app/notifications/')) {
        return { openId: SHELL_NAV_IDS.notifications, activeId: SHELL_NAV_IDS.notifications };
    }
    if (path === '/app/friends' || path.startsWith('/app/friends/')) {
        return { openId: SHELL_NAV_IDS.friends, activeId: SHELL_NAV_IDS.friends };
    }
    if (path.startsWith('/app/finances/moyens-de-paiement')) {
        return { openId: SHELL_NAV_IDS.finances, activeId: SHELL_NAV_IDS.paymentMethods };
    }
    if (path.startsWith('/app/finances/comptes') || path.startsWith('/app/finances')) {
        return { openId: SHELL_NAV_IDS.finances, activeId: SHELL_NAV_IDS.accounts };
    }
    if (path.startsWith(SETTINGS_PATHS.preferences)) {
        return { openId: SHELL_NAV_IDS.settings, activeId: SHELL_NAV_IDS.preferences };
    }
    if (path.startsWith(SETTINGS_PATHS.notifications)) {
        return { openId: SHELL_NAV_IDS.settings, activeId: SHELL_NAV_IDS.notificationSettings };
    }
    if (path.startsWith(SETTINGS_PATHS.security)) {
        return { openId: SHELL_NAV_IDS.settings, activeId: SHELL_NAV_IDS.security };
    }
    if (path.startsWith(SETTINGS_PATHS.account) || path.startsWith('/app/parametres') || path.startsWith('/app/comptes')) {
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

    const financeLeaves = computed<NavLeaf[]>(() => [
        {
            id: SHELL_NAV_IDS.accounts,
            label: t('nav.items.accounts'),
            icon: BuildingBankIcon,
            to: '/app/finances/comptes'
        },
        {
            id: SHELL_NAV_IDS.paymentMethods,
            label: t('nav.items.paymentMethods'),
            icon: CreditCardIcon,
            to: '/app/finances/moyens-de-paiement'
        }
    ]);

    const settingsLeaves = computed<NavLeaf[]>(() => [
        {
            id: SHELL_NAV_IDS.profile,
            label: t('nav.items.profile'),
            icon: UserCircleIcon,
            to: SETTINGS_PATHS.account
        },
        {
            id: SHELL_NAV_IDS.preferences,
            label: t('nav.items.preferences'),
            icon: AdjustmentsHorizontalIcon,
            to: SETTINGS_PATHS.preferences
        },
        {
            id: SHELL_NAV_IDS.notificationSettings,
            label: t('nav.items.notificationSettings'),
            icon: BellIcon,
            to: SETTINGS_PATHS.notifications
        },
        {
            id: SHELL_NAV_IDS.security,
            label: t('nav.items.security'),
            icon: LockIcon,
            to: SETTINGS_PATHS.security
        }
    ]);

    const primaryNav = computed<NavItem[]>(() => [
        {
            id: SHELL_NAV_IDS.dashboard,
            label: t('nav.items.dashboard'),
            icon: DashboardRailIcon,
            to: '/app'
        },
        {
            id: SHELL_NAV_IDS.notifications,
            label: t('nav.items.notifications'),
            icon: BellIcon,
            to: '/app/notifications',
            badge: unreadCount.value > 0 ? unreadCount.value : undefined,
            dot: unreadCount.value > 0
        },
        {
            id: SHELL_NAV_IDS.friends,
            label: t('nav.items.friends'),
            icon: FriendsRailIcon,
            to: '/app/friends'
        },
        {
            id: SHELL_NAV_IDS.finances,
            label: t('nav.headers.finances'),
            icon: FinancesRailIcon,
            children: financeLeaves.value,
            detail: [
                {
                    id: 'finances-pages',
                    title: t('nav.headers.finances'),
                    items: financeLeaves.value
                }
            ]
        }
    ]);

    const secondaryNav = computed<NavItem[]>(() => [
        {
            id: SHELL_NAV_IDS.settings,
            label: t('nav.headers.settings'),
            icon: SettingsRailIcon,
            children: settingsLeaves.value,
            detail: [
                {
                    id: 'settings-pages',
                    title: t('nav.headers.settings'),
                    items: settingsLeaves.value
                }
            ]
        }
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
