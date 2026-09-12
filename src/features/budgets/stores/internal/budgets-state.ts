import { computed, ref } from 'vue';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import { queryMatchesBudget } from '@/features/budgets/format';
import type { Budget, BudgetPeriode, ListBudgetsQuery } from '@/features/budgets/types';

export const BUDGETS_LIST_MAX_AGE_MS = 30_000;

export type BudgetsListQuery = {
    isActive: boolean | null;
    periode: BudgetPeriode | null;
    categoryPublicId: string | null;
};

export function listCacheKey(query: BudgetsListQuery): string {
    return `list:${query.isActive ?? 'all'}:${query.periode ?? 'all'}:${query.categoryPublicId ?? 'all'}`;
}

export type BudgetsCacheEntry = {
    items: Budget[];
    totalCount: number;
};

export function createBudgetsState() {
    const items = ref<Budget[]>([]);
    const itemsByListKey = new Map<string, BudgetsCacheEntry>();
    const knownById = new Map<string, Budget>();
    const activeListKey = ref(listCacheKey({ isActive: null, periode: null, categoryPublicId: null }));
    const totalCount = ref(0);

    const loading = ref(false);
    const acting = ref(false);
    let actingDepth = 0;
    const initialized = ref(false);
    const error = ref<string | null>(null);

    const cache = createResourceCache({ defaultMaxAgeMs: BUDGETS_LIST_MAX_AGE_MS });
    const recentMutations = new Map<string, ReturnType<typeof setTimeout>>();
    const deletedListeners = new Set<(publicId: string) => void>();

    const hasItems = computed(() => items.value.length > 0);
    const activeQuery = computed<BudgetsListQuery>(() => {
        const [, isActive, periode, ...rest] = activeListKey.value.split(':');
        const categoryPublicId = rest.join(':');
        return {
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : null,
            periode: periode && periode !== 'all' ? (periode as BudgetPeriode) : null,
            categoryPublicId: !categoryPublicId || categoryPublicId === 'all' ? null : categoryPublicId
        };
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

    function rememberKnown(budget: Budget) {
        knownById.set(budget.publicId, budget);
    }

    function setList(key: string, nextItems: Budget[], meta?: { totalCount?: number }) {
        const prev = itemsByListKey.get(key);
        const entry: BudgetsCacheEntry = {
            items: nextItems,
            totalCount: meta?.totalCount ?? prev?.totalCount ?? nextItems.length
        };
        itemsByListKey.set(key, entry);
        for (const item of nextItems) rememberKnown(item);
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

    function upsertItem(budget: Budget) {
        rememberKnown(budget);
        for (const [key, entry] of [...itemsByListKey.entries()]) {
            const parts = key.split(':');
            const query: ListBudgetsQuery = {
                isActive: parts[1] === 'true' ? true : parts[1] === 'false' ? false : undefined,
                periode: parts[2] && parts[2] !== 'all' ? (parts[2] as BudgetPeriode) : undefined,
                categoryPublicId: parts.slice(3).join(':') === 'all' ? undefined : parts.slice(3).join(':') || undefined
            };
            const matches = queryMatchesBudget(query, budget);
            const idx = entry.items.findIndex((item) => item.publicId === budget.publicId);
            if (matches) {
                const next =
                    idx >= 0 ? entry.items.map((item) => (item.publicId === budget.publicId ? budget : item)) : [budget, ...entry.items];
                setList(key, next, { totalCount: idx >= 0 ? entry.totalCount : entry.totalCount + 1 });
            } else if (idx >= 0) {
                const next = entry.items.filter((item) => item.publicId !== budget.publicId);
                setList(key, next, { totalCount: Math.max(0, entry.totalCount - 1) });
            }
        }
    }

    function removeItemLocal(publicId: string) {
        knownById.delete(publicId);
        for (const [key, entry] of [...itemsByListKey.entries()]) {
            if (!entry.items.some((item) => item.publicId === publicId)) continue;
            const next = entry.items.filter((item) => item.publicId !== publicId);
            setList(key, next, { totalCount: Math.max(0, entry.totalCount - 1) });
        }
    }

    function invalidateAllLists() {
        for (const key of [...itemsByListKey.keys()]) cache.invalidate(key);
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

    function notifyDeleted(publicId: string) {
        deletedListeners.forEach((listener) => listener(publicId));
    }

    function subscribeToDeleted(listener: (publicId: string) => void) {
        deletedListeners.add(listener);
        return () => {
            deletedListeners.delete(listener);
        };
    }

    function allKnownItems(): Budget[] {
        return [...knownById.values()];
    }

    function findByPublicId(publicId: string): Budget | null {
        const id = publicId.trim();
        if (!id) return null;
        return knownById.get(id) ?? items.value.find((item) => item.publicId === id) ?? null;
    }

    return {
        items,
        itemsByListKey,
        knownById,
        activeListKey,
        totalCount,
        loading,
        acting,
        initialized,
        error,
        cache,
        hasItems,
        activeQuery,
        beginActing,
        endActing,
        resetActing,
        clearError,
        setList,
        activateList,
        upsertItem,
        removeItemLocal,
        invalidateAllLists,
        rememberLocalMutation,
        consumeLocalMutation,
        clearRecentMutations,
        notifyDeleted,
        subscribeToDeleted,
        deletedListeners,
        allKnownItems,
        findByPublicId
    };
}

export type BudgetsState = ReturnType<typeof createBudgetsState>;
