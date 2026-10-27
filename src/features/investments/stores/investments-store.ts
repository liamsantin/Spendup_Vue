import { defineStore } from 'pinia';
import { AppError } from '@/utils/errors/app-error';
import {
    createInvestmentsState,
    createInvestmentsPositions,
    createInvestmentsOperations,
    createInvestmentsRealtime,
    createInvestmentsLifecycle,
    INVESTMENTS_MAX_AGE_MS
} from '@/features/investments/stores/internal';

export { INVESTMENTS_MAX_AGE_MS };
export type { OperationsPage, OperationsFilters } from '@/features/investments/stores/internal/investments-state';
export type { LoadPositionsOptions } from '@/features/investments/stores/internal/investments-positions';
export type { LoadOperationsOptions } from '@/features/investments/stores/internal/investments-operations';

/** Positions et journal d’opérations, indexés par `accountPublicId`. */
export const useInvestmentsStore = defineStore('investments', () => {
    const state = createInvestmentsState();
    const positions = createInvestmentsPositions(state);
    const operations = createInvestmentsOperations(state, { refetchPositions: positions.refetchPositions });
    const realtime = createInvestmentsRealtime(state, {
        refetchPositions: positions.refetchPositions,
        refetchOperations: operations.refetchOperations
    });
    const lifecycle = createInvestmentsLifecycle(state, {
        loadPositions: positions.loadPositions,
        cancelPendingPositions: positions.cancelPendingPositions,
        loadOperations: operations.loadOperations,
        cancelPendingOperations: operations.cancelPendingOperations,
        ensureRealtimeBridge: realtime.ensureRealtimeBridge,
        teardownRealtimeBridge: realtime.teardownRealtimeBridge
    });

    function toAppError(e: unknown): AppError {
        return AppError.fromUnknown(e);
    }

    return {
        positionsByAccount: state.positionsByAccount,
        operationsByAccount: state.operationsByAccount,
        loadingPositions: state.loadingPositions,
        loadingOperations: state.loadingOperations,
        acting: state.acting,
        initialized: state.initialized,
        error: state.error,
        clearError: state.clearError,
        positionsFor: state.positionsFor,
        includeClosedFor: state.includeClosedFor,
        operationsFor: state.operationsFor,
        isAccountLoaded: state.isAccountLoaded,
        rememberLocalMutation: state.rememberLocalMutation,
        loadPositions: positions.loadPositions,
        refetchPositions: positions.refetchPositions,
        loadOperations: operations.loadOperations,
        loadMoreOperations: operations.loadMoreOperations,
        refetchOperations: operations.refetchOperations,
        getOperation: operations.getOperation,
        createOperation: operations.createOperation,
        updateOperation: operations.updateOperation,
        deleteOperation: operations.deleteOperation,
        onAuthenticatedSession: realtime.onAuthenticatedSession,
        bootstrap: lifecycle.bootstrap,
        reset: lifecycle.reset,
        toAppError
    };
});
