import type { Category, CategoryType } from '@/features/categories/types';
import { CATEGORY_COLOR_RE } from '@/features/categories/types';

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
    if (!CATEGORY_COLOR_RE.test(value)) return null;
    return value.toLowerCase();
}

export function compareCategoryName(a: string, b: string): number {
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

export function sortCategoryChildren(items: readonly Category[]): Category[] {
    return [...items].sort((a, b) => compareCategoryName(a.name, b.name));
}

export function sortCategoryTree(items: readonly Category[]): Category[] {
    return [...items]
        .map((item) => ({
            ...item,
            children: sortCategoryChildren(item.children ?? [])
        }))
        .sort((a, b) => compareCategoryName(a.name, b.name));
}

export function flattenCategories(roots: readonly Category[]): Category[] {
    const out: Category[] = [];
    for (const root of roots) {
        out.push(root);
        if (root.children?.length) out.push(...root.children);
    }
    return out;
}

export function findCategoryInTree(roots: readonly Category[], publicId: string): Category | null {
    const id = publicId.trim();
    if (!id) return null;
    for (const root of roots) {
        if (root.publicId === id) return root;
        const child = root.children?.find((item) => item.publicId === id);
        if (child) return child;
    }
    return null;
}

export function isCompatibleParentType(parentType: CategoryType, childType: CategoryType): boolean {
    return parentType === 'mixte' || parentType === childType;
}

export function compatibleParentCandidates(
    roots: readonly Category[],
    childType: CategoryType,
    excludePublicId?: string | null
): Category[] {
    return roots.filter((root) => {
        if (excludePublicId && root.publicId === excludePublicId) return false;
        return isCompatibleParentType(root.type, childType);
    });
}

export function removeCategoryFromTree(roots: readonly Category[], publicId: string): Category[] {
    return roots
        .filter((root) => root.publicId !== publicId)
        .map((root) => ({
            ...root,
            children: (root.children ?? []).filter((child) => child.publicId !== publicId)
        }));
}

/**
 * Insert ou déplace une catégorie dans l’arbre (deux niveaux).
 * Conserve les enfants d’une racine si la réponse n’en ramène pas.
 */
export function upsertCategoryInTree(roots: readonly Category[], category: Category): Category[] {
    const previous = findCategoryInTree(roots, category.publicId);
    const without = removeCategoryFromTree(roots, category.publicId);
    const keepPreviousChildren = !category.parentPublicId && (previous?.children?.length ?? 0) > 0;
    const children = category.children?.length
        ? sortCategoryChildren(category.children)
        : keepPreviousChildren
          ? sortCategoryChildren(previous!.children)
          : [];
    const next: Category = {
        ...category,
        children: category.parentPublicId ? [] : children
    };

    if (!next.parentPublicId) {
        return sortCategoryTree([...without, next]);
    }

    let inserted = false;
    const updated = without.map((root) => {
        if (root.publicId !== next.parentPublicId) return root;
        inserted = true;
        return {
            ...root,
            children: sortCategoryChildren([
                ...(root.children ?? []).filter((child) => child.publicId !== next.publicId),
                { ...next, children: [] }
            ])
        };
    });
    if (!inserted) {
        return sortCategoryTree([...updated, { ...next, parentPublicId: null, children: [] }]);
    }
    return sortCategoryTree(updated);
}
