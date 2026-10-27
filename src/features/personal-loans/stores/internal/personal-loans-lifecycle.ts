import { listCacheKey, type PersonalLoansState } from '@/features/personal-loans/stores/internal/personal-loans-state';
import type { PersonalLoansCrud } from '@/features/personal-loans/stores/internal/personal-loans-crud';
import type { PersonalLoansRealtime } from '@/features/personal-loans/stores/internal/personal-loans-realtime';
import type { ListPersonalLoansQuery } from '@/features/personal-loans/types';

type LifecycleDeps = Pick<PersonalLoansCrud, 'loadList' | 'cancelPendingLoads'> &
    Pick<PersonalLoansRealtime, 'ensureRealtimeBridge' | 'teardownRealtimeBridge'>;

export function createPersonalLoansLifecycle(state: PersonalLoansState, deps: LifecycleDeps) {
    const { itemsByListKey, knownById, loading, initialized, error, cache, resetActing, activateList, clearRecentMutations } = state;
    const { loadList, cancelPendingLoads, ensureRealtimeBridge, teardownRealtimeBridge } = deps;

    async function bootstrap(query: ListPersonalLoansQuery = {}) {
        ensureRealtimeBridge();
        await loadList(query);
        initialized.value = true;
    }

    function reset() {
        cancelPendingLoads();
        cache.reset();
        itemsByListKey.clear();
        knownById.clear();
        activateList(listCacheKey({ status: null, direction: null }));
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

export type PersonalLoansLifecycle = ReturnType<typeof createPersonalLoansLifecycle>;
