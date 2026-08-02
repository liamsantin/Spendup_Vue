import type { Component } from 'vue';
import { LayoutDashboardIcon, AdjustmentsHorizontalIcon } from 'vue-tabler-icons';

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
        title: 'nav.items.preferences',
        icon: AdjustmentsHorizontalIcon,
        to: '/app/comptes'
    }
];

export default horizontalItems;
