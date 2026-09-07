import { KEY_TREE, type CategoriesState } from '@/features/categories/stores/internal/categories-state';
import type { CategoriesCrud } from '@/features/categories/stores/internal/categories-crud';
import type { CategoriesRealtime } from '@/features/categories/stores/internal/categories-realtime';
import type { ListCategoriesQuery } from '@/features/categories/types';

type LifecycleDeps = Pick<CategoriesCrud, 'loadList' | 'cancelPendingLoads'> &
    Pick<CategoriesRealtime, 'ensureRealtimeBridge' | 'teardownRealtimeBridge'>;

export function createCategoriesLifecycle(state: CategoriesState, deps: LifecycleDeps) {
    const { items, itemsByListKey, loading, initialized, error, cache, resetActing, activateList, clearRecentMutations } = state;
    const { loadList, cancelPendingLoads, ensureRealtimeBridge, teardownRealtimeBridge } = deps;

    async function bootstrap(query: ListCategoriesQuery = {}) {
        ensureRealtimeBridge();
        await loadList(query);
        initialized.value = true;
    }

    function reset() {
        cancelPendingLoads();
        cache.reset();
        itemsByListKey.clear();
        activateList(KEY_TREE);
        items.value = [];
        loading.value = false;
        resetActing();
        initialized.value = false;
        error.value = null;
        state.totalCount.value = 0;
        clearRecentMutations();
        teardownRealtimeBridge();
    }

    return { bootstrap, reset };
}

export type CategoriesLifecycle = ReturnType<typeof createCategoriesLifecycle>;
