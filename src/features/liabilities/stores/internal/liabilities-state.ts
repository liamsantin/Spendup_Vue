import { computed, ref } from 'vue';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import { queryMatchesLiability } from '@/features/liabilities/format';
import type { Liability, LiabilityStatus, LiabilityType, ListLiabilitiesQuery } from '@/features/liabilities/types';

export const LIABILITIES_LIST_MAX_AGE_MS = 30_000;

export type LiabilitiesListQuery = {
    type: LiabilityType | null;
    status: LiabilityStatus | null;
};

export function listCacheKey(query: LiabilitiesListQuery): string {
    return `list:${query.type ?? 'all'}:${query.status ?? 'all'}`;
}

function queryFromCacheKey(key: string): ListLiabilitiesQuery {
    const [, type, status] = key.split(':');
    return {
        type: type && type !== 'all' ? (type as LiabilityType) : undefined,
        status: status && status !== 'all' ? (status as LiabilityStatus) : undefined
    };
}

export type LiabilitiesCacheEntry = {
    items: Liability[];
    totalCount: number;
};

/** Map dont chaque écriture appelle `onChange` : bump d’un compteur réactif sans rendre la Map réactive. */
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

export function createLiabilitiesState() {
    const items = ref<Liability[]>([]);
    const itemsByListKey = new Map<string, LiabilitiesCacheEntry>();
    const knownVersion = ref(0);
    const knownById = createTrackedMap<string, Liability>(() => {
        knownVersion.value += 1;
    });
    const activeListKey = ref(listCacheKey({ type: null, status: null }));
    const totalCount = ref(0);

    const loading = ref(false);
    const acting = ref(false);
    let actingDepth = 0;
    const initialized = ref(false);
    const error = ref<string | null>(null);

    const cache = createResourceCache({ defaultMaxAgeMs: LIABILITIES_LIST_MAX_AGE_MS });
    const recentMutations = new Map<string, ReturnType<typeof setTimeout>>();
    const deletedListeners = new Set<(publicId: string) => void>();

    const hasItems = computed(() => items.value.length > 0);
    const activeQuery = computed<LiabilitiesListQuery>(() => {
        const q = queryFromCacheKey(activeListKey.value);
        return { type: q.type ?? null, status: q.status ?? null };
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

    function setList(key: string, nextItems: Liability[], meta?: { totalCount?: number }) {
        const prev = itemsByListKey.get(key);
        const entry: LiabilitiesCacheEntry = {
            items: nextItems,
            totalCount: meta?.totalCount ?? prev?.totalCount ?? nextItems.length
        };
        itemsByListKey.set(key, entry);
        for (const item of nextItems) knownById.set(item.publicId, item);
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

    /** Insère / remplace dans chaque liste hydratée selon sa query ; retire si elle ne correspond plus. */
    function upsertItem(liability: Liability) {
        knownById.set(liability.publicId, liability);
        for (const [key, entry] of [...itemsByListKey.entries()]) {
            const matches = queryMatchesLiability(queryFromCacheKey(key), liability);
            const idx = entry.items.findIndex((item) => item.publicId === liability.publicId);
            if (matches) {
                const next =
                    idx >= 0
                        ? entry.items.map((item) => (item.publicId === liability.publicId ? liability : item))
                        : [liability, ...entry.items];
                setList(key, next, { totalCount: idx >= 0 ? entry.totalCount : entry.totalCount + 1 });
            } else if (idx >= 0) {
                const next = entry.items.filter((item) => item.publicId !== liability.publicId);
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

    function allKnownItems(): Liability[] {
        void knownVersion.value;
        return [...knownById.values()];
    }

    function findByPublicId(publicId: string): Liability | null {
        void knownVersion.value;
        const id = publicId.trim();
        if (!id) return null;
        return knownById.get(id) ?? items.value.find((item) => item.publicId === id) ?? null;
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
        findByPublicId
    };
}

export type LiabilitiesState = ReturnType<typeof createLiabilitiesState>;
