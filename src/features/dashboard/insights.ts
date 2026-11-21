import { fetchWrapper } from '@/utils/helpers/fetch-helpers';

/** Type de dépense dans la répartition du mois (les trois types de catégorie, plus « non classé »). */
export type MonthSpendingKind = 'obligatoire' | 'plaisir' | 'epargne' | 'nonClasse';

export type SpendingKindShare = {
    kind: MonthSpendingKind;
    amount: number;
    /** Fraction des sorties (0 à 1). */
    share: number;
};

export type MonthFlows = {
    income: number;
    expense: number;
    /** Revenus − sorties : le reste à dépenser. */
    balance: number;
    /** (balance + sorties épargne) / revenus, en fraction ; `null` sans revenus. */
    savingsRate: number | null;
    byKind: SpendingKindShare[];
    count: number;
};

export type OtherCurrencyFlows = {
    currency: string;
    actualIncome: number;
    actualExpense: number;
    plannedIncome: number;
    plannedExpense: number;
};

/** Réponse de `GET /api/insights/month` : constaté (transactions) et prévu (échéances ouvertes) séparés. */
export type MonthInsights = {
    month: string;
    from: string;
    to: string;
    currency: string;
    actual: MonthFlows;
    planned: MonthFlows;
    total: MonthFlows;
    savingsTransfers: number;
    otherCurrencies: OtherCurrencyFlows[];
    hiddenCount: number;
    /** Sorties constatées par catégorie, de la plus grosse à la plus petite ; `null` = sans catégorie. */
    expenseByCategory: { categoryPublicId: string | null; amount: number }[];
};

export const insightsApi = {
    /**
     * Résumé du mois `YYYY-MM`, calculé côté serveur sans pagination.
     * `to` (`YYYY-MM-DD`, dans le mois) limite le constaté et le prévu aux jours jusqu’à cette date.
     */
    month(month: string, currency?: string | null, to?: string | null) {
        const params = new URLSearchParams({ month });
        if (currency) params.set('currency', currency);
        if (to) params.set('to', to);
        return fetchWrapper.get(`/api/insights/month?${params}`) as Promise<MonthInsights>;
    }
};

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

/** Mois `YYYY-MM` de la date donnée (heure locale). */
export function monthKey(date = new Date()): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** Décale un mois `YYYY-MM` de `delta` mois. */
export function shiftMonth(key: string, delta: number): string {
    const [year, month] = key.split('-').map(Number);
    return monthKey(new Date(year, month - 1 + delta, 1));
}

/** Premier jour du mois `YYYY-MM`, pour l’affichage. */
export function monthStart(key: string): Date {
    const [year, month] = key.split('-').map(Number);
    return new Date(year, month - 1, 1);
}

/** Segments de la barre de répartition : types non nuls seulement, dans l’ordre de l’API. */
export function spendingSegments(flows: MonthFlows | null | undefined): SpendingKindShare[] {
    return (flows?.byKind ?? []).filter((row) => row.amount > 0);
}
