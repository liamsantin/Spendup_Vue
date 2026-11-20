import { listCacheKey, type SharedDebtsState } from '@/features/shared-debts/stores/internal/shared-debts-state';
import type { SharedDebtsCrud } from '@/features/shared-debts/stores/internal/shared-debts-crud';
import type { SharedDebtsRealtime } from '@/features/shared-debts/stores/internal/shared-debts-realtime';
import { SHARED_DEBT_DEFAULT_ROLE, type ListSharedDebtsQuery } from '@/features/shared-debts/types';

type LifecycleDeps = Pick<SharedDebtsCrud, 'loadList' | 'cancelPendingLoads'> &
    Pick<SharedDebtsRealtime, 'ensureRealtimeBridge' | 'teardownRealtimeBridge'>;

export function createSharedDebtsLifecycle(state: SharedDebtsState, deps: LifecycleDeps) {
    const { itemsByListKey, knownById, loading, initialized, error, cache, resetActing, activateList, clearRecentMutations } = state;
    const { loadList, cancelPendingLoads, ensureRealtimeBridge, teardownRealtimeBridge } = deps;

    async function bootstrap(query: ListSharedDebtsQuery = {}) {
        ensureRealtimeBridge();
        await loadList(query);
        initialized.value = true;
    }

    function reset() {
        cancelPendingLoads();
        cache.reset();
        itemsByListKey.clear();
        knownById.clear();
        activateList(listCacheKey({ role: SHARED_DEBT_DEFAULT_ROLE, status: null }));
        state.expenseCandidates.value = [];
        loading.value = false;
        resetActing();
        initialized.value = false;
        error.value = null;
        clearRecentMutations();
        state.deletedListeners.clear();
        teardownRealtimeBridge();
    }

    return { bootstrap, reset };
}

export type SharedDebtsLifecycle = ReturnType<typeof createSharedDebtsLifecycle>;
