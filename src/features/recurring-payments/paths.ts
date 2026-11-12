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

/* ── fiche d’une récurrence : /app/finances/recurrences/{charges|revenus}/:publicId ── */

export const RECURRING_DETAIL_TABS = ['informations', 'dues', 'transactions', 'attachments'] as const;

export type RecurringDetailTab = (typeof RECURRING_DETAIL_TABS)[number];

/** Chemin de la fiche : les charges sous `charges/`, les revenus sous `revenus/`. */
export function recurrenceDetailPath(kind: 'expense' | 'income', publicId: string): string {
    const base = kind === 'expense' ? RECURRENCES_PATHS.charges : RECURRENCES_PATHS.revenus;
    return `${base}/${encodeURIComponent(publicId)}`;
}

/** Récurrence désignée par le chemin, ou `null` sur une liste. */
export function recurrenceFromPath(path: string): { kind: 'expense' | 'income'; publicId: string } | null {
    for (const [kind, base] of [
        ['expense', RECURRENCES_PATHS.charges],
        ['income', RECURRENCES_PATHS.revenus]
    ] as const) {
        if (!path.startsWith(`${base}/`)) continue;
        const raw = path.slice(base.length + 1).split('/')[0];
        const publicId = decodeURIComponent(raw).trim();
        if (publicId) return { kind, publicId };
    }
    return null;
}

/** Onglet d’URL, ou Informations. */
export function activeRecurringDetailTab(value: unknown): RecurringDetailTab {
    return typeof value === 'string' && (RECURRING_DETAIL_TABS as readonly string[]).includes(value)
        ? (value as RecurringDetailTab)
        : RECURRING_DETAIL_TABS[0];
}
