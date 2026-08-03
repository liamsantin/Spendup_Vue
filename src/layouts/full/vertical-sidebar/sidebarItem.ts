import type { Component } from 'vue';
import { LayoutDashboardIcon, ArrowsExchangeIcon, BellIcon, UserCircleIcon } from 'vue-tabler-icons';

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
}

/** Menu sidebar zone authentifiée (/app). Les title/header sont des clés i18n. */
const sidebarItem: menu[] = [
    { header: 'nav.headers.spendup' },
    {
        title: 'nav.items.dashboard',
        icon: LayoutDashboardIcon,
        to: '/app'
    },
    {
        title: 'nav.items.notifications',
        icon: BellIcon,
        to: '/app/notifications'
    },
    { header: 'nav.headers.finances' },
    {
        title: 'nav.items.transactions',
        icon: ArrowsExchangeIcon,
        to: '/app',
        disabled: true,
        subCaption: 'nav.subCaptions.soon'
    },
    { header: 'nav.headers.settings' },
    {
        title: 'nav.items.preferences',
        icon: UserCircleIcon,
        to: '/app/comptes'
    }
];

export default sidebarItem;
