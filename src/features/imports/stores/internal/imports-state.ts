import { computed, ref } from 'vue';
import { normalizeImport, normalizeImportLine } from '@/features/imports/format';
import {
    IMPORT_LINES_PAGE_SIZE_DEFAULT,
    IMPORT_LINE_SORT_DEFAULT,
    IMPORT_PAGE_SIZE_DEFAULT,
    type Import,
    type ImportLine,
    type ImportLineSort,
    type ImportLineStatus,
    type ImportPreview,
    type ImportStatus,
    type ImportTemplate
} from '@/features/imports/types';

export type ImportsListFilter = {
    status: ImportStatus | null;
    accountPublicId: string | null;
};

export type ImportLinesFilter = {
    status: ImportLineStatus | null;
    q: string;
    sort: ImportLineSort;
};

export const EMPTY_LIST_FILTER: ImportsListFilter = { status: null, accountPublicId: null };
export const EMPTY_LINES_FILTER: ImportLinesFilter = { status: null, q: '', sort: IMPORT_LINE_SORT_DEFAULT };

export function createImportsState() {
    // Historique paginé.
    const items = ref<Import[]>([]);
    const totalCount = ref(0);
    const page = ref(1);
    const pageSize = ref(IMPORT_PAGE_SIZE_DEFAULT);
    const listFilter = ref<ImportsListFilter>({ ...EMPTY_LIST_FILTER });
    const loading = ref(false);
    const loadingMore = ref(false);
    const initialized = ref(false);

    // Import ouvert (écran mapping / revue / résultat).
    const current = ref<Import | null>(null);
    const currentLoading = ref(false);
    /** L’import ouvert a été supprimé (ailleurs ou 404) : l’écran doit revenir à la liste. */
    const currentGone = ref(false);

    const lines = ref<ImportLine[]>([]);
    const linesTotal = ref(0);
    const linesPage = ref(1);
    const linesPageSize = ref(IMPORT_LINES_PAGE_SIZE_DEFAULT);
    const linesFilter = ref<ImportLinesFilter>({ ...EMPTY_LINES_FILTER });
    const linesLoading = ref(false);
    const linesLoadingMore = ref(false);

    const preview = ref<ImportPreview | null>(null);
    const previewLoading = ref(false);

    // Modèles perso (actifs et inactifs) puis système, ordre API.
    const templates = ref<ImportTemplate[]>([]);
    const templatesLoading = ref(false);
    const templatesLoaded = ref(false);

    const acting = ref(false);
    let actingDepth = 0;
    const error = ref<string | null>(null);

    const recentMutations = new Map<string, ReturnType<typeof setTimeout>>();

    const hasItems = computed(() => items.value.length > 0);
    const hasMore = computed(() => items.value.length < totalCount.value);
    const linesHasMore = computed(() => lines.value.length < linesTotal.value);

    function beginActing() {
        actingDepth += 1;
        acting.value = true;
    }

    function endActing() {
        actingDepth = Math.max(0, actingDepth - 1);
        acting.value = actingDepth > 0;
    }

    function resetActing() {
        actingDepth = 0;
        acting.value = false;
    }

    function clearError() {
        error.value = null;
    }

    /** Met à jour l’import dans l’historique et, s’il est ouvert, l’écran courant. */
    function upsertImport(raw: Import): Import {
        const next = normalizeImport(raw);
        const index = items.value.findIndex((item) => item.publicId === next.publicId);
        if (index >= 0) {
            const copy = [...items.value];
            copy[index] = next;
            items.value = copy;
        }
        if (current.value?.publicId === next.publicId) {
            current.value = next;
        }
        return next;
    }

    function removeImportLocal(publicId: string) {
        const before = items.value.length;
        items.value = items.value.filter((item) => item.publicId !== publicId);
        if (items.value.length !== before) totalCount.value = Math.max(0, totalCount.value - 1);
        if (current.value?.publicId === publicId) {
            currentGone.value = true;
        }
    }

    function setLines(next: ImportLine[], total: number, append: boolean) {
        const normalized = next.map(normalizeImportLine);
        if (!append) {
            lines.value = normalized;
        } else {
            const known = new Set(lines.value.map((line) => line.publicId));
            lines.value = [...lines.value, ...normalized.filter((line) => !known.has(line.publicId))];
        }
        linesTotal.value = total;
    }

    /**
     * Remplace une ligne corrigée. Si elle ne correspond plus à l’onglet filtré (ex. validée depuis
     * « Erreurs »), elle reste affichée jusqu’au prochain rechargement : pas de saut sous le curseur.
     */
    function upsertLine(raw: ImportLine) {
        const next = normalizeImportLine(raw);
        const index = lines.value.findIndex((line) => line.publicId === next.publicId);
        if (index < 0) return;
        const copy = [...lines.value];
        copy[index] = next;
        lines.value = copy;
    }

    function clearCurrent() {
        current.value = null;
        currentGone.value = false;
        lines.value = [];
        linesTotal.value = 0;
        linesPage.value = 1;
        linesFilter.value = { ...EMPTY_LINES_FILTER };
        preview.value = null;
    }

    function rememberLocalMutation(publicId: string) {
        const id = publicId.trim();
        if (!id) return;
        const previous = recentMutations.get(id);
        if (previous) clearTimeout(previous);
        recentMutations.set(
            id,
            setTimeout(() => {
                recentMutations.delete(id);
            }, 2500)
        );
    }

    function consumeLocalMutation(publicId: string): boolean {
        const id = publicId.trim();
        const timer = recentMutations.get(id);
        if (!timer) return false;
        clearTimeout(timer);
        recentMutations.delete(id);
        return true;
    }

    function clearRecentMutations() {
        for (const timer of recentMutations.values()) clearTimeout(timer);
        recentMutations.clear();
    }

    function findTemplate(publicId: string | null | undefined): ImportTemplate | null {
        const id = publicId?.trim();
        if (!id) return null;
        return templates.value.find((item) => item.publicId === id) ?? null;
    }

    return {
        items,
        totalCount,
        page,
        pageSize,
        listFilter,
        loading,
        loadingMore,
        initialized,
        current,
        currentLoading,
        currentGone,
        lines,
        linesTotal,
        linesPage,
        linesPageSize,
        linesFilter,
        linesLoading,
        linesLoadingMore,
        preview,
        previewLoading,
        templates,
        templatesLoading,
        templatesLoaded,
        acting,
        error,
        hasItems,
        hasMore,
        linesHasMore,
        beginActing,
        endActing,
        resetActing,
        clearError,
        upsertImport,
        removeImportLocal,
        setLines,
        upsertLine,
        clearCurrent,
        rememberLocalMutation,
        consumeLocalMutation,
        clearRecentMutations,
        findTemplate
    };
}

export type ImportsState = ReturnType<typeof createImportsState>;
