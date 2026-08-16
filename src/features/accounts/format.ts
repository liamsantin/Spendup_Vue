import type { Currency } from './types';

export function formatAccountBalance(amount: number, currency: Currency, locale?: string): string {
    try {
        return new Intl.NumberFormat(locale || undefined, {
            style: 'currency',
            currency,
            maximumFractionDigits: 2
        }).format(amount);
    } catch {
        return `${amount.toFixed(2)} ${currency}`;
    }
}

export function emptyToNull(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}
