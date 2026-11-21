import type { Category, SpendingKind } from '@/features/categories/types';
import { monthKey, type MonthInsights, type MonthSpendingKind } from '@/features/dashboard/insights';

/** Page « Mon mois » : reste à dépenser d’un mois, détaillé (`?m=YYYY-MM`). */
export const MONTH_PATH = '/app/finances/mois';

/** Couleur de chaque type de dépense (barre, légende) : jetons du design system, jamais d’arc-en-ciel. */
export const SPENDING_KIND_COLORS: Record<MonthSpendingKind, string> = {
    obligatoire: 'var(--ink)',
    plaisir: 'var(--blue)',
    epargne: 'var(--t-green-ink)',
    nonClasse: 'var(--gray)'
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Mois `YYYY-MM` lu dans l’adresse ; absent ou invalide = mois en cours. */
export function parseMonthQuery(raw: unknown, today = new Date()): string {
    const value = Array.isArray(raw) ? raw[0] : raw;
    return typeof value === 'string' && MONTH_RE.test(value) ? value : monthKey(today);
}

/** Lien vers la page du mois ; le mois en cours garde une adresse sans paramètre. */
export function monthPageLocation(month: string, today = new Date()): { path: string; query: Record<string, string> } {
    return { path: MONTH_PATH, query: month === monthKey(today) ? {} : { m: month } };
}

/** Filtres de la page Transactions : dépenses du mois, éventuellement d’une catégorie. */
export function monthTransactionsQuery(
    insights: Pick<MonthInsights, 'from' | 'to'>,
    categoryPublicId?: string | null
): Record<string, string> {
    const query: Record<string, string> = { type: 'depense', from: insights.from, to: insights.to };
    if (categoryPublicId) query.category = categoryPublicId;
    return query;
}

type CategoryLookup = (
    publicId: string
) => Pick<Category, 'publicId' | 'name' | 'color' | 'parentPublicId' | 'spendingKind'> | null | undefined;

/** Type de dépense d’une catégorie, hérité de sa racine si elle n’en a pas (même règle que l’API). */
export function resolveSpendingKind(publicId: string | null, find: CategoryLookup): SpendingKind | null {
    if (!publicId) return null;
    let category = find(publicId);
    const seen = new Set<string>();
    while (category && !seen.has(category.publicId)) {
        if (category.spendingKind) return category.spendingKind;
        if (!category.parentPublicId) return null;
        seen.add(category.publicId);
        category = find(category.parentPublicId);
    }
    return null;
}

export type MonthCategoryRow = {
    categoryPublicId: string | null;
    name: string | null;
    color: string | null;
    amount: number;
};

export type MonthKindGroup = {
    kind: MonthSpendingKind;
    amount: number;
    share: number;
    categories: MonthCategoryRow[];
};

/**
 * Sorties constatées par type de dépense, avec les catégories de chacun (de la plus grosse à la plus petite).
 * Les montants et parts des types viennent de l’API ; seuls les types non nuls sont rendus.
 */
export function groupExpensesByKind(insights: Pick<MonthInsights, 'actual' | 'expenseByCategory'>, find: CategoryLookup): MonthKindGroup[] {
    const byKind = new Map<MonthSpendingKind, MonthCategoryRow[]>();
    for (const row of insights.expenseByCategory) {
        const kind: MonthSpendingKind = resolveSpendingKind(row.categoryPublicId, find) ?? 'nonClasse';
        const category = row.categoryPublicId ? find(row.categoryPublicId) : null;
        const list = byKind.get(kind) ?? [];
        list.push({
            categoryPublicId: category ? row.categoryPublicId : null,
            name: category?.name ?? null,
            color: category?.color ?? null,
            amount: row.amount
        });
        byKind.set(kind, list);
    }
    return insights.actual.byKind
        .filter((row) => row.amount > 0 || (byKind.get(row.kind)?.length ?? 0) > 0)
        .map((row) => ({
            kind: row.kind,
            amount: row.amount,
            share: row.share,
            categories: [...(byKind.get(row.kind) ?? [])].sort((a, b) => b.amount - a.amount)
        }));
}
