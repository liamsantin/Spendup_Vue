import { parseAccountAmount } from '@/features/accounts/format';

export function parseAmountFilter(value: string | null | undefined): number | null {
    const amount = parseAccountAmount(value);
    if (amount == null || amount < 0) return null;
    return amount;
}

export function serializeAmountFilter(value: string): string | undefined {
    const amount = parseAmountFilter(value);
    return amount == null ? undefined : String(amount);
}

export function amountInFilterRange(amount: number | null | undefined, min: number | null, max: number | null): boolean {
    if (min == null && max == null) return true;
    if (amount == null) return false;
    const value = Math.abs(amount);
    if (min != null && value < min) return false;
    if (max != null && value > max) return false;
    return true;
}
