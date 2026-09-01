import type { Component } from 'vue';
import { LayoutDashboardIcon, BellIcon, BuildingBankIcon, CreditCardIcon, UserCircleIcon, UsersIcon } from 'vue-tabler-icons';

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

/** Menu sidebar zone authentifiée (/app). Les title/header sont des clés i18n. */
const sidebarItem: menu[] = [
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
    },
    {
        title: 'nav.items.friends',
        icon: UsersIcon,
        to: '/app/friends'
    },
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
    },
    { header: 'nav.headers.settings' },
    {
        title: 'nav.items.preferences',
        icon: UserCircleIcon,
        to: '/app/comptes'
    }
];

export default sidebarItem;
