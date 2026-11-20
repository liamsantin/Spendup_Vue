import { computed, reactive, ref } from 'vue';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import { queryMatchesAsset } from '@/features/assets/format';
import type { Asset, AssetType, AssetValuation, ListAssetsQuery, VehicleMaintenance, VehicleMileage } from '@/features/assets/types';

export const ASSETS_LIST_MAX_AGE_MS = 30_000;

export type AssetsListQuery = {
    type: AssetType | null;
    active: boolean | null;
};

export function listCacheKey(query: AssetsListQuery): string {
    const active = query.active == null ? 'all' : query.active ? 'active' : 'sold';
    return `list:${query.type ?? 'all'}:${active}`;
}

export function listQueryFromKey(key: string): AssetsListQuery {
    const [, type, active] = key.split(':');
    return {
        type: type && type !== 'all' ? (type as AssetType) : null,
        active: active === 'active' ? true : active === 'sold' ? false : null
    };
}

export type AssetsCacheEntry = {
    items: Asset[];
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

export function createAssetsState() {
    const items = ref<Asset[]>([]);
    const itemsByListKey = new Map<string, AssetsCacheEntry>();
    // `knownById` est une Map non suivie par Vue : `knownVersion` est la dépendance réactive
    // lue par `findByPublicId` / `allKnownItems` (fiche actif, sélecteurs d’autres features…).
    const knownVersion = ref(0);
    const knownById = createTrackedMap<string, Asset>(() => {
        knownVersion.value += 1;
    });
    const activeListKey = ref(listCacheKey({ type: null, active: null }));
    const totalCount = ref(0);

    const loading = ref(false);
    const acting = ref(false);
    let actingDepth = 0;
    const initialized = ref(false);
    const error = ref<string | null>(null);

    /* sous-listes par actif (réactives : lues par les panneaux de la fiche) */
    const valuationsById = reactive(new Map<string, AssetValuation[]>());
    const mileagesById = reactive(new Map<string, VehicleMileage[]>());
    const maintenancesById = reactive(new Map<string, VehicleMaintenance[]>());
    const loadingValuations = ref(false);
    const loadingVehicle = ref(false);

    const cache = createResourceCache({ defaultMaxAgeMs: ASSETS_LIST_MAX_AGE_MS });
    const recentMutations = new Map<string, ReturnType<typeof setTimeout>>();
    const deletedListeners = new Set<(publicId: string) => void>();

    const hasItems = computed(() => items.value.length > 0);
    const activeQuery = computed<AssetsListQuery>(() => listQueryFromKey(activeListKey.value));

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

    /** Conserve `realEstate.summary` connu quand une liste (summary `null`) écrase un détail. */
    function rememberKnown(asset: Asset, options?: { replaceSummary?: boolean }): Asset {
        const existing = knownById.get(asset.publicId);
        let merged = asset;
        if (asset.realEstate && !asset.realEstate.summary && !options?.replaceSummary && existing?.realEstate?.summary) {
            merged = { ...asset, realEstate: { details: asset.realEstate.details, summary: existing.realEstate.summary } };
        }
        knownById.set(merged.publicId, merged);
        return merged;
    }

    function setList(key: string, nextItems: Asset[], meta?: { totalCount?: number }) {
        const prev = itemsByListKey.get(key);
        const mergedItems = nextItems.map((item) => rememberKnown(item));
        const entry: AssetsCacheEntry = {
            items: mergedItems,
            totalCount: meta?.totalCount ?? prev?.totalCount ?? mergedItems.length
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

    function upsertItem(asset: Asset, options?: { replaceSummary?: boolean }) {
        const merged = rememberKnown(asset, options);
        for (const [key, entry] of [...itemsByListKey.entries()]) {
            const parsed = listQueryFromKey(key);
            const query: ListAssetsQuery = { type: parsed.type ?? undefined, active: parsed.active ?? undefined };
            const matches = queryMatchesAsset(query, merged);
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
        valuationsById.delete(publicId);
        mileagesById.delete(publicId);
        maintenancesById.delete(publicId);
        cache.invalidate(`valuations:${publicId}`);
        cache.invalidate(`mileages:${publicId}`);
        cache.invalidate(`maintenances:${publicId}`);
        for (const [key, entry] of [...itemsByListKey.entries()]) {
            if (!entry.items.some((item) => item.publicId === publicId)) continue;
            const next = entry.items.filter((item) => item.publicId !== publicId);
            setList(key, next, { totalCount: Math.max(0, entry.totalCount - 1) });
        }
    }

    function invalidateAllLists() {
        for (const key of [...itemsByListKey.keys()]) cache.invalidate(key);
    }

    /** Les sous-listes d’un actif ne sont plus fraîches (événement externe). */
    function invalidateSubLists(publicId: string) {
        cache.invalidate(`valuations:${publicId}`);
        cache.invalidate(`mileages:${publicId}`);
        cache.invalidate(`maintenances:${publicId}`);
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

    function allKnownItems(): Asset[] {
        void knownVersion.value;
        return [...knownById.values()];
    }

    function findByPublicId(publicId: string): Asset | null {
        void knownVersion.value;
        const id = publicId.trim();
        if (!id) return null;
        return knownById.get(id) ?? items.value.find((item) => item.publicId === id) ?? null;
    }

    function valuationsFor(publicId: string): AssetValuation[] {
        return valuationsById.get(publicId.trim()) ?? [];
    }

    function mileagesFor(publicId: string): VehicleMileage[] {
        return mileagesById.get(publicId.trim()) ?? [];
    }

    function maintenancesFor(publicId: string): VehicleMaintenance[] {
        return maintenancesById.get(publicId.trim()) ?? [];
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
        valuationsById,
        mileagesById,
        maintenancesById,
        loadingValuations,
        loadingVehicle,
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
        invalidateSubLists,
        rememberLocalMutation,
        consumeLocalMutation,
        clearRecentMutations,
        notifyDeleted,
        subscribeToDeleted,
        deletedListeners,
        allKnownItems,
        findByPublicId,
        valuationsFor,
        mileagesFor,
        maintenancesFor
    };
}

export type AssetsState = ReturnType<typeof createAssetsState>;
