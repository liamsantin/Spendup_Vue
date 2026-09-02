import type { Component } from 'vue';
import { SETTINGS_PATHS } from '@/features/user-settings/settings-paths';
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

export interface menu {
    header?: string;
    title?: string;
    icon?: Component;
    to?: string;
    divider?: boolean;
    chip?: string;
    chipColor?: string;
    chipVariant?: string;
    chipIcon?: string;
    children?: menu[];
    disabled?: boolean;
    subCaption?: string;
    class?: string;
    extraclass?: string;
    type?: string;
    exact?: boolean;
}

/** Menu horizontal /app — title = clés i18n. */
const horizontalItems: menu[] = [
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
        chipVariant: 'flat'
    },
    {
        title: 'nav.items.friends',
        icon: UsersIcon,
        to: '/app/friends'
    },
    {
        title: 'nav.items.accounts',
        icon: BuildingBankIcon,
        to: '/app/finances/comptes'
    },
    {
        title: 'nav.items.paymentMethods',
        icon: CreditCardIcon,
        to: '/app/finances/moyens-de-paiement'
    },
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
];

export default horizontalItems;
