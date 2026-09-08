import { defineStore } from 'pinia';
import { AppError } from '@/utils/errors/app-error';
import {
    createTiersState,
    createTiersCrud,
    createTiersRealtime,
    createTiersLifecycle,
    TIERS_LIST_MAX_AGE_MS
} from '@/features/tiers/stores/internal';

export { TIERS_LIST_MAX_AGE_MS };

export const useTiersStore = defineStore('tiers', () => {
    const state = createTiersState();
    const crud = createTiersCrud(state);
    const realtime = createTiersRealtime(state, {
        refetchActive: crud.refetchActive,
        fetchTier: crud.fetchTier
    });
    const lifecycle = createTiersLifecycle(state, {
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
        page: state.page,
        pageSize: state.pageSize,
        totalCount: state.totalCount,
        loading: state.loading,
        loadingMore: state.loadingMore,
        acting: state.acting,
        initialized: state.initialized,
        error: state.error,
        hasItems: state.hasItems,
        hasMore: state.hasMore,
        activeQuery: state.activeQuery,
        allKnownItems: state.allKnownItems,
        findByPublicId: state.findByPublicId,
        subscribeToDeleted: state.subscribeToDeleted,
        clearError: state.clearError,
        loadList: crud.loadList,
        loadMore: crud.loadMore,
        searchForPicker: crud.searchForPicker,
        fetchTier: crud.fetchTier,
        createTier: crud.createTier,
        updateTier: crud.updateTier,
        deleteTier: crud.deleteTier,
        refetchActive: crud.refetchActive,
        onAuthenticatedSession: realtime.onAuthenticatedSession,
        bootstrap: lifecycle.bootstrap,
        reset: lifecycle.reset,
        toAppError
    };
});
