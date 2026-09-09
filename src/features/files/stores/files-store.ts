import { defineStore } from 'pinia';
import { AppError } from '@/utils/errors/app-error';
import { createFilesState, createFilesCrud, createFilesLifecycle, FILES_LIST_MAX_AGE_MS } from '@/features/files/stores/internal';

export { FILES_LIST_MAX_AGE_MS };

export const useFilesStore = defineStore('files', () => {
    const state = createFilesState();
    const crud = createFilesCrud(state);
    const lifecycle = createFilesLifecycle(state, {
        loadList: crud.loadList,
        cancelPendingLoads: crud.cancelPendingLoads
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
        allKnownItems: state.allKnownItems,
        findByPublicId: state.findByPublicId,
        clearError: state.clearError,
        loadList: crud.loadList,
        loadMore: crud.loadMore,
        fetchFile: crud.fetchFile,
        uploadFile: crud.uploadFile,
        updateFile: crud.updateFile,
        deleteFile: crud.deleteFile,
        refetchActive: crud.refetchActive,
        bootstrap: lifecycle.bootstrap,
        reset: lifecycle.reset,
        toAppError
    };
});
