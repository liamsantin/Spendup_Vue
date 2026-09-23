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

export const PAYMENT_METHOD_SEARCH_MAX = 100;

export const PAYMENT_METHOD_SORTS = [
    'accountAsc',
    'accountDesc',
    'labelAsc',
    'labelDesc',
    'typeAsc',
    'typeDesc',
    'expirationAsc',
    'expirationDesc'
] as const;
export type PaymentMethodSort = (typeof PAYMENT_METHOD_SORTS)[number];
export const PAYMENT_METHOD_SORT_DEFAULT: PaymentMethodSort = 'accountAsc';

export function parsePaymentMethodSort(value: string | null | undefined): PaymentMethodSort {
    return value && (PAYMENT_METHOD_SORTS as readonly string[]).includes(value)
        ? (value as PaymentMethodSort)
        : PAYMENT_METHOD_SORT_DEFAULT;
}

export type PaymentMethodLabels = {
    accountName: (accountPublicId: string) => string;
    typeLabel: (type: PaymentMethod['type']) => string;
};

/** Tri client ; les inactifs restent après les actifs à valeur égale. */
export function sortPaymentMethodsBy(
    items: readonly PaymentMethod[],
    sort: PaymentMethodSort,
    labels: PaymentMethodLabels
): PaymentMethod[] {
    const text = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });
    const byLabel = (a: PaymentMethod, b: PaymentMethod) => text(a.label, b.label);
    const byActive = (a: PaymentMethod, b: PaymentMethod) => (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1);
    const byAccount = (a: PaymentMethod, b: PaymentMethod) =>
        text(labels.accountName(a.accountPublicId), labels.accountName(b.accountPublicId));
    const byType = (a: PaymentMethod, b: PaymentMethod) => text(labels.typeLabel(a.type), labels.typeLabel(b.type));
    const byExpiration = (a: PaymentMethod, b: PaymentMethod) =>
        (a.expirationDate ?? '9999-12-31').localeCompare(b.expirationDate ?? '9999-12-31');
    return [...items].sort((a, b) => {
        if (sort === 'accountDesc') return byAccount(b, a) || byActive(a, b) || byLabel(a, b);
        if (sort === 'labelAsc') return byLabel(a, b) || byAccount(a, b);
        if (sort === 'labelDesc') return byLabel(b, a) || byAccount(a, b);
        if (sort === 'typeAsc') return byType(a, b) || byLabel(a, b);
        if (sort === 'typeDesc') return byType(b, a) || byLabel(a, b);
        if (sort === 'expirationAsc') return byExpiration(a, b) || byLabel(a, b);
        if (sort === 'expirationDesc') return byExpiration(b, a) || byLabel(a, b);
        return byAccount(a, b) || byActive(a, b) || byLabel(a, b);
    });
}

function foldSearch(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/** Recherche sur libellé, référence, 4 derniers chiffres, type et compte (casse et accents ignorés). */
export function matchesPaymentMethodSearch(item: PaymentMethod, needle: string, labels: PaymentMethodLabels): boolean {
    const folded = foldSearch(needle);
    if (!folded) return true;
    return [item.label, item.reference, item.lastFourDigits, labels.typeLabel(item.type), labels.accountName(item.accountPublicId)].some(
        (value) => !!value && foldSearch(value).includes(folded)
    );
}

export function sortPaymentMethods(items: readonly PaymentMethod[]): PaymentMethod[] {
    return [...items].sort((a, b) => {
        const byAccount = a.accountPublicId.localeCompare(b.accountPublicId);
        if (byAccount !== 0) return byAccount;
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });
}
