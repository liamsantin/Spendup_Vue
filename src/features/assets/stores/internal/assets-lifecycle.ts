import { listCacheKey, type AssetsState } from '@/features/assets/stores/internal/assets-state';
import type { AssetsCrud } from '@/features/assets/stores/internal/assets-crud';
import type { AssetsRealtime } from '@/features/assets/stores/internal/assets-realtime';
import type { ListAssetsQuery } from '@/features/assets/types';

type LifecycleDeps = Pick<AssetsCrud, 'loadList' | 'cancelPendingLoads'> &
    Pick<AssetsRealtime, 'ensureRealtimeBridge' | 'teardownRealtimeBridge'>;

export function createAssetsLifecycle(state: AssetsState, deps: LifecycleDeps) {
    const {
        items,
        itemsByListKey,
        knownById,
        valuationsById,
        mileagesById,
        maintenancesById,
        loading,
        loadingValuations,
        loadingVehicle,
        initialized,
        error,
        cache,
        resetActing,
        activateList,
        clearRecentMutations
    } = state;
    const { loadList, cancelPendingLoads, ensureRealtimeBridge, teardownRealtimeBridge } = deps;

    async function bootstrap(query: ListAssetsQuery = {}) {
        ensureRealtimeBridge();
        await loadList(query);
        initialized.value = true;
    }

    function reset() {
        cancelPendingLoads();
        cache.reset();
        itemsByListKey.clear();
        knownById.clear();
        valuationsById.clear();
        mileagesById.clear();
        maintenancesById.clear();
        activateList(listCacheKey({ type: null, active: null }));
        items.value = [];
        loading.value = false;
        loadingValuations.value = false;
        loadingVehicle.value = false;
        resetActing();
        initialized.value = false;
        error.value = null;
        state.totalCount.value = 0;
        clearRecentMutations();
        state.deletedListeners.clear();
        teardownRealtimeBridge();
    }

    return { bootstrap, reset };
}

export type AssetsLifecycle = ReturnType<typeof createAssetsLifecycle>;
