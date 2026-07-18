import type { Component } from 'vue';
import { ArrowsExchangeIcon, ChartPieIcon, TargetIcon, BuildingBankIcon, SettingsIcon } from 'vue-tabler-icons';

export interface DashboardModule {
    title: string;
    caption: string;
    icon: Component;
    to: string;
    disabled: boolean;
}

export function useDashboardModules() {
    const modules: DashboardModule[] = [
        {
            title: 'Transactions',
            caption: 'Revenus, dépenses et catégories',
            icon: ArrowsExchangeIcon,
            to: '/app',
            disabled: true
        },
        {
            title: 'Comptes',
            caption: 'Banques, épargne et moyens de paiement',
            icon: BuildingBankIcon,
            to: '/app',
            disabled: true
        },
        {
            title: 'Budgets',
            caption: 'Suivi et alertes budgétaires',
            icon: ChartPieIcon,
            to: '/app',
            disabled: true
        },
        {
            title: 'Objectifs',
            caption: 'Projets et épargne',
            icon: TargetIcon,
            to: '/app',
            disabled: true
        },
        {
            title: 'Réglages',
            caption: 'Profil et préférences',
            icon: SettingsIcon,
            to: '/app/account-settings',
            disabled: false
        }
    ];

    return { modules };
}
