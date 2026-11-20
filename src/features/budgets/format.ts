import { formatAccountBalance } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import {
    BUDGET_ALERT_OVER_PERCENT,
    BUDGET_ALERT_WARN_PERCENT,
    BUDGET_CURRENCIES,
    BUDGET_PERIODES,
    type Budget,
    type BudgetCurrency,
    type BudgetPeriode,
    type ListBudgetsQuery
} from '@/features/budgets/types';
import { matchesSearchTokens } from '@/utils/helpers/text-search';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function emptyToNull(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

export function todayLocalYmd(now = new Date()): string {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function isValidYmd(value: string | null | undefined): boolean {
    if (value == null) return false;
    const trimmed = value.trim();
    if (!YMD_RE.test(trimmed)) return false;
    const [y, m, d] = trimmed.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function isBudgetPeriode(value: unknown): value is BudgetPeriode {
    return typeof value === 'string' && BUDGET_PERIODES.includes(value as BudgetPeriode);
}

export function isBudgetCurrency(value: unknown): value is BudgetCurrency {
    return typeof value === 'string' && BUDGET_CURRENCIES.includes(value as BudgetCurrency);
}

export function formatCalendarDate(value: string | null | undefined, locale?: string): string {
    if (!value) return '';
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!match) return value;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
    return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium' }).format(date);
}

export function formatBudgetAmount(amount: number, currency: string, locale?: string): string {
    return formatAccountBalance(amount, currency as Currency, locale);
}

export function formatPercentUsed(value: number, locale?: string): string {
    return `${new Intl.NumberFormat(locale || undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
    }).format(value)} %`;
}

export function budgetBarWidth(budget: Pick<Budget, 'isCurrent' | 'percentUsed'>): number {
    if (!budget.isCurrent) return 0;
    return Math.min(100, Math.max(0, budget.percentUsed));
}

export type BudgetProgressTone = 'idle' | 'ok' | 'warn' | 'over';

export function budgetProgressTone(budget: Pick<Budget, 'isActive' | 'isCurrent' | 'percentUsed' | 'remainingAmount'>): BudgetProgressTone {
    if (!budget.isActive || !budget.isCurrent) return 'idle';
    if (budget.remainingAmount < 0 || budget.percentUsed >= BUDGET_ALERT_OVER_PERCENT) return 'over';
    if (budget.percentUsed >= BUDGET_ALERT_WARN_PERCENT) return 'warn';
    return 'ok';
}

export function isBudgetOverspent(budget: Pick<Budget, 'isCurrent' | 'remainingAmount'>): boolean {
    return budget.isCurrent && budget.remainingAmount < 0;
}

export type BudgetScheduleStatus = 'current' | 'upcoming' | 'ended';

export function budgetScheduleStatus(
    budget: Pick<Budget, 'isCurrent' | 'startDate' | 'endDate'>,
    today = todayLocalYmd()
): BudgetScheduleStatus {
    if (budget.isCurrent) return 'current';
    if (today < budget.startDate.trim()) return 'upcoming';
    return 'ended';
}

export function sameBudgetCategory(a: string | null | undefined, b: string | null | undefined): boolean {
    return emptyToNull(a) === emptyToNull(b);
}

export function isDuplicateBudgetScope(
    periode: BudgetPeriode,
    startDate: string,
    categoryPublicId: string | null,
    known: readonly Pick<Budget, 'publicId' | 'periode' | 'startDate' | 'categoryPublicId'>[],
    excludePublicId?: string | null
): boolean {
    const cat = emptyToNull(categoryPublicId);
    const start = startDate.trim();
    return known.some((item) => {
        if (excludePublicId && item.publicId === excludePublicId) return false;
        return item.periode === periode && item.startDate === start && sameBudgetCategory(item.categoryPublicId, cat);
    });
}

export function matchesBudgetSearch(budget: Pick<Budget, 'name'>, needle: string): boolean {
    return matchesSearchTokens(budget.name, needle);
}

export function queryMatchesBudget(query: ListBudgetsQuery, budget: Budget): boolean {
    if (query.isActive === true && !budget.isActive) return false;
    if (query.isActive === false && budget.isActive) return false;
    if (query.periode && budget.periode !== query.periode) return false;
    if (query.categoryPublicId && !sameBudgetCategory(budget.categoryPublicId, query.categoryPublicId)) return false;
    return true;
}

export function normalizeListQuery(query: ListBudgetsQuery = {}): {
    isActive: boolean | null;
    periode: BudgetPeriode | null;
    categoryPublicId: string | null;
} {
    return {
        isActive: typeof query.isActive === 'boolean' ? query.isActive : null,
        periode: isBudgetPeriode(query.periode) ? query.periode : null,
        categoryPublicId: emptyToNull(query.categoryPublicId)
    };
}

/** Jours restants dans la période, aujourd’hui compris (au moins 1 tant que la période n’est pas finie, sinon 0). */
export function budgetDaysRemaining(periodEnd: string, today = todayLocalYmd()): number {
    if (!isValidYmd(periodEnd) || !isValidYmd(today)) return 0;
    const [ey, em, ed] = periodEnd.trim().split('-').map(Number);
    const [ty, tm, td] = today.trim().split('-').map(Number);
    const diff = Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(ty, tm - 1, td)) / 86_400_000);
    return diff < 0 ? 0 : diff + 1;
}

/** Montant encore disponible par jour jusqu’à la fin de la période (0 si dépassé ou période finie). */
export function budgetAvailablePerDay(remainingAmount: number, daysRemaining: number): number {
    if (remainingAmount <= 0 || daysRemaining <= 0) return 0;
    return remainingAmount / daysRemaining;
}

/** Jauge segmentée : nombre de segments consommés sur `segments` (plafonné). */
export function budgetFilledSegments(percentUsed: number, segments = 20): number {
    if (!Number.isFinite(percentUsed) || percentUsed <= 0) return 0;
    return Math.min(segments, Math.max(0, Math.round((percentUsed / 100) * segments)));
}

/** Dernier jour du mois de `today` (`YYYY-MM-DD`). */
export function endOfMonthYmd(today = todayLocalYmd()): string {
    const [y, m] = today.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

/**
 * Mois courant pour « Budget {month} » : « d’octobre » / « de novembre » en français (élision),
 * nom du mois seul dans les autres langues.
 */
export function formatBudgetMonth(locale?: string, today = todayLocalYmd()): string {
    const [y, m] = today.split('-').map(Number);
    const month = new Intl.DateTimeFormat(locale || undefined, { month: 'long' }).format(new Date(y, m - 1, 1, 12));
    if (!(locale ?? '').toLowerCase().startsWith('fr')) return month;
    return /^[aeiouyàâéèêëîïôöûüh]/i.test(month) ? `d’${month}` : `de ${month}`;
}
