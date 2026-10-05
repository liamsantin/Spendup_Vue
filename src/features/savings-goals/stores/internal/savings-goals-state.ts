import { computed, ref } from 'vue';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import { queryMatchesSavingsGoal } from '@/features/savings-goals/format';
import type { ListSavingsGoalsQuery, SavingsGoal, SavingsGoalStatus } from '@/features/savings-goals/types';

export const SAVINGS_GOALS_LIST_MAX_AGE_MS = 30_000;

export type SavingsGoalsListQuery = {
    status: SavingsGoalStatus | null;
    accountPublicId: string | null;
};

export function listCacheKey(query: SavingsGoalsListQuery): string {
    return `list:${query.status ?? 'all'}:${query.accountPublicId ?? 'all'}`;
}

export type SavingsGoalsCacheEntry = {
    items: SavingsGoal[];
    totalCount: number;
};

/**
 * Map dont chaque écriture (`set` / `delete` / `clear`) appelle `onChange` :
 * permet de bumper un compteur réactif sans rendre la Map elle-même réactive.
 */
function createTrackedMap<K, V>(onChange: () => void): Map<K, V> {
    const map = new Map<K, V>();
    const rawSet = map.set.bind(map);
    const rawDelete = map.delete.bind(map);
    const rawClear = map.clear.bind(map);
    map.set = (key: K, value: V) => {
        rawSet(key, value);
        onChange();
        return map;
    };
    map.delete = (key: K) => {
        const removed = rawDelete(key);
        if (removed) onChange();
        return removed;
    };
    map.clear = () => {
        if (map.size === 0) return;
        rawClear();
        onChange();
    };
    return map;
}

export function createSavingsGoalsState() {
    const items = ref<SavingsGoal[]>([]);
    const itemsByListKey = new Map<string, SavingsGoalsCacheEntry>();
    // `knownById` est une Map non suivie par Vue : `knownVersion` est la dépendance réactive
    // lue par `findByPublicId` / `allKnownItems` (formulaire d’objectif, sélecteur de transaction…).
    const knownVersion = ref(0);
    const knownById = createTrackedMap<string, SavingsGoal>(() => {
        knownVersion.value += 1;
    });
    const activeListKey = ref(listCacheKey({ status: null, accountPublicId: null }));
    const totalCount = ref(0);

    const loading = ref(false);
    const acting = ref(false);
    let actingDepth = 0;
    const initialized = ref(false);
    const error = ref<string | null>(null);

    const cache = createResourceCache({ defaultMaxAgeMs: SAVINGS_GOALS_LIST_MAX_AGE_MS });
    const recentMutations = new Map<string, ReturnType<typeof setTimeout>>();
    const deletedListeners = new Set<(publicId: string) => void>();

    const hasItems = computed(() => items.value.length > 0);
    const activeQuery = computed<SavingsGoalsListQuery>(() => {
        const [, status, ...rest] = activeListKey.value.split(':');
        const accountPublicId = rest.join(':');
        return {
            status: status && status !== 'all' ? (status as SavingsGoalStatus) : null,
            accountPublicId: !accountPublicId || accountPublicId === 'all' ? null : accountPublicId
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

    function rememberKnown(goal: SavingsGoal, options?: { replaceContributions?: boolean }): SavingsGoal {
        const existing = knownById.get(goal.publicId);
        const incoming = Array.isArray(goal.contributions) ? goal.contributions : [];
        const contributions = options?.replaceContributions || incoming.length > 0 || !existing ? incoming : (existing.contributions ?? []);
        const merged: SavingsGoal = { ...goal, contributions };
        knownById.set(goal.publicId, merged);
        return merged;
    }

    function setList(key: string, nextItems: SavingsGoal[], meta?: { totalCount?: number }) {
        const prev = itemsByListKey.get(key);
        const mergedItems = nextItems.map((item) => rememberKnown(item));
        const entry: SavingsGoalsCacheEntry = {
            items: mergedItems,
            totalCount: meta?.totalCount ?? prev?.totalCount ?? mergedItems.length
        };
        itemsByListKey.set(key, entry);
        for (const item of mergedItems) knownById.set(item.publicId, item);
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

    function upsertItem(goal: SavingsGoal, options?: { replaceContributions?: boolean }) {
        const merged = rememberKnown(goal, options);
        for (const [key, entry] of [...itemsByListKey.entries()]) {
            const parts = key.split(':');
            const query: ListSavingsGoalsQuery = {
                status: parts[1] && parts[1] !== 'all' ? (parts[1] as SavingsGoalStatus) : undefined,
                accountPublicId: parts.slice(2).join(':') === 'all' ? undefined : parts.slice(2).join(':') || undefined
            };
            const matches = queryMatchesSavingsGoal(query, merged);
            const idx = entry.items.findIndex((item) => item.publicId === merged.publicId);
            if (matches) {
                const next =
                    idx >= 0 ? entry.items.map((item) => (item.publicId === merged.publicId ? merged : item)) : [merged, ...entry.items];
                setList(key, next, { totalCount: idx >= 0 ? entry.totalCount : entry.totalCount + 1 });
            } else if (idx >= 0) {
                const next = entry.items.filter((item) => item.publicId !== merged.publicId);
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

    function allKnownItems(): SavingsGoal[] {
        void knownVersion.value;
        return [...knownById.values()];
    }

    function findByPublicId(publicId: string): SavingsGoal | null {
        void knownVersion.value;
        const id = publicId.trim();
        if (!id) return null;
        // `knownById` est toujours la version la plus fraîche (mise à jour par `upsertItem` même
        // quand l’objectif ne correspond plus à la liste active) ; `items` ne sert que de repli.
        return knownById.get(id) ?? items.value.find((item) => item.publicId === id) ?? null;
    }

    function itemsForAccount(accountPublicId: string): SavingsGoal[] {
        const id = accountPublicId.trim();
        if (!id) return [];
        return allKnownItems().filter((item) => item.accountPublicId === id);
    }

    return {
        items,
        itemsByListKey,
        knownById,
        knownVersion,
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
        findByPublicId,
        itemsForAccount
    };
}

export type SavingsGoalsState = ReturnType<typeof createSavingsGoalsState>;
