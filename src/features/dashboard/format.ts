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
