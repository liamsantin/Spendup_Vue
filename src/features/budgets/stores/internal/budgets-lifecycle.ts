import { listCacheKey, type BudgetsState } from '@/features/budgets/stores/internal/budgets-state';
import type { BudgetsCrud } from '@/features/budgets/stores/internal/budgets-crud';
import type { BudgetsRealtime } from '@/features/budgets/stores/internal/budgets-realtime';
import type { ListBudgetsQuery } from '@/features/budgets/types';

type LifecycleDeps = Pick<BudgetsCrud, 'loadList' | 'cancelPendingLoads'> &
    Pick<BudgetsRealtime, 'ensureRealtimeBridge' | 'teardownRealtimeBridge'>;

export function createBudgetsLifecycle(state: BudgetsState, deps: LifecycleDeps) {
    const { items, itemsByListKey, knownById, loading, initialized, error, cache, resetActing, activateList, clearRecentMutations } = state;
    const { loadList, cancelPendingLoads, ensureRealtimeBridge, teardownRealtimeBridge } = deps;

    async function bootstrap(query: ListBudgetsQuery = {}) {
        ensureRealtimeBridge();
        await loadList(query);
        initialized.value = true;
    }

    function reset() {
        cancelPendingLoads();
        cache.reset();
        itemsByListKey.clear();
        knownById.clear();
        activateList(listCacheKey({ isActive: null, periode: null, categoryPublicId: null }));
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

export type BudgetsLifecycle = ReturnType<typeof createBudgetsLifecycle>;
