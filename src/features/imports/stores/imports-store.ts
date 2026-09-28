import { defineStore } from 'pinia';
import { AppError } from '@/utils/errors/app-error';
import {
    createImportsCrud,
    createImportsLifecycle,
    createImportsLines,
    createImportsRealtime,
    createImportsState,
    createImportsTemplates
} from '@/features/imports/stores/internal';

export const useImportsStore = defineStore('imports', () => {
    const state = createImportsState();
    const lines = createImportsLines(state);
    const crud = createImportsCrud(state, {
        loadLines: lines.loadLines,
        cancelPendingLines: lines.cancelPendingLines
    });
    const templates = createImportsTemplates(state);
    const realtime = createImportsRealtime(state, {
        refetchList: crud.refetchList,
        refreshCurrent: crud.refreshCurrent,
        refetchTemplates: templates.refetchTemplates,
        removeTemplateLocal: templates.removeTemplateLocal
    });
    const lifecycle = createImportsLifecycle(state, {
        loadList: crud.loadList,
        cancelPendingLoads: crud.cancelPendingLoads,
        closeImport: crud.closeImport,
        cancelPendingTemplates: templates.cancelPendingTemplates,
        ensureRealtimeBridge: realtime.ensureRealtimeBridge,
        teardownRealtimeBridge: realtime.teardownRealtimeBridge
    });

    function toAppError(e: unknown): AppError {
        return AppError.fromUnknown(e);
    }

    return {
        items: state.items,
        totalCount: state.totalCount,
        listFilter: state.listFilter,
        loading: state.loading,
        loadingMore: state.loadingMore,
        initialized: state.initialized,
        hasItems: state.hasItems,
        hasMore: state.hasMore,
        current: state.current,
        currentLoading: state.currentLoading,
        currentGone: state.currentGone,
        lines: state.lines,
        linesTotal: state.linesTotal,
        linesFilter: state.linesFilter,
        linesLoading: state.linesLoading,
        linesLoadingMore: state.linesLoadingMore,
        linesHasMore: state.linesHasMore,
        preview: state.preview,
        previewLoading: state.previewLoading,
        templates: state.templates,
        templatesLoading: state.templatesLoading,
        templatesLoaded: state.templatesLoaded,
        acting: state.acting,
        error: state.error,
        clearError: state.clearError,
        findTemplate: state.findTemplate,
        loadList: crud.loadList,
        loadMore: crud.loadMore,
        openImport: crud.openImport,
        closeImport: crud.closeImport,
        uploadImport: crud.uploadImport,
        reparseImport: crud.reparseImport,
        loadPreview: crud.loadPreview,
        commitImport: crud.commitImport,
        cancelImport: crud.cancelImport,
        revertImport: crud.revertImport,
        deleteImport: crud.deleteImport,
        loadLines: lines.loadLines,
        loadMoreLines: lines.loadMoreLines,
        updateLine: lines.updateLine,
        bulkUpdateLines: lines.bulkUpdateLines,
        loadTemplates: templates.loadTemplates,
        saveImportAsTemplate: templates.saveImportAsTemplate,
        updateTemplate: templates.updateTemplate,
        deleteTemplate: templates.deleteTemplate,
        onAuthenticatedSession: realtime.onAuthenticatedSession,
        bootstrap: lifecycle.bootstrap,
        reset: lifecycle.reset,
        toAppError
    };
});
