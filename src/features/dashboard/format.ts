import { isBalanceHidden } from '@/features/accounts/format';
import type { Account, Currency } from '@/features/accounts/types';

export type CurrencyTotal = {
    currency: Currency;
    amount: number;
};

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

export const DASHBOARD_MASKED_AMOUNT = '••••';
export const DASHBOARD_RECENT_LIMIT = 6;

export function greetingPeriod(now = new Date()): GreetingPeriod {
    const hour = now.getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
}

/** Soldes visibles des comptes actifs, groupés par devise. L’avatar / hiddenFields restent hors total. */
export function sumVisibleBalances(accounts: Account[]): CurrencyTotal[] {
    const totals = new Map<Currency, number>();
    for (const account of accounts) {
        if (!account.isActive) continue;
        if (isBalanceHidden(account)) continue;
        if (account.currentBalance == null || !Number.isFinite(account.currentBalance)) continue;
        totals.set(account.currency, (totals.get(account.currency) ?? 0) + account.currentBalance);
    }
    return [...totals.entries()]
        .map(([currency, amount]) => ({ currency, amount }))
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount) || a.currency.localeCompare(b.currency));
}

export function pickPrimaryCurrency(accounts: Account[], totals: CurrencyTotal[]): Currency | null {
    const primary = accounts.find((account) => account.isOwned && account.isPrimary && account.isActive);
    if (primary && totals.some((row) => row.currency === primary.currency)) {
        return primary.currency;
    }
    return totals[0]?.currency ?? null;
}

/** Nombre de dépenses par catégorie affichées (le reste est regroupé dans « Autres »). */
export const DASHBOARD_TOP_CATEGORIES = 5;
/** Horizon des prochaines échéances, en jours. */
export const DASHBOARD_UPCOMING_DAYS = 30;
export const DASHBOARD_UPCOMING_LIMIT = 5;
export const DASHBOARD_ACCOUNTS_LIMIT = 5;

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

export function ymd(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export type DateRange = { from: string; to: string };

/**
 * Mois en cours jusqu’à aujourd’hui, et même période du mois précédent
 * (du 1er au même jour, borné à la fin du mois : comparer un 10 octobre à un 10 septembre, pas à tout septembre).
 */
export function monthToDateRanges(now = new Date()): { current: DateRange; previous: DateRange } {
    const day = now.getDate();
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    return {
        current: { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) },
        previous: { from: ymd(prevStart), to: ymd(new Date(prevStart.getFullYear(), prevStart.getMonth(), Math.min(day, prevLastDay))) }
    };
}

type FlowTransaction = { type: string; amount: number | null; currency: string; categoryPublicId?: string | null };

export type MonthFlows = { income: number; expense: number; net: number; count: number };

/**
 * Revenus et dépenses d’une devise. Les transferts (entre mes comptes) et les montants masqués sont ignorés.
 * Les montants sont positifs : le type porte le sens.
 */
export function summarizeFlows(transactions: readonly FlowTransaction[], currency: string): MonthFlows {
    let income = 0;
    let expense = 0;
    let count = 0;
    for (const tx of transactions) {
        if (tx.currency !== currency || tx.amount == null || !Number.isFinite(tx.amount)) continue;
        if (tx.type === 'revenu') income += Math.abs(tx.amount);
        else if (tx.type === 'depense') expense += Math.abs(tx.amount);
        else continue;
        count += 1;
    }
    return { income, expense, net: income - expense, count };
}

/** Variation en % (arrondie) ; `null` si la base est nulle (pas de comparaison possible). */
export function percentChange(current: number, previous: number): number | null {
    if (!previous) return null;
    return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export type CategorySpend = { categoryPublicId: string | null; amount: number; share: number };

/** Dépenses d’une devise par catégorie, triées ; au-delà de `limit`, regroupées sous `categoryPublicId: 'other'`. */
export function topExpenseCategories(
    transactions: readonly FlowTransaction[],
    currency: string,
    limit = DASHBOARD_TOP_CATEGORIES
): CategorySpend[] {
    const totals = new Map<string | null, number>();
    let total = 0;
    for (const tx of transactions) {
        if (tx.type !== 'depense' || tx.currency !== currency || tx.amount == null || !Number.isFinite(tx.amount)) continue;
        const key = tx.categoryPublicId ?? null;
        const amount = Math.abs(tx.amount);
        totals.set(key, (totals.get(key) ?? 0) + amount);
        total += amount;
    }
    if (!total) return [];
    const sorted = [...totals.entries()]
        .map(([categoryPublicId, amount]) => ({ categoryPublicId, amount }))
        .sort((a, b) => b.amount - a.amount);
    const head = sorted.slice(0, limit);
    const rest = sorted.slice(limit).reduce((sum, item) => sum + item.amount, 0);
    const rows = rest > 0 ? [...head, { categoryPublicId: 'other', amount: rest }] : head;
    return rows.map((row) => ({ ...row, share: row.amount / total }));
}

type UpcomingTemplate = {
    publicId: string;
    name: string;
    plannedAmount: number;
    currency: string;
    nextDueDate: string | null;
    isActive: boolean;
};

export type UpcomingDue = {
    kind: 'expense' | 'income';
    publicId: string;
    name: string;
    date: string;
    /** Signé : négatif = charge. */
    amount: number;
    currency: string;
};

/** Prochaines échéances actives entre `from` et `to` (inclus), triées par date. */
export function upcomingDues(
    expenses: readonly UpcomingTemplate[],
    incomes: readonly UpcomingTemplate[],
    range: DateRange,
    limit = DASHBOARD_UPCOMING_LIMIT
): UpcomingDue[] {
    const pick = (items: readonly UpcomingTemplate[], kind: UpcomingDue['kind']): UpcomingDue[] =>
        items
            .filter((item) => item.isActive && item.nextDueDate && item.nextDueDate >= range.from && item.nextDueDate <= range.to)
            .map((item) => ({
                kind,
                publicId: item.publicId,
                name: item.name,
                date: item.nextDueDate as string,
                amount: kind === 'expense' ? -Math.abs(item.plannedAmount) : Math.abs(item.plannedAmount),
                currency: item.currency
            }));
    return [...pick(expenses, 'expense'), ...pick(incomes, 'income')]
        .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
        .slice(0, limit);
}
