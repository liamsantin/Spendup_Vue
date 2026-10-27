import { defineStore } from 'pinia';
import { AppError } from '@/utils/errors/app-error';
import {
    createSharedDebtsState,
    createSharedDebtsCrud,
    createSharedDebtsRealtime,
    createSharedDebtsLifecycle,
    SHARED_DEBTS_LIST_MAX_AGE_MS
} from '@/features/shared-debts/stores/internal';

export { SHARED_DEBTS_LIST_MAX_AGE_MS };

/**
 * Façade Pinia des dettes entre amis : state · crud · realtime · lifecycle.
 * Seule API publique de la feature (composants et tests).
 */
export const useSharedDebtsStore = defineStore('shared-debts', () => {
    const state = createSharedDebtsState();
    const crud = createSharedDebtsCrud(state);
    const realtime = createSharedDebtsRealtime(state, {
        refetchActive: crud.refetchActive,
        fetchSharedDebt: crud.fetchSharedDebt
    });
    const lifecycle = createSharedDebtsLifecycle(state, {
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
        totalOwedToMe: state.totalOwedToMe,
        totalIOwe: state.totalIOwe,
        totalsCurrency: state.totalsCurrency,
        loading: state.loading,
        acting: state.acting,
        initialized: state.initialized,
        error: state.error,
        hasItems: state.hasItems,
        activeQuery: state.activeQuery,
        expenseCandidates: state.expenseCandidates,
        expenseCandidatesLoading: state.expenseCandidatesLoading,
        findByPublicId: state.findByPublicId,
        subscribeToDeleted: state.subscribeToDeleted,
        clearError: state.clearError,
        loadList: crud.loadList,
        refetchActive: crud.refetchActive,
        fetchSharedDebt: crud.fetchSharedDebt,
        createSharedDebt: crud.createSharedDebt,
        updateSharedDebt: crud.updateSharedDebt,
        settleSharedDebt: crud.settleSharedDebt,
        cancelSharedDebt: crud.cancelSharedDebt,
        deleteSharedDebt: crud.deleteSharedDebt,
        loadExpenseCandidates: crud.loadExpenseCandidates,
        onAuthenticatedSession: realtime.onAuthenticatedSession,
        bootstrap: lifecycle.bootstrap,
        reset: lifecycle.reset,
        toAppError
    };
});
