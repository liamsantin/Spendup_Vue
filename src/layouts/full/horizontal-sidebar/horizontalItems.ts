import type { Component } from 'vue';
import { LayoutDashboardIcon } from 'vue-tabler-icons';

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

const horizontalItems: menu[] = [
    {
        title: 'Tableau de bord',
        icon: LayoutDashboardIcon,
        to: '/app'
    }
];

export default horizontalItems;
