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

/** Date calendaire locale du jour au format `YYYY-MM-DD`. */
export function todayYmd(now = new Date()): string {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Convertit une date calendaire `YYYY-MM-DD` en ISO UTC à midi.
 * Midi UTC évite le décalage de jour (minuit local → UTC) dans presque tous les fuseaux (±12h).
 */
export function ymdToSnapshotIso(ymd: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
    if (match) {
        return `${match[1]}-${match[2]}-${match[3]}T12:00:00.000Z`;
    }
    const parsed = new Date(ymd);
    if (Number.isNaN(parsed.getTime())) {
        return ymdToSnapshotIso(todayYmd());
    }
    const y = parsed.getUTCFullYear();
    const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const d = String(parsed.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}T12:00:00.000Z`;
}

/**
 * Affiche la date calendaire d’un `snapshotAt` (sémantique date-only) sans dérive timezone.
 */
export function formatSnapshotDate(value: string, locale?: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (match) {
        const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
        return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
    }
    return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium' }).format(new Date(value));
}
