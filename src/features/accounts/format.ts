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

/** Champ listé dans `hiddenFields` → traité comme masqué (même si une valeur est présente). */
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
 * Ligne secondaire liste : n° de compte, ou libellé « caché » si `accountNumber` ∈ hiddenFields.
 * @returns Suffixe préfixé par ` · `, ou chaîne vide.
 */
export function formatAccountNumberLine(
    account: Pick<Account, 'accountNumber' | 'hiddenFields'>,
    labels: { hidden: string; visible: (number: string) => string }
): string {
    if (isAccountFieldHidden(account, 'accountNumber')) {
        return ` · ${labels.hidden}`;
    }
    if (account.accountNumber) {
        return ` · ${labels.visible(account.accountNumber)}`;
    }
    return '';
}

/**
 * Affiche un solde : valeur formatée, ou tiret « caché » selon `hiddenFields`.
 * Si `balanceHidden`, la valeur n’est jamais exposée (défense en profondeur).
 * @returns `{ text, hidden }` — `hidden` pour afficher un cadenas côté UI.
 */
export function resolveAccountBalanceDisplay(
    amount: number | null | undefined,
    currency: Currency,
    balanceHidden: boolean,
    locale?: string
): { text: string; hidden: boolean } {
    if (balanceHidden) {
        return { text: '—', hidden: true };
    }
    if (amount == null) {
        return { text: '—', hidden: false };
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
 * Normalise une couleur pour le PUT (`#` + majuscules) ou `null` pour vider / invalide.
 */
export function normalizeAccountColor(value: string | null | undefined): string | null {
    const trimmed = emptyToNull(value);
    if (!trimmed) return null;
    const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (!isValidAccountColor(withHash)) return null;
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

/** Modulo 97 itératif (IBAN peut dépasser Number.MAX_SAFE_INTEGER). */
function ibanMod97(normalized: string): number {
    const rearranged = normalized.slice(4) + normalized.slice(0, 4);
    let remainder = 0;
    for (const ch of rearranged) {
        const code = ch.charCodeAt(0);
        if (code >= 65 && code <= 90) {
            const value = code - 55; // A=10 … Z=35
            remainder = (remainder * 100 + value) % 97;
        } else {
            remainder = (remainder * 10 + (code - 48)) % 97;
        }
    }
    return remainder;
}

/**
 * Validation IBAN client : ASCII, longueur 15–34, structure pays+check, checksum mod-97.
 * @returns `true` si vide (optionnel) ou IBAN plausible.
 */
export function isValidIbanFormat(value: string | null | undefined): boolean {
    const normalized = normalizeIban(value);
    if (!normalized) return true;
    if (normalized.length < 15 || normalized.length > 34) return false;
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(normalized)) return false;
    return ibanMod97(normalized) === 1;
}

/** Plafond absolu des montants compte / relevé (défense parsing). */
export const MAX_ACCOUNT_AMOUNT = 1_000_000_000_000;

/** Décimal strict : signe optionnel, chiffres, séparateur `.` ou `,` optionnel. */
const ACCOUNT_AMOUNT_RE = /^[+-]?\d+([.,]\d+)?$/;

/**
 * Parse un montant compte / snapshot.
 * Accepte `number` / `string` décimaux finis ; refuse booléens, tableaux, hex, notation scientifique.
 * Arrondit à 2 décimales ; plafonne à ±`MAX_ACCOUNT_AMOUNT`.
 * @returns Le nombre fini, ou `null` si invalide.
 */
export function parseAccountAmount(value: unknown): number | null {
    if (value == null || value === '') return null;

    let n: number;
    if (typeof value === 'number') {
        n = value;
    } else if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed || !ACCOUNT_AMOUNT_RE.test(trimmed)) return null;
        n = Number(trimmed.replace(',', '.'));
    } else {
        return null;
    }

    if (!Number.isFinite(n)) return null;
    if (Math.abs(n) > MAX_ACCOUNT_AMOUNT) return null;

    const rounded = Number(n.toFixed(2));
    return Object.is(rounded, -0) ? 0 : rounded;
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
 * - Jour futur → clamp à maintenant (jamais une date future).
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
    const today = todayYmd(now);
    if (datePart > today) {
        return now.toISOString();
    }
    if (datePart === today) {
        return now.toISOString();
    }
    return `${datePart}T12:00:00.000Z`;
}

/**
 * Extrait le jour calendaire `YYYY-MM-DD` d’un `snapshotAt` ISO (partie date, pas de conversion locale).
 */
export function snapshotIsoToYmd(iso: string, now = new Date()): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return todayYmd(now);
    const y = parsed.getUTCFullYear();
    const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const d = String(parsed.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * PUT relevé : conserve l’heure d’origine si le jour calendaire n’a pas changé.
 * Sinon même règle que create (`ymdToSnapshotIso`).
 */
export function snapshotAtForUpdate(formYmd: string, originalIso: string, now = new Date()): string {
    const trimmedIso = originalIso.trim();
    if (snapshotIsoToYmd(trimmedIso, now) === formYmd.trim() && /Z$/i.test(trimmedIso)) {
        return trimmedIso;
    }
    return ymdToSnapshotIso(formYmd, now);
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

/**
 * Couleur sûre pour l’UI (avatar) : hex API valide, sinon `null` → fallback thème.
 */
export function safeAccountColor(value: string | null | undefined): string | null {
    if (value == null || !String(value).trim()) return null;
    if (!isValidAccountColor(value)) return null;
    return normalizeAccountColor(value);
}

/** Luminance relative sRGB (0–1) pour choisir le contraste du texte sur l’avatar. */
export function isLightAccountColor(value: string | null | undefined): boolean {
    const hex = safeAccountColor(value);
    if (!hex) return true; // fallback lightprimary → texte foncé
    const raw = hex.slice(1);
    const full =
        raw.length === 3
            ? raw
                  .split('')
                  .map((c) => c + c)
                  .join('')
            : raw.slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16) / 255;
    const g = parseInt(full.slice(2, 4), 16) / 255;
    const b = parseInt(full.slice(4, 6), 16) / 255;
    const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return luminance > 0.4;
}
