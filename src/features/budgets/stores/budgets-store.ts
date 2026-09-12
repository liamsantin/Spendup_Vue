import { defineStore } from 'pinia';
import { AppError } from '@/utils/errors/app-error';
import {
    createBudgetsState,
    createBudgetsCrud,
    createBudgetsRealtime,
    createBudgetsLifecycle,
    BUDGETS_LIST_MAX_AGE_MS
} from '@/features/budgets/stores/internal';

export { BUDGETS_LIST_MAX_AGE_MS };

export const useBudgetsStore = defineStore('budgets', () => {
    const state = createBudgetsState();
    const crud = createBudgetsCrud(state);
    const realtime = createBudgetsRealtime(state, {
        refetchActive: crud.refetchActive,
        fetchBudget: crud.fetchBudget
    });
    const lifecycle = createBudgetsLifecycle(state, {
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
        fetchBudget: crud.fetchBudget,
        createBudget: crud.createBudget,
        updateBudget: crud.updateBudget,
        deleteBudget: crud.deleteBudget,
        onAuthenticatedSession: realtime.onAuthenticatedSession,
        bootstrap: lifecycle.bootstrap,
        reset: lifecycle.reset,
        toAppError
    };
});
