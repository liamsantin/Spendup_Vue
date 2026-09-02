import type { Component } from 'vue';
import { LayoutDashboardIcon, BellIcon, BuildingBankIcon, CreditCardIcon, UserCircleIcon, UsersIcon } from 'vue-tabler-icons';
import DashboardRailIcon from './rail-icons/DashboardRailIcon.vue';
import FriendsRailIcon from './rail-icons/FriendsRailIcon.vue';
import SettingsRailIcon from './rail-icons/SettingsRailIcon.vue';
import FinancesRailIcon from './rail-icons/FinancesRailIcon.vue';

export const THEME_RAIL_WIDTH = 80;
export const CONTENT_SIDEBAR_WIDTH = 250;

export type SidebarThemeId = 'spendup' | 'friends' | 'finances' | 'settings';

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
        id: 'spendup',
        title: 'nav.headers.spendup',
        icon: DashboardRailIcon,
        match: (path) => path === '/app' || path.startsWith('/app/notifications'),
        items: [
            { header: 'nav.headers.spendup' },
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
        match: (path) => path.startsWith('/app/comptes'),
        items: [
            { header: 'nav.headers.settings' },
            {
                title: 'nav.items.preferences',
                icon: UserCircleIcon,
                to: '/app/comptes'
            }
        ]
    }
];

export function themeIdFromPath(path: string): SidebarThemeId {
    return sidebarThemes.find((theme) => theme.match(path))?.id ?? 'spendup';
}

export default sidebarThemes;
