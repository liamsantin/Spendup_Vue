import { EMPTY_LIST_FILTER, type ImportsState } from '@/features/imports/stores/internal/imports-state';
import type { ImportsCrud } from '@/features/imports/stores/internal/imports-crud';
import type { ImportsRealtime } from '@/features/imports/stores/internal/imports-realtime';
import type { ImportsTemplates } from '@/features/imports/stores/internal/imports-templates';

type LifecycleDeps = Pick<ImportsCrud, 'loadList' | 'cancelPendingLoads' | 'closeImport'> &
    Pick<ImportsTemplates, 'cancelPendingTemplates'> &
    Pick<ImportsRealtime, 'ensureRealtimeBridge' | 'teardownRealtimeBridge'>;

export function createImportsLifecycle(state: ImportsState, deps: LifecycleDeps) {
    const { items, totalCount, page, listFilter, initialized, templates, templatesLoaded, error, resetActing, clearRecentMutations } =
        state;
    const { loadList, cancelPendingLoads, closeImport, cancelPendingTemplates, ensureRealtimeBridge, teardownRealtimeBridge } = deps;

    async function bootstrap() {
        ensureRealtimeBridge();
        await loadList();
    }

    function reset() {
        cancelPendingLoads();
        cancelPendingTemplates();
        closeImport();
        items.value = [];
        totalCount.value = 0;
        page.value = 1;
        listFilter.value = { ...EMPTY_LIST_FILTER };
        initialized.value = false;
        templates.value = [];
        templatesLoaded.value = false;
        error.value = null;
        resetActing();
        clearRecentMutations();
        teardownRealtimeBridge();
    }

    return { bootstrap, reset };
}

export type ImportsLifecycle = ReturnType<typeof createImportsLifecycle>;
