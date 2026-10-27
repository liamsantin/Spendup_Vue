import { defineStore } from 'pinia';
import { AppError } from '@/utils/errors/app-error';
import {
    createPersonalLoansState,
    createPersonalLoansCrud,
    createPersonalLoansRealtime,
    createPersonalLoansLifecycle,
    PERSONAL_LOANS_LIST_MAX_AGE_MS
} from '@/features/personal-loans/stores/internal';

export { PERSONAL_LOANS_LIST_MAX_AGE_MS };

export const usePersonalLoansStore = defineStore('personal-loans', () => {
    const state = createPersonalLoansState();
    const crud = createPersonalLoansCrud(state);
    const realtime = createPersonalLoansRealtime(state, {
        refetchActive: crud.refetchActive,
        fetchPersonalLoan: crud.fetchPersonalLoan
    });
    const lifecycle = createPersonalLoansLifecycle(state, {
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
        totalLent: state.totalLent,
        totalBorrowed: state.totalBorrowed,
        totalsCurrency: state.totalsCurrency,
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
        fetchPersonalLoan: crud.fetchPersonalLoan,
        createPersonalLoan: crud.createPersonalLoan,
        updatePersonalLoan: crud.updatePersonalLoan,
        deletePersonalLoan: crud.deletePersonalLoan,
        onAuthenticatedSession: realtime.onAuthenticatedSession,
        bootstrap: lifecycle.bootstrap,
        reset: lifecycle.reset,
        toAppError
    };
});
