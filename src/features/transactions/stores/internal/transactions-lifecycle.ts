import { listCacheKey, type TransactionsState } from '@/features/transactions/stores/internal/transactions-state';
import type { TransactionsCrud } from '@/features/transactions/stores/internal/transactions-crud';
import type { TransactionsRealtime } from '@/features/transactions/stores/internal/transactions-realtime';
import { TRANSACTION_PAGE_SIZE_DEFAULT, type ListTransactionsQuery } from '@/features/transactions/types';

type LifecycleDeps = Pick<TransactionsCrud, 'loadList' | 'cancelPendingLoads'> &
    Pick<TransactionsRealtime, 'ensureRealtimeBridge' | 'teardownRealtimeBridge'>;

export function createTransactionsLifecycle(state: TransactionsState, deps: LifecycleDeps) {
    const { items, itemsByListKey, loading, loadingMore, initialized, error, cache, resetActing, activateList } = state;
    const { loadList, cancelPendingLoads, ensureRealtimeBridge, teardownRealtimeBridge } = deps;

    async function bootstrap(query: ListTransactionsQuery = {}) {
        ensureRealtimeBridge();
        await loadList(query);
        initialized.value = true;
    }

    function reset() {
        cancelPendingLoads();
        cache.reset();
        itemsByListKey.clear();
        activateList(listCacheKey({ accountPublicId: null, from: null, to: null }));
        items.value = [];
        loading.value = false;
        loadingMore.value = false;
        resetActing();
        initialized.value = false;
        error.value = null;
        state.page.value = 1;
        state.pageSize.value = TRANSACTION_PAGE_SIZE_DEFAULT;
        state.totalCount.value = 0;
        teardownRealtimeBridge();
    }

    return { bootstrap, reset };
}

export type TransactionsLifecycle = ReturnType<typeof createTransactionsLifecycle>;
