/**
 * Formatage et libellés des écrans Sécurité → Accès techniques / Transparence.
 * Fonctions pures (testables sans composant) : dates, durées, clés i18n des énumérations API.
 */

/** Catégories d’accès technique connues de l’API (`SupportAccessRules.Categories`). */
export const SUPPORT_ACCESS_CATEGORIES = ['incident', 'demande_utilisateur', 'restauration', 'rgpd', 'securite'] as const;

/** Écrans consultables par le support (`SupportAccessRules.Resources`). */
export const SUPPORT_ACCESS_RESOURCES = [
    'accounts',
    'transactions',
    'budgets',
    'recurring_expenses',
    'recurring_incomes',
    'imports',
    'files'
] as const;

export const ACCESS_LOG_STATUSES = ['active', 'terminated', 'expired', 'email_failed'] as const;

export const CONSOLE_VISIT_KINDS = ['consultation', 'statistics', 'none'] as const;

/** Couleur du carré de l’état (badge `su-chip`) : bleu en cours, violet annulé, gris sinon. */
export function accessLogStatusColor(status: string): string {
    switch (status) {
        case 'active':
            return 'var(--blue)';
        case 'email_failed':
            return 'var(--violet)';
        default:
            return 'var(--gray)';
    }
}

/** Traducteur minimal (signature de `t` de vue-i18n, avec pluriel optionnel). */
export type Translate = (key: string, params?: Record<string, unknown>, plural?: number) => string;

/** Teste l’existence d’une clé (signature de `te` de vue-i18n). */
export type TranslationExists = (key: string) => boolean;

/**
 * Libellé d’une valeur d’énumération API : traduction si la clé existe, valeur brute sinon
 * (une nouvelle catégorie côté API reste lisible plutôt que d’afficher une clé i18n).
 */
export function enumLabel(t: Translate, te: TranslationExists, prefix: string, value: string): string {
    const key = `${prefix}.${value}`;
    return te(key) ? t(key) : value;
}

/** Durée en minutes → « 12 min » ou « 1 h 05 ». */
export function formatDurationMinutes(t: Translate, minutes: number | null | undefined): string {
    const total = Math.max(0, Math.round(minutes ?? 0));
    if (total < 60) return t('security.common.duration.minutes', { n: total });
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    return t('security.common.duration.hours', { h: hours, m: String(rest).padStart(2, '0') });
}

/** Jour `AAAA-MM-JJ` → Date locale (évite le décalage de fuseau d’un `new Date('2026-09-01')`). */
export function parseDay(day: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
}

/** Jour `AAAA-MM-JJ` formaté (« 5 nov. 2026 ») ; chaîne brute si invalide. */
export function formatDay(locale: string, day: string | null | undefined): string {
    if (!day) return '';
    const date = parseDay(day);
    if (!date) return day;
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

/** Mois `AAAA-MM` formaté (« novembre 2026 ») ; chaîne brute si invalide. */
export function formatMonth(locale: string, month: string | null | undefined): string {
    if (!month) return '';
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match) return month;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

/** Instant ISO → date et heure courtes ; chaîne brute si invalide. */
export function formatDateTime(locale: string, value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

/** Instant ISO → heure seule (« 14:32 ») ; chaîne brute si invalide. */
export function formatTime(locale: string, value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(date);
}

/** Entier formaté avec les séparateurs de la locale. */
export function formatCount(locale: string, value: number | null | undefined): string {
    return new Intl.NumberFormat(locale).format(value ?? 0);
}
