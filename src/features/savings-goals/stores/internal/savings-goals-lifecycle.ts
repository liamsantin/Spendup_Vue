import { listCacheKey, type SavingsGoalsState } from '@/features/savings-goals/stores/internal/savings-goals-state';
import type { SavingsGoalsCrud } from '@/features/savings-goals/stores/internal/savings-goals-crud';
import type { SavingsGoalsRealtime } from '@/features/savings-goals/stores/internal/savings-goals-realtime';
import type { ListSavingsGoalsQuery } from '@/features/savings-goals/types';

type LifecycleDeps = Pick<SavingsGoalsCrud, 'loadList' | 'cancelPendingLoads'> &
    Pick<SavingsGoalsRealtime, 'ensureRealtimeBridge' | 'teardownRealtimeBridge'>;

export function createSavingsGoalsLifecycle(state: SavingsGoalsState, deps: LifecycleDeps) {
    const { items, itemsByListKey, knownById, loading, initialized, error, cache, resetActing, activateList, clearRecentMutations } = state;
    const { loadList, cancelPendingLoads, ensureRealtimeBridge, teardownRealtimeBridge } = deps;

    async function bootstrap(query: ListSavingsGoalsQuery = {}) {
        ensureRealtimeBridge();
        await loadList(query);
        initialized.value = true;
    }

    function reset() {
        cancelPendingLoads();
        cache.reset();
        itemsByListKey.clear();
        knownById.clear();
        activateList(listCacheKey({ status: null, accountPublicId: null }));
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

export type SavingsGoalsLifecycle = ReturnType<typeof createSavingsGoalsLifecycle>;
