import { computed, ref } from 'vue';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import { isTierNature, isTierRole, matchesTierSearch, sortTiers } from '@/features/tiers/format';
import {
    TIER_PAGE_SIZE_DEFAULT,
    TIER_SEARCH_MAX,
    type ListTiersQuery,
    type Tier,
    type TierNature,
    type TierRole
} from '@/features/tiers/types';

export const TIERS_LIST_MAX_AGE_MS = 30_000;

export type TiersListQuery = {
    nature: TierNature | null;
    role: TierRole | null;
    /** Recherche normalisée (trim, minuscules, tronquée à 100). */
    search: string | null;
};

export function normalizeListQuery(query: ListTiersQuery = {}): TiersListQuery {
    const search = query.search?.trim().slice(0, TIER_SEARCH_MAX).toLowerCase() || null;
    return {
        nature: isTierNature(query.nature) ? query.nature : null,
        role: isTierRole(query.role) ? query.role : null,
        search
    };
}

export function listCacheKey(query: TiersListQuery): string {
    return `list:${query.nature ?? 'all'}:${query.role ?? 'all'}:${query.search ?? ''}`;
}

export function parseListCacheKey(key: string): TiersListQuery {
    const [, nature, role, ...rest] = key.split(':');
    const search = rest.join(':');
    return {
        nature: !nature || nature === 'all' ? null : (nature as TierNature),
        role: !role || role === 'all' ? null : (role as TierRole),
        search: search ? search : null
    };
}

export type TiersCacheEntry = {
    items: Tier[];
    page: number;
    pageSize: number;
    totalCount: number;
};

function queryMatchesTier(query: TiersListQuery, tier: Tier): boolean {
    if (query.nature && tier.nature !== query.nature) return false;
    if (query.role && !tier.roles.includes(query.role)) return false;
    if (query.search && !matchesTierSearch(tier, query.search)) return false;
    return true;
}

/**
 * État partagé du store tiers (listes paginées par filtre + index par publicId).
 */
export function createTiersState() {
    const items = ref<Tier[]>([]);
    const itemsByListKey = new Map<string, TiersCacheEntry>();
    const knownById = new Map<string, Tier>();
    const activeListKey = ref(listCacheKey({ nature: null, role: null, search: null }));
    const page = ref(1);
    const pageSize = ref(TIER_PAGE_SIZE_DEFAULT);
    const totalCount = ref(0);

    const loading = ref(false);
    const loadingMore = ref(false);
    const acting = ref(false);
    let actingDepth = 0;
    const initialized = ref(false);
    const error = ref<string | null>(null);

    const cache = createResourceCache({ defaultMaxAgeMs: TIERS_LIST_MAX_AGE_MS });
    const recentMutations = new Map<string, ReturnType<typeof setTimeout>>();
    const deletedListeners = new Set<(publicId: string) => void>();

    const hasItems = computed(() => items.value.length > 0);
    const hasMore = computed(() => items.value.length > 0 && items.value.length < totalCount.value);
    const activeQuery = computed(() => parseListCacheKey(activeListKey.value));

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

    function remember(tier: Tier) {
        knownById.set(tier.publicId, tier);
    }

    function setList(key: string, nextItems: Tier[], meta?: { page?: number; pageSize?: number; totalCount?: number }) {
        const sorted = sortTiers(nextItems);
        for (const tier of sorted) remember(tier);
        const prev = itemsByListKey.get(key);
        const entry: TiersCacheEntry = {
            items: sorted,
            page: meta?.page ?? prev?.page ?? 1,
            pageSize: meta?.pageSize ?? prev?.pageSize ?? TIER_PAGE_SIZE_DEFAULT,
            totalCount: meta?.totalCount ?? prev?.totalCount ?? sorted.length
        };
        itemsByListKey.set(key, entry);
        if (activeListKey.value === key) {
            items.value = entry.items;
            page.value = entry.page;
            pageSize.value = entry.pageSize;
            totalCount.value = entry.totalCount;
        }
    }

    function activateList(key: string) {
        activeListKey.value = key;
        const entry = itemsByListKey.get(key);
        if (entry) {
            items.value = entry.items;
            page.value = entry.page;
            pageSize.value = entry.pageSize;
            totalCount.value = entry.totalCount;
            return;
        }
        items.value = [];
        page.value = 1;
        pageSize.value = TIER_PAGE_SIZE_DEFAULT;
        totalCount.value = 0;
    }

    function upsertItem(tier: Tier) {
        remember(tier);
        for (const key of [...itemsByListKey.keys()]) {
            const prev = itemsByListKey.get(key);
            if (!prev) continue;
            const query = parseListCacheKey(key);
            const existed = prev.items.some((item) => item.publicId === tier.publicId);
            const matches = queryMatchesTier(query, tier);
            if (!existed && !matches) continue;
            if (existed && !matches) {
                setList(
                    key,
                    prev.items.filter((item) => item.publicId !== tier.publicId),
                    { totalCount: Math.max(0, prev.totalCount - 1) }
                );
                continue;
            }
            const without = prev.items.filter((item) => item.publicId !== tier.publicId);
            const nextTotal = existed ? prev.totalCount : prev.totalCount + 1;
            setList(key, [...without, tier], { totalCount: nextTotal });
        }
    }

    function removeItemLocal(publicId: string) {
        knownById.delete(publicId);
        for (const key of [...itemsByListKey.keys()]) {
            const prev = itemsByListKey.get(key);
            if (!prev) continue;
            const nextItems = prev.items.filter((item) => item.publicId !== publicId);
            if (nextItems.length === prev.items.length) continue;
            setList(key, nextItems, { totalCount: Math.max(0, prev.totalCount - 1) });
        }
    }

    function invalidateAllLists() {
        for (const key of [...itemsByListKey.keys()]) {
            cache.invalidate(key);
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

    function notifyDeleted(publicId: string) {
        deletedListeners.forEach((listener) => listener(publicId));
    }

    /**
     * Abonne un listener aux suppressions (locales ou realtime) — ex. vider un sélecteur de transaction.
     * @returns Fonction de désabonnement.
     */
    function subscribeToDeleted(listener: (publicId: string) => void) {
        deletedListeners.add(listener);
        return () => {
            deletedListeners.delete(listener);
        };
    }

    function allKnownItems(): Tier[] {
        return [...knownById.values()];
    }

    function findByPublicId(publicId: string): Tier | null {
        const id = publicId.trim();
        if (!id) return null;
        return knownById.get(id) ?? null;
    }

    return {
        items,
        itemsByListKey,
        knownById,
        activeListKey,
        page,
        pageSize,
        totalCount,
        loading,
        loadingMore,
        acting,
        initialized,
        error,
        cache,
        hasItems,
        hasMore,
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

export type TiersState = ReturnType<typeof createTiersState>;
