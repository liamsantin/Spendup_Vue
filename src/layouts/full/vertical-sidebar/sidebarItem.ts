import type { Component } from 'vue';
import { LayoutDashboardIcon, ArrowsExchangeIcon } from 'vue-tabler-icons';

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

/** Menu sidebar zone authentifiée (/app). */
const sidebarItem: menu[] = [
    { header: 'Spend.Up' },
    {
        title: 'Tableau de bord',
        icon: LayoutDashboardIcon,
        to: '/app'
    },
    { header: 'Finances' },
    {
        title: 'Transactions',
        icon: ArrowsExchangeIcon,
        to: '/app',
        disabled: true,
        subCaption: 'Bientôt'
    }
];

export default sidebarItem;
