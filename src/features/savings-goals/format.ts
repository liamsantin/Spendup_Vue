import { formatAccountBalance } from '@/features/accounts/format';
import type { Account, Currency } from '@/features/accounts/types';
import {
    SAVINGS_GOAL_CURRENCIES,
    SAVINGS_GOAL_STATUSES,
    type ListSavingsGoalsQuery,
    type SavingsGoal,
    type SavingsGoalCurrency,
    type SavingsGoalStatus
} from '@/features/savings-goals/types';
import { matchesSearchTokens } from '@/utils/helpers/text-search';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function emptyToNull(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

export function isValidYmd(value: string | null | undefined): boolean {
    if (value == null) return false;
    const trimmed = value.trim();
    if (!YMD_RE.test(trimmed)) return false;
    const [y, m, d] = trimmed.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function isSavingsGoalStatus(value: unknown): value is SavingsGoalStatus {
    return typeof value === 'string' && SAVINGS_GOAL_STATUSES.includes(value as SavingsGoalStatus);
}

export function isSavingsGoalCurrency(value: unknown): value is SavingsGoalCurrency {
    return typeof value === 'string' && SAVINGS_GOAL_CURRENCIES.includes(value as SavingsGoalCurrency);
}

/** Compte actif, possédé — un compte partagé ou archivé est refusé. */
export function canLinkSavingsGoalAccount(account: Pick<Account, 'isOwned' | 'isActive' | 'myRole'>): boolean {
    return account.isOwned && account.isActive && account.myRole === 'owner';
}

export function formatCalendarDate(value: string | null | undefined, locale?: string): string {
    if (!value) return '';
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!match) return value;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
    return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium' }).format(date);
}

export function formatSavingsGoalAmount(amount: number, currency: string, locale?: string): string {
    return formatAccountBalance(amount, currency as Currency, locale);
}

export function formatPercentReached(value: number, locale?: string): string {
    return `${new Intl.NumberFormat(locale || undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
    }).format(value)} %`;
}

/** Barre UI bornée à 100 — `percentReached` API n’est pas plafonné. */
export function savingsGoalBarWidth(goal: Pick<SavingsGoal, 'percentReached'>): number {
    return Math.min(100, Math.max(0, goal.percentReached));
}

export type SavingsGoalProgressTone = 'idle' | 'ok' | 'warn' | 'done';

export function savingsGoalProgressTone(goal: Pick<SavingsGoal, 'status' | 'isOverdue' | 'percentReached'>): SavingsGoalProgressTone {
    if (goal.status === 'abandonne') return 'idle';
    if (goal.status === 'atteint' || goal.percentReached >= 100) return 'done';
    if (goal.isOverdue) return 'warn';
    return 'ok';
}

export function matchesSavingsGoalSearch(goal: Pick<SavingsGoal, 'name'>, needle: string): boolean {
    return matchesSearchTokens(goal.name, needle);
}

export function sameSavingsGoalAccount(a: string | null | undefined, b: string | null | undefined): boolean {
    return emptyToNull(a) === emptyToNull(b);
}

export function queryMatchesSavingsGoal(query: ListSavingsGoalsQuery, goal: SavingsGoal): boolean {
    if (query.status && goal.status !== query.status) return false;
    if (query.accountPublicId && !sameSavingsGoalAccount(goal.accountPublicId, query.accountPublicId)) return false;
    return true;
}

export function normalizeListQuery(query: ListSavingsGoalsQuery = {}): {
    status: SavingsGoalStatus | null;
    accountPublicId: string | null;
} {
    return {
        status: isSavingsGoalStatus(query.status) ? query.status : null,
        accountPublicId: emptyToNull(query.accountPublicId)
    };
}

export function isLinkedSavingsGoalAccountError(error: { status?: number; message?: string } | null | undefined): boolean {
    if (!error || error.status !== 400) return false;
    const message = (error.message ?? '').toLowerCase();
    return message.includes("objectif d'épargne") || message.includes('savings goal') || message.includes('objectif d’épargne');
}

/** Complète les champs calculés / tableaux absents d’une liste. */
export function normalizeSavingsGoal(goal: SavingsGoal): SavingsGoal {
    return {
        ...goal,
        openingAmount: Number(goal.openingAmount) || 0,
        contributedAmount: Number(goal.contributedAmount) || 0,
        currentAmount: Number(goal.currentAmount) || 0,
        remainingAmount: Number(goal.remainingAmount) || 0,
        percentReached: Number(goal.percentReached) || 0,
        projectedDate: goal.projectedDate ?? null,
        contributions: Array.isArray(goal.contributions) ? goal.contributions : []
    };
}
