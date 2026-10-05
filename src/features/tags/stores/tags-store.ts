import { defineStore } from 'pinia';
import { AppError } from '@/utils/errors/app-error';
import {
    createTagsState,
    createTagsCrud,
    createTagsRealtime,
    createTagsLifecycle,
    TAGS_LIST_MAX_AGE_MS
} from '@/features/tags/stores/internal';

export { TAGS_LIST_MAX_AGE_MS };

export const useTagsStore = defineStore('tags', () => {
    const state = createTagsState();
    const crud = createTagsCrud(state);
    const realtime = createTagsRealtime(state, {
        refetchList: crud.refetchList
    });
    const lifecycle = createTagsLifecycle(state, {
        loadList: crud.loadList,
        cancelPendingLoads: crud.cancelPendingLoads,
        ensureRealtimeBridge: realtime.ensureRealtimeBridge,
        teardownRealtimeBridge: realtime.teardownRealtimeBridge
    });

    function toAppError(e: unknown): AppError {
        return AppError.fromUnknown(e);
    }

    return {
        items: state.items,
        totalCount: state.totalCount,
        loading: state.loading,
        acting: state.acting,
        initialized: state.initialized,
        error: state.error,
        hasItems: state.hasItems,
        allKnownItems: state.allKnownItems,
        findByPublicId: state.findByPublicId,
        searchLocal: state.searchLocal,
        subscribeToDeleted: state.subscribeToDeleted,
        clearError: state.clearError,
        loadList: crud.loadList,
        createTag: crud.createTag,
        updateTag: crud.updateTag,
        deleteTag: crud.deleteTag,
        refetchList: crud.refetchList,
        onAuthenticatedSession: realtime.onAuthenticatedSession,
        bootstrap: lifecycle.bootstrap,
        reset: lifecycle.reset,
        toAppError
    };
});

/** Compteurs d’usage : refetch si la page Gestion (ou un sélecteur) a déjà chargé la liste. */
export function refreshTagCountersIfLoaded() {
    const store = useTagsStore();
    if (store.initialized) void store.refetchList();
}
