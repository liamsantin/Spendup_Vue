import { matchesSearchTokens } from '@/utils/helpers/text-search';
import { TIER_NATURES, TIER_NATURES_WITH_PANEL, TIER_ROLES, type Tier, type TierNature, type TierRole } from '@/features/tiers/types';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_CHARS_RE = /^[\d\s+\-.()]+$/;
const HOST_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function emptyToNull(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

export function normalizeName(raw: string | null | undefined): string {
    return (raw ?? '').trim();
}

export function normalizeEmail(raw: string | null | undefined): string | null {
    const value = emptyToNull(raw);
    return value ? value.toLowerCase() : null;
}

export function isValidEmail(value: string): boolean {
    return EMAIL_RE.test(value.trim());
}

/** Chiffres, espaces, `+ - . ( )`, au moins 3 chiffres. */
export function isValidPhone(value: string): boolean {
    const trimmed = value.trim();
    if (!PHONE_CHARS_RE.test(trimmed)) return false;
    return (trimmed.match(/\d/g)?.length ?? 0) >= 3;
}

/**
 * Normalise un site web : hôte nu → `https://hote`. Refuse tout schéma autre que http(s) et `localhost`.
 * @returns URL absolue, ou `null` si invalide.
 */
export function normalizeWebsite(raw: string | null | undefined): string | null {
    const value = emptyToNull(raw);
    if (!value) return null;
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) && !/^https?:\/\//i.test(value)) return null;
    const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    let url: URL;
    try {
        url = new URL(withScheme);
    } catch {
        return null;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    if (!host || host === 'localhost' || host.endsWith('.localhost')) return null;
    if (!HOST_RE.test(host)) return null;
    return url.toString();
}

export function isValidYmd(value: string | null | undefined): boolean {
    if (value == null) return false;
    const trimmed = value.trim();
    if (!YMD_RE.test(trimmed)) return false;
    const [y, m, d] = trimmed.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function todayUtcYmd(now = new Date()): string {
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function isDateInFutureUtc(ymd: string, now = new Date()): boolean {
    if (!isValidYmd(ymd)) return false;
    return ymd.trim() > todayUtcYmd(now);
}

export function isTierNature(value: unknown): value is TierNature {
    return typeof value === 'string' && TIER_NATURES.includes(value as TierNature);
}

export function isTierRole(value: unknown): value is TierRole {
    return typeof value === 'string' && TIER_ROLES.includes(value as TierRole);
}

export function natureHasPanel(nature: TierNature): boolean {
    return TIER_NATURES_WITH_PANEL.includes(nature);
}

/** Déduplique (casse ignorée) et remet dans l’ordre de l’énumération. */
export function normalizeRoles(roles: readonly string[] | null | undefined): TierRole[] {
    const seen = new Set<string>();
    for (const raw of roles ?? []) {
        const key = String(raw ?? '')
            .trim()
            .toLowerCase();
        if (key) seen.add(key);
    }
    return TIER_ROLES.filter((role) => seen.has(role.toLowerCase()));
}

export function hasDuplicateRoles(roles: readonly string[] | null | undefined): boolean {
    const seen = new Set<string>();
    for (const raw of roles ?? []) {
        const key = String(raw ?? '')
            .trim()
            .toLowerCase();
        if (!key) continue;
        if (seen.has(key)) return true;
        seen.add(key);
    }
    return false;
}

export const TIER_SORTS = ['nameAsc', 'nameDesc', 'natureAsc', 'recent', 'oldest'] as const;
export type TierSort = (typeof TIER_SORTS)[number];
export const TIER_SORT_DEFAULT: TierSort = 'nameAsc';

export function isTierSort(value: string | null | undefined): value is TierSort {
    return !!value && (TIER_SORTS as readonly string[]).includes(value);
}

export function parseTierSort(value: string | null | undefined): TierSort {
    return isTierSort(value) ? value : TIER_SORT_DEFAULT;
}

export function sortTiers(
    items: readonly Tier[],
    sort: TierSort = TIER_SORT_DEFAULT,
    options?: { natureLabel?: (nature: TierNature) => string }
): Tier[] {
    return [...items].sort((a, b) => {
        const byId = a.publicId.localeCompare(b.publicId);
        if (sort === 'recent') return (b.createdAt || '').localeCompare(a.createdAt || '') || byId;
        if (sort === 'oldest') return (a.createdAt || '').localeCompare(b.createdAt || '') || byId;
        const byName = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        if (sort === 'natureAsc') {
            const labelOf = options?.natureLabel ?? ((nature: TierNature) => nature);
            const byNature = labelOf(a.nature).localeCompare(labelOf(b.nature), undefined, { sensitivity: 'base' });
            return byNature || byName || byId;
        }
        if (sort === 'nameDesc') return -byName || byId;
        return byName || byId;
    });
}

/** Texte concaténé de tous les champs utiles à la recherche (libellé, identité, coordonnées, volets). */
export function tierSearchHaystack(tier: Tier): string {
    const parts: Array<string | null | undefined> = [
        tier.name,
        tier.nature,
        tier.email,
        tier.phone,
        tier.website,
        tier.notes,
        ...tier.roles,
        tier.person?.firstName,
        tier.person?.lastName,
        tier.person?.birthDate,
        tier.company?.legalName,
        tier.company?.vatNumber,
        tier.company?.companyRegistrationNumber,
        tier.organization?.officialName,
        tier.organization?.organizationType
    ];
    return parts.filter((part): part is string => !!part && part.trim().length > 0).join(' ');
}

export function matchesTierSearch(tier: Tier, needle: string): boolean {
    return matchesSearchTokens(tierSearchHaystack(tier), needle);
}

export function isDuplicateTierName(name: string, items: readonly Tier[], excludePublicId?: string | null): boolean {
    const needle = normalizeName(name).toLowerCase();
    if (!needle) return false;
    return items.some((item) => {
        if (excludePublicId && item.publicId === excludePublicId) return false;
        return item.name.trim().toLowerCase() === needle;
    });
}

export function tierSelectItems(
    items: readonly Tier[],
    options: { noneTitle: string } = { noneTitle: '' }
): { title: string; value: string }[] {
    const list: { title: string; value: string }[] = [{ title: options.noneTitle, value: '' }];
    for (const tier of sortTiers(items)) {
        list.push({ title: tier.name, value: tier.publicId });
    }
    return list;
}
