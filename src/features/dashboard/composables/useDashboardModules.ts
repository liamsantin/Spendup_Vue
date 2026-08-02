import type { Component } from 'vue';
import { ArrowsExchangeIcon, ChartPieIcon, TargetIcon, BuildingBankIcon } from 'vue-tabler-icons';

export interface DashboardModule {
    titleKey: string;
    captionKey: string;
    icon: Component;
    to: string;
    disabled: boolean;
}

export function useDashboardModules() {
    const modules: DashboardModule[] = [
        {
            titleKey: 'dashboard.modules.transactions.title',
            captionKey: 'dashboard.modules.transactions.caption',
            icon: ArrowsExchangeIcon,
            to: '/app',
            disabled: true
        },
        {
            titleKey: 'dashboard.modules.accounts.title',
            captionKey: 'dashboard.modules.accounts.caption',
            icon: BuildingBankIcon,
            to: '/app',
            disabled: true
        },
        {
            titleKey: 'dashboard.modules.budgets.title',
            captionKey: 'dashboard.modules.budgets.caption',
            icon: ChartPieIcon,
            to: '/app',
            disabled: true
        },
        {
            titleKey: 'dashboard.modules.goals.title',
            captionKey: 'dashboard.modules.goals.caption',
            icon: TargetIcon,
            to: '/app',
            disabled: true
        }
    ];

    return { modules };
}
