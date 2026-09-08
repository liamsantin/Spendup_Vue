import { listCacheKey, type TiersState } from '@/features/tiers/stores/internal/tiers-state';
import type { TiersCrud } from '@/features/tiers/stores/internal/tiers-crud';
import type { TiersRealtime } from '@/features/tiers/stores/internal/tiers-realtime';
import { TIER_PAGE_SIZE_DEFAULT, type ListTiersQuery } from '@/features/tiers/types';

type LifecycleDeps = Pick<TiersCrud, 'loadList' | 'cancelPendingLoads'> &
    Pick<TiersRealtime, 'ensureRealtimeBridge' | 'teardownRealtimeBridge'>;

export function createTiersLifecycle(state: TiersState, deps: LifecycleDeps) {
    const {
        items,
        itemsByListKey,
        knownById,
        loading,
        loadingMore,
        initialized,
        error,
        cache,
        resetActing,
        activateList,
        clearRecentMutations
    } = state;
    const { loadList, cancelPendingLoads, ensureRealtimeBridge, teardownRealtimeBridge } = deps;

    async function bootstrap(query: ListTiersQuery = {}) {
        ensureRealtimeBridge();
        await loadList(query);
        initialized.value = true;
    }

    function reset() {
        cancelPendingLoads();
        cache.reset();
        itemsByListKey.clear();
        knownById.clear();
        activateList(listCacheKey({ nature: null, role: null, search: null }));
        items.value = [];
        loading.value = false;
        loadingMore.value = false;
        resetActing();
        initialized.value = false;
        error.value = null;
        state.page.value = 1;
        state.pageSize.value = TIER_PAGE_SIZE_DEFAULT;
        state.totalCount.value = 0;
        clearRecentMutations();
        state.deletedListeners.clear();
        teardownRealtimeBridge();
    }

    return { bootstrap, reset };
}

export type TiersLifecycle = ReturnType<typeof createTiersLifecycle>;
