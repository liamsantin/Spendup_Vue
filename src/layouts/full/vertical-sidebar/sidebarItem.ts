import type { Component } from 'vue';
import { SETTINGS_PATHS } from '@/features/user-settings/settings-paths';
import {
    AccountsNavIcon,
    CategoriesNavIcon,
    DashboardNavIcon,
    FilesNavIcon,
    FinancesNavIcon,
    FriendsNavIcon,
    GestionNavIcon,
    NetworkNavIcon,
    NotificationsNavIcon,
    PaymentMethodsNavIcon,
    PreferencesNavIcon,
    PrivacyNavIcon,
    ProfileNavIcon,
    SecurityNavIcon,
    SettingsNavIcon,
    SubscriptionNavIcon,
    TiersNavIcon
} from '@/layouts/shell/solarNavIcons';

export const THEME_RAIL_WIDTH = 80;
export const CONTENT_SIDEBAR_WIDTH = 250;

export type SidebarThemeId = 'general' | 'friends' | 'finances' | 'gestion' | 'settings';

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
        icon: DashboardNavIcon,
        match: (path) => path === '/app' || path === '/app/notifications' || path.startsWith('/app/notifications/'),
        items: [
            { header: 'nav.headers.general' },
            {
                title: 'nav.items.dashboard',
                icon: DashboardNavIcon,
                to: '/app',
                exact: true
            },
            {
                title: 'nav.items.notifications',
                icon: NotificationsNavIcon,
                to: '/app/notifications',
                chipColor: 'surface',
                chipBgColor: 'primary'
            }
        ]
    },
    {
        id: 'friends',
        title: 'nav.headers.friends',
        icon: NetworkNavIcon,
        dividerBefore: true,
        match: (path) => path.startsWith('/app/friends'),
        items: [
            { header: 'nav.headers.friends' },
            {
                title: 'nav.items.friends',
                icon: FriendsNavIcon,
                to: '/app/friends'
            }
        ]
    },
    {
        id: 'finances',
        title: 'nav.headers.finances',
        icon: FinancesNavIcon,
        match: (path) => path.startsWith('/app/finances'),
        items: [
            { header: 'nav.headers.finances' },
            {
                title: 'nav.items.accounts',
                icon: AccountsNavIcon,
                to: '/app/finances/comptes'
            },
            {
                title: 'nav.items.paymentMethods',
                icon: PaymentMethodsNavIcon,
                to: '/app/finances/moyens-de-paiement'
            }
        ]
    },
    {
        id: 'gestion',
        title: 'nav.headers.gestion',
        icon: GestionNavIcon,
        match: (path) => path.startsWith('/app/gestion'),
        items: [
            { header: 'nav.headers.gestion' },
            {
                title: 'nav.items.files',
                icon: FilesNavIcon,
                to: '/app/gestion/files'
            },
            {
                title: 'nav.items.categories',
                icon: CategoriesNavIcon,
                to: '/app/gestion/categories'
            },
            {
                title: 'nav.items.tiers',
                icon: TiersNavIcon,
                to: '/app/gestion/tiers'
            }
        ]
    },
    {
        id: 'settings',
        title: 'nav.headers.settings',
        icon: SettingsNavIcon,
        dividerBefore: true,
        match: (path) => path.startsWith('/app/parametres') || path.startsWith('/app/comptes'),
        items: [
            { header: 'nav.headers.settings' },
            {
                title: 'nav.items.profile',
                icon: ProfileNavIcon,
                to: SETTINGS_PATHS.account
            },
            {
                title: 'nav.items.preferences',
                icon: PreferencesNavIcon,
                to: SETTINGS_PATHS.preferences
            },
            {
                title: 'nav.items.notificationSettings',
                icon: NotificationsNavIcon,
                to: SETTINGS_PATHS.notifications
            },
            {
                title: 'nav.items.privacy',
                icon: PrivacyNavIcon,
                to: SETTINGS_PATHS.privacy
            },
            {
                title: 'nav.items.security',
                icon: SecurityNavIcon,
                to: SETTINGS_PATHS.security
            },
            {
                title: 'nav.items.subscription',
                icon: SubscriptionNavIcon,
                to: SETTINGS_PATHS.subscription
            }
        ]
    }
];

export function themeIdFromPath(path: string): SidebarThemeId {
    return sidebarThemes.find((theme) => theme.match(path))?.id ?? 'general';
}

export default sidebarThemes;
