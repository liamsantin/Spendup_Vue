import { defineStore } from 'pinia';
import { AppError } from '@/utils/errors/app-error';
import {
    createCategoriesState,
    createCategoriesCrud,
    createCategoriesRealtime,
    createCategoriesLifecycle,
    CATEGORIES_LIST_MAX_AGE_MS
} from '@/features/categories/stores/internal';

export { CATEGORIES_LIST_MAX_AGE_MS };

export const useCategoriesStore = defineStore('categories', () => {
    const state = createCategoriesState();
    const crud = createCategoriesCrud(state);
    const realtime = createCategoriesRealtime(state, {
        refetchTree: crud.refetchTree
    });
    const lifecycle = createCategoriesLifecycle(state, {
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
        activeType: state.activeType,
        allKnownItems: state.allKnownItems,
        findByPublicId: state.findByPublicId,
        clearError: state.clearError,
        loadList: crud.loadList,
        createCategory: crud.createCategory,
        updateCategory: crud.updateCategory,
        deleteCategory: crud.deleteCategory,
        deleteAllCategories: crud.deleteAllCategories,
        refetchTree: crud.refetchTree,
        countLinkedTransactions: crud.countLinkedTransactions,
        applyCategoryPlan: crud.applyCategoryPlan,
        onAuthenticatedSession: realtime.onAuthenticatedSession,
        bootstrap: lifecycle.bootstrap,
        reset: lifecycle.reset,
        toAppError
    };
});
