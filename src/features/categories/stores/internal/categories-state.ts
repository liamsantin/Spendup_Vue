import { computed, ref } from 'vue';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import {
    flattenCategories,
    sortCategoryTree,
    upsertCategoryInTree,
    removeCategoryFromTree,
    findCategoryInTree
} from '@/features/categories/format';
import { CATEGORY_TYPES, type Category, type CategoryType } from '@/features/categories/types';

export const CATEGORIES_LIST_MAX_AGE_MS = 30_000;
export const KEY_TREE = 'tree';

export function listCacheKey(type?: CategoryType | null): string {
    return type && CATEGORY_TYPES.includes(type) ? `tree:${type}` : KEY_TREE;
}

export type CategoriesCacheEntry = {
    items: Category[];
    totalCount: number;
};

/**
 * État partagé du store catégories (arbre deux niveaux, listes filtrées par type).
 */
export function createCategoriesState() {
    const items = ref<Category[]>([]);
    const itemsByListKey = new Map<string, CategoriesCacheEntry>();
    const activeListKey = ref(KEY_TREE);
    const totalCount = ref(0);

    const loading = ref(false);
    const acting = ref(false);
    let actingDepth = 0;
    const initialized = ref(false);
    const error = ref<string | null>(null);

    const cache = createResourceCache({ defaultMaxAgeMs: CATEGORIES_LIST_MAX_AGE_MS });
    const recentMutations = new Map<string, ReturnType<typeof setTimeout>>();

    const hasItems = computed(() => items.value.length > 0);
    const activeType = computed<CategoryType | null>(() => {
        const key = activeListKey.value;
        if (key === KEY_TREE) return null;
        const type = key.slice('tree:'.length) as CategoryType;
        return CATEGORY_TYPES.includes(type) ? type : null;
    });

    function beginActing() {
        actingDepth += 1;
        acting.value = true;
    }

    function endActing() {
        actingDepth = Math.max(0, actingDepth - 1);
        acting.value = actingDepth > 0;
    }

    function resetActing() {
        actingDepth = 0;
        acting.value = false;
    }

    function clearError() {
        error.value = null;
    }

    function setList(key: string, nextItems: Category[], meta?: { totalCount?: number }) {
        const sorted = sortCategoryTree(nextItems);
        const prev = itemsByListKey.get(key);
        const entry: CategoriesCacheEntry = {
            items: sorted,
            totalCount: meta?.totalCount ?? prev?.totalCount ?? flattenCategories(sorted).length
        };
        itemsByListKey.set(key, entry);
        if (activeListKey.value === key) {
            items.value = entry.items;
            totalCount.value = entry.totalCount;
        }
    }

    function activateList(key: string) {
        activeListKey.value = key;
        const entry = itemsByListKey.get(key);
        if (entry) {
            items.value = entry.items;
            totalCount.value = entry.totalCount;
            return;
        }
        items.value = [];
        totalCount.value = 0;
    }

    function upsertItem(category: Category) {
        const tree = itemsByListKey.get(KEY_TREE);
        if (tree) {
            const next = upsertCategoryInTree(tree.items, category);
            setList(KEY_TREE, next, { totalCount: flattenCategories(next).length });
        }
        for (const key of [...itemsByListKey.keys()]) {
            if (key === KEY_TREE) continue;
            cache.invalidate(key);
            itemsByListKey.delete(key);
        }
        if (activeListKey.value !== KEY_TREE) {
            activateList(activeListKey.value);
        }
    }

    function removeItemLocal(publicId: string) {
        for (const key of [...itemsByListKey.keys()]) {
            const prev = itemsByListKey.get(key);
            if (!prev) continue;
            if (!findCategoryInTree(prev.items, publicId)) continue;
            const next = removeCategoryFromTree(prev.items, publicId);
            setList(key, next, { totalCount: Math.max(0, prev.totalCount - 1) });
        }
    }

    function rememberLocalMutation(publicId: string) {
        const id = publicId.trim();
        if (!id) return;
        const previous = recentMutations.get(id);
        if (previous) clearTimeout(previous);
        recentMutations.set(
            id,
            setTimeout(() => {
                recentMutations.delete(id);
            }, 2500)
        );
    }

    function consumeLocalMutation(publicId: string): boolean {
        const id = publicId.trim();
        const timer = recentMutations.get(id);
        if (!timer) return false;
        clearTimeout(timer);
        recentMutations.delete(id);
        return true;
    }

    function clearRecentMutations() {
        for (const timer of recentMutations.values()) clearTimeout(timer);
        recentMutations.clear();
    }

    function allKnownItems(): Category[] {
        const byId = new Map<string, Category>();
        for (const entry of itemsByListKey.values()) {
            for (const item of flattenCategories(entry.items)) byId.set(item.publicId, item);
        }
        for (const item of flattenCategories(items.value)) byId.set(item.publicId, item);
        return [...byId.values()];
    }

    function findByPublicId(publicId: string): Category | null {
        const id = publicId.trim();
        if (!id) return null;
        for (const entry of itemsByListKey.values()) {
            const found = findCategoryInTree(entry.items, id);
            if (found) return found;
        }
        return findCategoryInTree(items.value, id);
    }

    return {
        items,
        itemsByListKey,
        activeListKey,
        totalCount,
        loading,
        acting,
        initialized,
        error,
        cache,
        hasItems,
        activeType,
        beginActing,
        endActing,
        resetActing,
        clearError,
        setList,
        activateList,
        upsertItem,
        removeItemLocal,
        rememberLocalMutation,
        consumeLocalMutation,
        clearRecentMutations,
        allKnownItems,
        findByPublicId
    };
}

export type CategoriesState = ReturnType<typeof createCategoriesState>;
