import { FILE_PAGE_SIZE_DEFAULT } from '@/features/files/types';
import { FILES_LIST_CACHE_KEY, type FilesState } from '@/features/files/stores/internal/files-state';
import type { FilesCrud } from '@/features/files/stores/internal/files-crud';

type LifecycleDeps = Pick<FilesCrud, 'loadList' | 'cancelPendingLoads'>;

export function createFilesLifecycle(state: FilesState, deps: LifecycleDeps) {
    const { items, itemsByListKey, knownById, loading, loadingMore, initialized, error, cache, resetActing, activateList } = state;
    const { loadList, cancelPendingLoads } = deps;

    async function bootstrap() {
        await loadList();
        initialized.value = true;
    }

    function reset() {
        cancelPendingLoads();
        cache.reset();
        itemsByListKey.clear();
        knownById.clear();
        activateList(FILES_LIST_CACHE_KEY);
        items.value = [];
        loading.value = false;
        loadingMore.value = false;
        resetActing();
        initialized.value = false;
        error.value = null;
        state.usage.value = null;
        state.page.value = 1;
        state.pageSize.value = FILE_PAGE_SIZE_DEFAULT;
        state.totalCount.value = 0;
    }

    return { bootstrap, reset };
}

export type FilesLifecycle = ReturnType<typeof createFilesLifecycle>;
