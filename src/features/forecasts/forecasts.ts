import type { MonthFlows } from '@/features/dashboard/insights';
import { fetchWrapper } from '@/utils/helpers/fetch-helpers';

/** Origine d’un montant : réel (`constate`) ou prévu (`recurrence`, `budget`, `moyenne`). */
export type ForecastSource = 'constate' | 'recurrence' | 'budget' | 'moyenne';

export type ForecastLine = {
    direction: 'revenu' | 'depense';
    /** Nom de la récurrence ou de la catégorie ; `null` = dépenses sans catégorie. */
    label: string | null;
    categoryPublicId: string | null;
    spendingKind: 'obligatoire' | 'plaisir' | 'epargne' | null;
    amount: number;
    source: ForecastSource;
    recurrencePublicId: string | null;
    budgetPublicId: string | null;
};

export type ForecastSourceTotal = { source: ForecastSource; income: number; expense: number };

export type ForecastMonth = {
    month: string;
    phase: 'passe' | 'courant' | 'futur';
    flows: MonthFlows;
    /** Somme des balances depuis janvier de l’année (pas un solde de compte). */
    cumulativeBalance: number;
    sources: ForecastSourceTotal[];
    lines: ForecastLine[];
};

/** Réponse de `GET /api/forecasts/year` : 12 mois, une seule devise. */
export type YearForecast = { year: number; currency: string; months: ForecastMonth[] };

export const forecastsApi = {
    year(year: number, currency?: string | null) {
        const params = new URLSearchParams({ year: String(year) });
        if (currency) params.set('currency', currency);
        return fetchWrapper.get(`/api/forecasts/year?${params}`) as Promise<YearForecast>;
    }
};

/** Page « Prévisions » (budget prévisionnel de l’année, `?y=YYYY`). */
export const FORECASTS_PATH = '/app/analyses/previsions';

/** Année lue dans l’adresse ; absente ou invalide = année en cours. */
export function parseYearQuery(raw: unknown, today = new Date()): number {
    const value = Array.isArray(raw) ? raw[0] : raw;
    const year = typeof value === 'string' && /^\d{4}$/.test(value) ? Number(value) : NaN;
    return year >= 1900 && year <= 2200 ? year : today.getFullYear();
}

/** Lien vers la page ; l’année en cours garde une adresse sans paramètre. */
export function forecastsLocation(year: number, today = new Date()): { path: string; query: Record<string, string> } {
    return { path: FORECASTS_PATH, query: year === today.getFullYear() ? {} : { y: String(year) } };
}

/** Une source est « prévue » dès qu’elle n’est pas le constaté. */
export function isPlannedSource(source: ForecastSource): boolean {
    return source !== 'constate';
}

/** Part des sorties du mois qui est prévue (0 à 1) ; 0 sans sorties. */
export function plannedShare(month: ForecastMonth): number {
    const planned = month.sources.filter((s) => isPlannedSource(s.source)).reduce((sum, s) => sum + s.expense, 0);
    return month.flows.expense > 0 ? planned / month.flows.expense : 0;
}

/** Courbe du cumul : points `[x, y]` dans une boîte `width × height`, y vers le bas. Vide sous deux mois. */
export function cumulativePoints(months: readonly ForecastMonth[], width: number, height: number): [number, number][] {
    if (months.length < 2) return [];
    const values = months.map((m) => m.cumulativeBalance);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const span = max - min || 1;
    return values.map((v, i) => [(i / (months.length - 1)) * width, height - ((v - min) / span) * height]);
}

/** Cible d’une ligne prévue : sa récurrence ou son budget ; `null` pour du constaté ou une moyenne. */
export function lineTarget(line: ForecastLine): { kind: 'recurrence' | 'budget'; publicId: string } | null {
    if (line.recurrencePublicId) return { kind: 'recurrence', publicId: line.recurrencePublicId };
    if (line.budgetPublicId) return { kind: 'budget', publicId: line.budgetPublicId };
    return null;
}
