export const BUDGETS_BASE = '/app/planning/budgets';

export const BUDGETS_PATHS = {
    list: BUDGETS_BASE
} as const;

export function budgetDetailPath(publicId: string): string {
    const id = publicId.trim();
    return id ? `${BUDGETS_BASE}/${encodeURIComponent(id)}` : BUDGETS_BASE;
}

export function budgetPublicIdFromPath(path: string): string | null {
    const trimmed = path.trim();
    if (trimmed === BUDGETS_BASE || trimmed === `${BUDGETS_BASE}/`) return null;
    if (!trimmed.startsWith(`${BUDGETS_BASE}/`)) return null;
    const rest = trimmed.slice(`${BUDGETS_BASE}/`.length).split(/[/?#]/)[0] ?? '';
    const decoded = decodeURIComponent(rest).trim();
    return decoded || null;
}

/** Query `/app/finances/transactions` pour la fenêtre courante d’un budget. */
export function budgetLinkedTransactionsQuery(budget: {
    publicId: string;
    periodStart: string;
    periodEnd: string;
    categoryPublicId: string | null;
}): Record<string, string> {
    const query: Record<string, string> = {
        budget: budget.publicId,
        type: 'depense',
        from: budget.periodStart,
        to: budget.periodEnd
    };
    if (budget.categoryPublicId) query.category = budget.categoryPublicId;
    return query;
}
