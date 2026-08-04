import type { Component } from 'vue';
import { LayoutDashboardIcon, BellIcon, UserCircleIcon, UsersIcon } from 'vue-tabler-icons';

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
        title: 'nav.items.preferences',
        icon: UserCircleIcon,
        to: '/app/comptes'
    }
];

export default horizontalItems;
