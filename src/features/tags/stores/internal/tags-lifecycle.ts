import { KEY_LIST, type TagsState } from '@/features/tags/stores/internal/tags-state';
import type { TagsCrud } from '@/features/tags/stores/internal/tags-crud';
import type { TagsRealtime } from '@/features/tags/stores/internal/tags-realtime';

type LifecycleDeps = Pick<TagsCrud, 'loadList' | 'cancelPendingLoads'> &
    Pick<TagsRealtime, 'ensureRealtimeBridge' | 'teardownRealtimeBridge'>;

export function createTagsLifecycle(state: TagsState, deps: LifecycleDeps) {
    const { items, itemsByListKey, knownById, loading, initialized, error, cache, resetActing, activateList, clearRecentMutations } = state;
    const { loadList, cancelPendingLoads, ensureRealtimeBridge, teardownRealtimeBridge } = deps;

    async function bootstrap() {
        ensureRealtimeBridge();
        await loadList();
        initialized.value = true;
    }

    function reset() {
        cancelPendingLoads();
        cache.reset();
        itemsByListKey.clear();
        knownById.clear();
        activateList(KEY_LIST);
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

export type TagsLifecycle = ReturnType<typeof createTagsLifecycle>;
