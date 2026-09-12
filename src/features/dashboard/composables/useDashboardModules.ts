import type { Component } from 'vue';
import {
    AddressBookIcon,
    ArrowsExchangeIcon,
    BellIcon,
    BuildingBankIcon,
    ChartPieIcon,
    CreditCardIcon,
    FilesIcon,
    TagsIcon,
    TargetIcon,
    RepeatIcon,
    UsersIcon
} from 'vue-tabler-icons';

export interface DashboardModule {
    id: string;
    titleKey: string;
    captionKey: string;
    icon: Component;
    to: string;
    disabled: boolean;
}

export function useDashboardModules() {
    const live: DashboardModule[] = [
        {
            id: 'accounts',
            titleKey: 'dashboard.modules.accounts.title',
            captionKey: 'dashboard.modules.accounts.caption',
            icon: BuildingBankIcon,
            to: '/app/finances/comptes',
            disabled: false
        },
        {
            id: 'transactions',
            titleKey: 'dashboard.modules.transactions.title',
            captionKey: 'dashboard.modules.transactions.caption',
            icon: ArrowsExchangeIcon,
            to: '/app/finances/transactions',
            disabled: false
        },
        {
            id: 'paymentMethods',
            titleKey: 'dashboard.modules.paymentMethods.title',
            captionKey: 'dashboard.modules.paymentMethods.caption',
            icon: CreditCardIcon,
            to: '/app/finances/moyens-de-paiement',
            disabled: false
        },
        {
            id: 'recurrences',
            titleKey: 'dashboard.modules.recurrences.title',
            captionKey: 'dashboard.modules.recurrences.caption',
            icon: RepeatIcon,
            to: '/app/finances/recurrences',
            disabled: false
        },
        {
            id: 'files',
            titleKey: 'dashboard.modules.files.title',
            captionKey: 'dashboard.modules.files.caption',
            icon: FilesIcon,
            to: '/app/gestion/files',
            disabled: false
        },
        {
            id: 'categories',
            titleKey: 'dashboard.modules.categories.title',
            captionKey: 'dashboard.modules.categories.caption',
            icon: TagsIcon,
            to: '/app/gestion/categories',
            disabled: false
        },
        {
            id: 'tiers',
            titleKey: 'dashboard.modules.tiers.title',
            captionKey: 'dashboard.modules.tiers.caption',
            icon: AddressBookIcon,
            to: '/app/gestion/tiers',
            disabled: false
        },
        {
            id: 'friends',
            titleKey: 'dashboard.modules.friends.title',
            captionKey: 'dashboard.modules.friends.caption',
            icon: UsersIcon,
            to: '/app/friends',
            disabled: false
        },
        {
            id: 'notifications',
            titleKey: 'dashboard.modules.notifications.title',
            captionKey: 'dashboard.modules.notifications.caption',
            icon: BellIcon,
            to: '/app/notifications',
            disabled: false
        },
        {
            id: 'budgets',
            titleKey: 'dashboard.modules.budgets.title',
            captionKey: 'dashboard.modules.budgets.caption',
            icon: ChartPieIcon,
            to: '/app/planning/budgets',
            disabled: false
        }
    ];

    const soon: DashboardModule[] = [
        {
            id: 'goals',
            titleKey: 'dashboard.modules.goals.title',
            captionKey: 'dashboard.modules.goals.caption',
            icon: TargetIcon,
            to: '/app',
            disabled: true
        }
    ];

    return { live, soon, modules: live };
}
