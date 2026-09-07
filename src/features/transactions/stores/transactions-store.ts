import { defineStore } from 'pinia';
import { AppError } from '@/utils/errors/app-error';
import {
    createTransactionsState,
    createTransactionsCrud,
    createTransactionsRealtime,
    createTransactionsLifecycle,
    TRANSACTIONS_LIST_MAX_AGE_MS
} from '@/features/transactions/stores/internal';

export { TRANSACTIONS_LIST_MAX_AGE_MS };

export const useTransactionsStore = defineStore('transactions', () => {
    const state = createTransactionsState();
    const crud = createTransactionsCrud(state);
    const realtime = createTransactionsRealtime(state, {
        refetchActive: crud.refetchActive,
        refreshAccountBalances: crud.refreshAccountBalances
    });
    const lifecycle = createTransactionsLifecycle(state, {
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
        clearError: state.clearError,
        loadList: crud.loadList,
        loadMore: crud.loadMore,
        createTransaction: crud.createTransaction,
        updateTransaction: crud.updateTransaction,
        deleteTransaction: crud.deleteTransaction,
        refetchAccount: crud.refetchAccount,
        refetchActive: crud.refetchActive,
        onAuthenticatedSession: realtime.onAuthenticatedSession,
        bootstrap: lifecycle.bootstrap,
        reset: lifecycle.reset,
        toAppError
    };
});
