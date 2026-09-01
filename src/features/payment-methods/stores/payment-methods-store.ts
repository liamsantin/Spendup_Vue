import { defineStore } from 'pinia';
import { AppError } from '@/utils/errors/app-error';
import {
    createPaymentMethodsState,
    createPaymentMethodsCrud,
    createPaymentMethodsRealtime,
    createPaymentMethodsLifecycle,
    PAYMENT_METHODS_LIST_MAX_AGE_MS
} from '@/features/payment-methods/stores/internal';

export { PAYMENT_METHODS_LIST_MAX_AGE_MS };

export const usePaymentMethodsStore = defineStore('paymentMethods', () => {
    const state = createPaymentMethodsState();
    const crud = createPaymentMethodsCrud(state);
    const realtime = createPaymentMethodsRealtime(state, {
        loadList: crud.loadList,
        refetchAccount: crud.refetchAccount
    });
    const lifecycle = createPaymentMethodsLifecycle(state, {
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
        activeAccountPublicId: state.activeAccountPublicId,
        allKnownItems: state.allKnownItems,
        clearError: state.clearError,
        loadList: crud.loadList,
        loadMore: crud.loadMore,
        createPaymentMethod: crud.createPaymentMethod,
        updatePaymentMethod: crud.updatePaymentMethod,
        deletePaymentMethod: crud.deletePaymentMethod,
        refetchAccount: crud.refetchAccount,
        onAuthenticatedSession: realtime.onAuthenticatedSession,
        bootstrap: lifecycle.bootstrap,
        reset: lifecycle.reset,
        toAppError
    };
});
