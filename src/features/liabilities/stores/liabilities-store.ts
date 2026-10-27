import { defineStore } from 'pinia';
import { AppError } from '@/utils/errors/app-error';
import {
    createLiabilitiesState,
    createLiabilitiesCrud,
    createLiabilitiesRealtime,
    createLiabilitiesLifecycle,
    LIABILITIES_LIST_MAX_AGE_MS
} from '@/features/liabilities/stores/internal';

export { LIABILITIES_LIST_MAX_AGE_MS };

export const useLiabilitiesStore = defineStore('liabilities', () => {
    const state = createLiabilitiesState();
    const crud = createLiabilitiesCrud(state);
    const realtime = createLiabilitiesRealtime(state, {
        refetchActive: crud.refetchActive,
        fetchLiability: crud.fetchLiability
    });
    const lifecycle = createLiabilitiesLifecycle(state, {
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
        activeQuery: state.activeQuery,
        allKnownItems: state.allKnownItems,
        findByPublicId: state.findByPublicId,
        subscribeToDeleted: state.subscribeToDeleted,
        clearError: state.clearError,
        loadList: crud.loadList,
        refetchActive: crud.refetchActive,
        fetchLiability: crud.fetchLiability,
        createLiability: crud.createLiability,
        updateLiability: crud.updateLiability,
        setRemainingAmount: crud.setRemainingAmount,
        deleteLiability: crud.deleteLiability,
        onAuthenticatedSession: realtime.onAuthenticatedSession,
        bootstrap: lifecycle.bootstrap,
        reset: lifecycle.reset,
        toAppError
    };
});
