import { defineStore } from 'pinia';
import { AppError } from '@/utils/errors/app-error';
import {
    createSavingsGoalsState,
    createSavingsGoalsCrud,
    createSavingsGoalsRealtime,
    createSavingsGoalsLifecycle,
    SAVINGS_GOALS_LIST_MAX_AGE_MS
} from '@/features/savings-goals/stores/internal';

export { SAVINGS_GOALS_LIST_MAX_AGE_MS };

export const useSavingsGoalsStore = defineStore('savings-goals', () => {
    const state = createSavingsGoalsState();
    const crud = createSavingsGoalsCrud(state);
    const realtime = createSavingsGoalsRealtime(state, {
        refetchActive: crud.refetchActive,
        fetchSavingsGoal: crud.fetchSavingsGoal
    });
    const lifecycle = createSavingsGoalsLifecycle(state, {
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
        itemsForAccount: state.itemsForAccount,
        subscribeToDeleted: state.subscribeToDeleted,
        clearError: state.clearError,
        loadList: crud.loadList,
        refetchActive: crud.refetchActive,
        fetchSavingsGoal: crud.fetchSavingsGoal,
        createSavingsGoal: crud.createSavingsGoal,
        updateSavingsGoal: crud.updateSavingsGoal,
        depositSavingsGoal: crud.depositSavingsGoal,
        unlinkSavingsGoalAccount: crud.unlinkSavingsGoalAccount,
        listLinkedToAccount: crud.listLinkedToAccount,
        deleteSavingsGoal: crud.deleteSavingsGoal,
        onAuthenticatedSession: realtime.onAuthenticatedSession,
        bootstrap: lifecycle.bootstrap,
        reset: lifecycle.reset,
        toAppError
    };
});
