import type { PaymentMethod } from '@/features/payment-methods/types';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function emptyToNull(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

/** Aujourd’hui en calendrier UTC (`YYYY-MM-DD`). */
export function todayUtcYmd(now = new Date()): string {
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function isValidYmd(value: string | null | undefined): boolean {
    if (value == null) return false;
    return YMD_RE.test(value.trim());
}

/** Date d’expiration strictement avant aujourd’hui (UTC). */
export function isExpirationStrictlyBeforeTodayUtc(ymd: string | null | undefined, now = new Date()): boolean {
    if (!ymd || !isValidYmd(ymd)) return false;
    return ymd.trim() < todayUtcYmd(now);
}

/** Masque d’affichage last4 (`•••• 4242`). */
export function formatLastFourDigits(value: string | null | undefined): string | null {
    if (!value) return null;
    const digits = value.trim();
    if (!/^\d{4}$/.test(digits)) return null;
    return `•••• ${digits}`;
}

export function formatExpirationDate(value: string | null | undefined, locale?: string): string | null {
    if (!value) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!match) return value;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
    return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
}

export function sortPaymentMethods(items: readonly PaymentMethod[]): PaymentMethod[] {
    return [...items].sort((a, b) => {
        const byAccount = a.accountPublicId.localeCompare(b.accountPublicId);
        if (byAccount !== 0) return byAccount;
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });
}
