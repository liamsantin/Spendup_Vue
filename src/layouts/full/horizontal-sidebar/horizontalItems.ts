import type { Component } from 'vue';
import { LayoutDashboardIcon, UserCircleIcon, AppsIcon } from 'vue-tabler-icons';

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
}

/** Menu horizontal /app — title = clés i18n. */
const horizontalItems: menu[] = [
    {
        title: 'nav.items.dashboard',
        icon: LayoutDashboardIcon,
        to: '/app'
    },
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

export default horizontalItems;
