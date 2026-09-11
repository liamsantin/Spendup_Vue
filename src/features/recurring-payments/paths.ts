export const RECURRENCES_BASE = '/app/finances/recurrences';

export const RECURRENCES_PATHS = {
    overview: RECURRENCES_BASE,
    charges: `${RECURRENCES_BASE}/charges`,
    revenus: `${RECURRENCES_BASE}/revenus`,
    echeances: `${RECURRENCES_BASE}/echeances`
} as const;

export type RecurrenceTab = 'all' | 'expenses' | 'incomes' | 'upcoming';

export function recurrencesPathForTab(tab: RecurrenceTab): string {
    if (tab === 'expenses') return RECURRENCES_PATHS.charges;
    if (tab === 'incomes') return RECURRENCES_PATHS.revenus;
    if (tab === 'upcoming') return RECURRENCES_PATHS.echeances;
    return RECURRENCES_PATHS.overview;
}

export function recurrencesTabFromPath(path: string): RecurrenceTab {
    if (path === RECURRENCES_PATHS.charges || path.startsWith(`${RECURRENCES_PATHS.charges}/`)) return 'expenses';
    if (path === RECURRENCES_PATHS.revenus || path.startsWith(`${RECURRENCES_PATHS.revenus}/`)) return 'incomes';
    if (path === RECURRENCES_PATHS.echeances || path.startsWith(`${RECURRENCES_PATHS.echeances}/`)) return 'upcoming';
    return 'all';
}
