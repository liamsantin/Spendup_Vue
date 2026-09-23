import { TAG_COLOR_RE, TAG_PER_ITEM_MAX, type Tag } from '@/features/tags/types';

export function emptyToNull(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

export function normalizeName(raw: string | null | undefined): string {
    return (raw ?? '').trim();
}

/** Couleur API : minuscules. `null` si vide ou invalide. */
export function normalizeColor(raw: string | null | undefined): string | null {
    const value = emptyToNull(raw);
    if (!value) return null;
    if (!TAG_COLOR_RE.test(value)) return null;
    return value.toLowerCase();
}

export function compareTagName(a: string, b: string): number {
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

export function sortTags(items: readonly Tag[]): Tag[] {
    return [...items].sort((a, b) => {
        const byName = compareTagName(a.name, b.name);
        if (byName !== 0) return byName;
        return a.publicId.localeCompare(b.publicId);
    });
}

export function matchesTagSearch(tag: Tag, raw: string): boolean {
    const needle = raw.trim().toLowerCase();
    if (!needle) return true;
    return tag.name.toLowerCase().includes(needle);
}

export function isDuplicateTagName(name: string, items: readonly Tag[], excludePublicId?: string | null): boolean {
    const needle = name.trim().toLowerCase();
    if (!needle) return false;
    return items.some((item) => {
        if (excludePublicId && item.publicId === excludePublicId) return false;
        return item.name.trim().toLowerCase() === needle;
    });
}

/** Trim, déduplique, plafonne à 10. Ordre d’apparition conservé. */
export function sanitizeTagPublicIds(ids: readonly string[] | null | undefined): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of ids ?? []) {
        const id = raw.trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
        if (out.length >= TAG_PER_ITEM_MAX) break;
    }
    return out;
}

export function sameTagPublicIds(a: readonly string[] | null | undefined, b: readonly string[] | null | undefined): boolean {
    const left = sanitizeTagPublicIds(a).slice().sort();
    const right = sanitizeTagPublicIds(b).slice().sort();
    if (left.length !== right.length) return false;
    return left.every((id, index) => id === right[index]);
}

export function withoutTagPublicId(ids: readonly string[] | null | undefined, publicId: string): string[] {
    const id = publicId.trim();
    if (!id) return sanitizeTagPublicIds(ids);
    return sanitizeTagPublicIds(ids).filter((item) => item !== id);
}

export function normalizeTag(tag: Tag): Tag {
    return {
        ...tag,
        name: normalizeName(tag.name),
        color: normalizeColor(tag.color),
        transactionCount: Number.isFinite(tag.transactionCount) ? tag.transactionCount : 0,
        recurringExpenseCount: Number.isFinite(tag.recurringExpenseCount) ? tag.recurringExpenseCount : 0
    };
}
