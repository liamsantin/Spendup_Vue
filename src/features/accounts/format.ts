import type { Account, Currency, HiddenAccountField } from '@/features/accounts/types';

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

/** `null` + champ dans `hiddenFields` → « caché » ; `null` hors liste → vraiment vide. */
export function isAccountFieldHidden(
    account: Pick<Account, 'hiddenFields'> | { hiddenFields?: HiddenAccountField[] | null },
    field: HiddenAccountField
): boolean {
    return (account.hiddenFields ?? []).includes(field);
}

export function isBalanceHidden(account: Pick<Account, 'hiddenFields'> | { hiddenFields?: HiddenAccountField[] | null }): boolean {
    return isAccountFieldHidden(account, 'balance');
}

/**
 * Affiche un solde : valeur formatée, ou tiret « caché » / vide selon `hiddenFields`.
 * @returns `{ text, hidden }` — `hidden` pour afficher un cadenas côté UI.
 */
export function resolveAccountBalanceDisplay(
    amount: number | null | undefined,
    currency: Currency,
    balanceHidden: boolean,
    locale?: string
): { text: string; hidden: boolean } {
    if (amount == null) {
        return { text: '—', hidden: balanceHidden };
    }
    return { text: formatAccountBalance(amount, currency, locale), hidden: false };
}

export function emptyToNull(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

/** Formats API : `#RGB`, `#RRGGBB`, `#RRGGBBAA` (casse libre ; réponse souvent en majuscules). */
const ACCOUNT_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

/**
 * Valide une couleur compte côté client.
 * @returns `true` si vide/`null` (clear) ou hex accepté par l’API.
 */
export function isValidAccountColor(value: string | null | undefined): boolean {
    if (value == null) return true;
    const trimmed = value.trim();
    if (!trimmed) return true;
    return ACCOUNT_COLOR_RE.test(trimmed);
}

/**
 * Normalise une couleur pour le PUT (`#` + majuscules) ou `null` pour vider.
 */
export function normalizeAccountColor(value: string | null | undefined): string | null {
    const trimmed = emptyToNull(value);
    if (!trimmed) return null;
    const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    return withHash.toUpperCase();
}

/**
 * Normalise un IBAN pour contrôle client (espaces retirés, majuscules).
 * Le serveur reste autoritatif ; refuse accents / chiffres non ASCII.
 */
export function normalizeIban(value: string | null | undefined): string {
    if (value == null) return '';
    return value.replace(/\s+/g, '').toUpperCase();
}

/**
 * Validation IBAN légère : ASCII, 2 lettres pays + 2 chiffres de contrôle + reste alphanumérique.
 * @returns `true` si vide (optionnel) ou format plausible.
 */
export function isValidIbanFormat(value: string | null | undefined): boolean {
    const normalized = normalizeIban(value);
    if (!normalized) return true;
    return /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(normalized);
}

/**
 * Parse un montant compte / snapshot.
 * Accepte `0` ; refuse vide, NaN, ±Infinity (pas de fallback silencieux vers 0).
 * @returns Le nombre fini, ou `null` si invalide.
 */
export function parseAccountAmount(value: unknown): number | null {
    if (value === '' || value == null) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    const raw = typeof value === 'string' ? value.trim().replace(',', '.') : value;
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n)) return null;
    return n;
}

/** Date calendaire locale du jour au format `YYYY-MM-DD`. */
export function todayYmd(now = new Date()): string {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Convertit une date calendaire `YYYY-MM-DD` en ISO UTC pour `snapshotAt`.
 * - Aujourd’hui (fuseau local) → heure actuelle (`now.toISOString()`), jamais fin de journée.
 * - Jour passé → midi UTC (`…T12:00:00.000Z`).
 */
export function ymdToSnapshotIso(ymd: string, now = new Date()): string {
    const trimmed = ymd.trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (!match) {
        const parsed = new Date(trimmed);
        if (Number.isNaN(parsed.getTime())) {
            return now.toISOString();
        }
        const y = parsed.getUTCFullYear();
        const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
        const d = String(parsed.getUTCDate()).padStart(2, '0');
        return ymdToSnapshotIso(`${y}-${m}-${d}`, now);
    }

    const datePart = `${match[1]}-${match[2]}-${match[3]}`;
    if (datePart === todayYmd(now)) {
        return now.toISOString();
    }
    return `${datePart}T12:00:00.000Z`;
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
