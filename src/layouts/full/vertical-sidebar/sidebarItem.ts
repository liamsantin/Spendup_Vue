import type { Component } from 'vue';
import {
    AdjustmentsHorizontalIcon,
    BellIcon,
    BuildingBankIcon,
    CreditCardIcon,
    LayoutDashboardIcon,
    LockIcon,
    UserCircleIcon,
    UsersIcon
} from 'vue-tabler-icons';
import { SETTINGS_PATHS } from '@/features/user-settings/settings-paths';
import DashboardRailIcon from './rail-icons/DashboardRailIcon.vue';
import FriendsRailIcon from './rail-icons/FriendsRailIcon.vue';
import SettingsRailIcon from './rail-icons/SettingsRailIcon.vue';
import FinancesRailIcon from './rail-icons/FinancesRailIcon.vue';

export const THEME_RAIL_WIDTH = 80;
export const CONTENT_SIDEBAR_WIDTH = 250;

export type SidebarThemeId = 'general' | 'friends' | 'finances' | 'settings';

export interface menu {
    header?: string;
    title?: string;
    icon?: Component;
    to?: string;
    chip?: string;
    chipBgColor?: string;
    chipColor?: string;
    chipVariant?: string;
    chipIcon?: string;
    children?: menu[];
    disabled?: boolean;
    type?: string;
    subCaption?: string;
    /** Active router-link uniquement sur le path exact (ex. `/app`). */
    exact?: boolean;
}

export interface sidebarTheme {
    id: SidebarThemeId;
    title: string;
    icon: Component;
    items: menu[];
    match: (path: string) => boolean;
    /** Sépare ce thème des icônes précédentes dans la rail. */
    dividerBefore?: boolean;
}

const sidebarThemes: sidebarTheme[] = [
    {
        id: 'general',
        title: 'nav.headers.general',
        icon: DashboardRailIcon,
        match: (path) => path === '/app' || path === '/app/notifications' || path.startsWith('/app/notifications/'),
        items: [
            { header: 'nav.headers.general' },
            {
                title: 'nav.items.dashboard',
                icon: LayoutDashboardIcon,
                to: '/app',
                exact: true
            },
            {
                title: 'nav.items.notifications',
                icon: BellIcon,
                to: '/app/notifications',
                chipColor: 'surface',
                chipBgColor: 'primary'
            }
        ]
    },
    {
        id: 'friends',
        title: 'nav.headers.friends',
        icon: FriendsRailIcon,
        dividerBefore: true,
        match: (path) => path.startsWith('/app/friends'),
        items: [
            { header: 'nav.headers.friends' },
            {
                title: 'nav.items.friends',
                icon: UsersIcon,
                to: '/app/friends'
            }
        ]
    },
    {
        id: 'finances',
        title: 'nav.headers.finances',
        icon: FinancesRailIcon,
        match: (path) => path.startsWith('/app/finances'),
        items: [
            { header: 'nav.headers.finances' },
            {
                title: 'nav.items.accounts',
                icon: BuildingBankIcon,
                to: '/app/finances/comptes'
            },
            {
                title: 'nav.items.paymentMethods',
                icon: CreditCardIcon,
                to: '/app/finances/moyens-de-paiement'
            }
        ]
    },
    {
        id: 'settings',
        title: 'nav.headers.settings',
        icon: SettingsRailIcon,
        dividerBefore: true,
        match: (path) => path.startsWith('/app/parametres') || path.startsWith('/app/comptes'),
        items: [
            { header: 'nav.headers.settings' },
            {
                title: 'nav.items.profile',
                icon: UserCircleIcon,
                to: SETTINGS_PATHS.account
            },
            {
                title: 'nav.items.preferences',
                icon: AdjustmentsHorizontalIcon,
                to: SETTINGS_PATHS.preferences
            },
            {
                title: 'nav.items.notificationSettings',
                icon: BellIcon,
                to: SETTINGS_PATHS.notifications
            },
            {
                title: 'nav.items.security',
                icon: LockIcon,
                to: SETTINGS_PATHS.security
            }
        ]
    }
];

export function themeIdFromPath(path: string): SidebarThemeId {
    return sidebarThemes.find((theme) => theme.match(path))?.id ?? 'general';
}

export default sidebarThemes;
