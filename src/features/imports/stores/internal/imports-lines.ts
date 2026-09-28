import { AppError } from '@/utils/errors/app-error';
import { importsApi } from '@/features/imports/api';
import {
    IMPORT_LINES_PAGE_SIZE_DEFAULT,
    IMPORT_LINES_PAGE_SIZE_MAX,
    type BulkUpdateImportLinesPayload,
    type ImportLine,
    type UpdateImportLinePayload
} from '@/features/imports/types';
import type { ImportLinesFilter, ImportsState } from '@/features/imports/stores/internal/imports-state';

export const IMPORT_NOT_FOUND_MESSAGE = 'Cet import n’est plus disponible.';

/** Lignes de l’import ouvert : pagination, corrections unitaires et actions groupées. */
export function createImportsLines(state: ImportsState) {
    const {
        current,
        currentGone,
        lines,
        linesPage,
        linesPageSize,
        linesFilter,
        linesLoading,
        linesLoadingMore,
        linesHasMore,
        preview,
        error,
        beginActing,
        endActing,
        clearError,
        upsertImport,
        removeImportLocal,
        setLines,
        upsertLine,
        rememberLocalMutation
    } = state;

    let linesRequestSeq = 0;
    let summaryRequestSeq = 0;

    function currentId(): string | null {
        return current.value?.publicId ?? null;
    }

    function handleNotFound(publicId: string) {
        error.value = IMPORT_NOT_FOUND_MESSAGE;
        removeImportLocal(publicId);
        currentGone.value = true;
    }

    async function fetchLinesPage(publicId: string, pageNumber: number, pageSize: number, append: boolean) {
        const filter = linesFilter.value;
        const requestId = ++linesRequestSeq;
        const result = await importsApi.listLines(publicId, {
            status: filter.status ?? undefined,
            q: filter.q || undefined,
            sort: filter.sort,
            page: pageNumber,
            pageSize
        });
        if (requestId !== linesRequestSeq || currentId() !== publicId) return;
        setLines(Array.isArray(result?.items) ? result.items : [], result?.totalCount ?? 0, append);
        linesPage.value = pageNumber;
        linesPageSize.value = pageSize;
    }

    /** Recharge la page 1 avec le filtre donné (onglet, recherche, tri). */
    async function loadLines(filter: Partial<ImportLinesFilter> = {}) {
        const publicId = currentId();
        if (!publicId) return;
        linesFilter.value = { ...linesFilter.value, ...filter };
        linesLoading.value = true;
        try {
            await fetchLinesPage(publicId, 1, IMPORT_LINES_PAGE_SIZE_DEFAULT, false);
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) handleNotFound(publicId);
            else error.value = err.message;
            throw err;
        } finally {
            linesLoading.value = false;
        }
    }

    async function loadMoreLines() {
        const publicId = currentId();
        if (!publicId || !linesHasMore.value || linesLoadingMore.value) return;
        linesLoadingMore.value = true;
        try {
            // Pages de taille fixe : la page suivante reste alignée même après un rechargement agrandi.
            const size = IMPORT_LINES_PAGE_SIZE_DEFAULT;
            const nextPage = Math.floor(lines.value.length / size) + 1;
            await fetchLinesPage(publicId, nextPage, size, true);
        } catch (e: unknown) {
            error.value = AppError.fromUnknown(e).message;
        } finally {
            linesLoadingMore.value = false;
        }
    }

    /**
     * Relit les lignes déjà affichées après une action groupée ou un événement d’un autre onglet,
     * sans perdre ce que « Charger plus » avait ajouté (plafond API : 200).
     */
    async function reloadLines() {
        const publicId = currentId();
        if (!publicId) return;
        const loaded = Math.ceil(lines.value.length / IMPORT_LINES_PAGE_SIZE_DEFAULT) * IMPORT_LINES_PAGE_SIZE_DEFAULT;
        const size = Math.min(IMPORT_LINES_PAGE_SIZE_MAX, Math.max(IMPORT_LINES_PAGE_SIZE_DEFAULT, loaded));
        try {
            await fetchLinesPage(publicId, 1, size, false);
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) handleNotFound(publicId);
        }
    }

    /** `GET /imports/{id}` : compteurs des onglets après une correction. */
    async function refreshSummary() {
        const publicId = currentId();
        if (!publicId) return;
        const requestId = ++summaryRequestSeq;
        try {
            const fresh = await importsApi.get(publicId);
            if (requestId !== summaryRequestSeq) return;
            upsertImport(fresh);
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) handleNotFound(publicId);
        }
    }

    async function updateLine(linePublicId: string, payload: UpdateImportLinePayload): Promise<ImportLine> {
        const publicId = currentId();
        if (!publicId) throw new AppError(IMPORT_NOT_FOUND_MESSAGE, 404);
        beginActing();
        clearError();
        rememberLocalMutation(publicId);
        try {
            const updated = await importsApi.updateLine(publicId, linePublicId, payload);
            upsertLine(updated);
            preview.value = null;
            await refreshSummary();
            return updated;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                // Ligne ou import disparu : relire pour savoir lequel.
                await refreshSummary();
                if (!currentGone.value) await reloadLines();
            }
            error.value = err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    async function bulkUpdateLines(payload: BulkUpdateImportLinesPayload) {
        const publicId = currentId();
        if (!publicId) throw new AppError(IMPORT_NOT_FOUND_MESSAGE, 404);
        beginActing();
        clearError();
        rememberLocalMutation(publicId);
        try {
            const result = await importsApi.bulkUpdateLines(publicId, payload);
            upsertImport(result.import);
            preview.value = null;
            await reloadLines();
            return { updated: result.updated, skipped: result.skipped };
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) await refreshSummary();
            error.value = err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    function cancelPendingLines() {
        linesRequestSeq += 1;
        summaryRequestSeq += 1;
        linesLoading.value = false;
        linesLoadingMore.value = false;
    }

    return {
        loadLines,
        loadMoreLines,
        reloadLines,
        refreshSummary,
        updateLine,
        bulkUpdateLines,
        cancelPendingLines
    };
}

export type ImportsLines = ReturnType<typeof createImportsLines>;
