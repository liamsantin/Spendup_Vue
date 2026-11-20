import { listCacheKey, type LiabilitiesState } from '@/features/liabilities/stores/internal/liabilities-state';
import type { LiabilitiesCrud } from '@/features/liabilities/stores/internal/liabilities-crud';
import type { LiabilitiesRealtime } from '@/features/liabilities/stores/internal/liabilities-realtime';
import type { ListLiabilitiesQuery } from '@/features/liabilities/types';

type LifecycleDeps = Pick<LiabilitiesCrud, 'loadList' | 'cancelPendingLoads'> &
    Pick<LiabilitiesRealtime, 'ensureRealtimeBridge' | 'teardownRealtimeBridge'>;

export function createLiabilitiesLifecycle(state: LiabilitiesState, deps: LifecycleDeps) {
    const { items, itemsByListKey, knownById, loading, initialized, error, cache, resetActing, activateList, clearRecentMutations } = state;
    const { loadList, cancelPendingLoads, ensureRealtimeBridge, teardownRealtimeBridge } = deps;

    async function bootstrap(query: ListLiabilitiesQuery = {}) {
        ensureRealtimeBridge();
        await loadList(query);
        initialized.value = true;
    }

    function reset() {
        cancelPendingLoads();
        cache.reset();
        itemsByListKey.clear();
        knownById.clear();
        activateList(listCacheKey({ type: null, status: null }));
        items.value = [];
        loading.value = false;
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

export type LiabilitiesLifecycle = ReturnType<typeof createLiabilitiesLifecycle>;
