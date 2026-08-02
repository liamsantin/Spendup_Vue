import type { Component } from 'vue';
import { LayoutDashboardIcon, ArrowsExchangeIcon, UserCircleIcon, AppsIcon } from 'vue-tabler-icons';

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
        title: 'nav.items.accounts',
        icon: UserCircleIcon,
        to: '/app/comptes'
    },
    {
        title: 'nav.items.applications',
        icon: AppsIcon,
        to: '/app/applications'
    }
];

export default sidebarItem;
