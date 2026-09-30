import { fetchWrapper, type FetchFormOptions } from '@/utils/helpers/fetch-helpers';
import {
    IMPORT_LINES_PAGE_SIZE_DEFAULT,
    IMPORT_LINES_PAGE_SIZE_MAX,
    IMPORT_LINE_SEARCH_MAX,
    IMPORT_PAGE_SIZE_DEFAULT,
    IMPORT_PAGE_SIZE_MAX,
    type BulkUpdateImportLinesPayload,
    type BulkUpdateImportLinesResult,
    type CommitImportResult,
    type CreateImportPayload,
    type CreateImportTemplatePayload,
    type Import,
    type ImportLine,
    type ImportLineList,
    type ImportLineRecurringDue,
    type ImportList,
    type ImportPreview,
    type ImportSourceType,
    type ImportTemplate,
    type ImportTemplateList,
    type ListImportLinesQuery,
    type ListImportsQuery,
    type ReparseImportPayload,
    type RevertImportResult,
    type SaveImportAsTemplatePayload,
    type UpdateImportLinePayload,
    type UpdateImportTemplatePayload
} from '@/features/imports/types';

function clamp(value: number | undefined, fallback: number, max: number): number {
    const raw = value ?? fallback;
    if (!Number.isFinite(raw)) return fallback;
    return Math.min(max, Math.max(1, Math.trunc(raw)));
}

function importPath(publicId: string, suffix = ''): string {
    return `/api/imports/${encodeURIComponent(publicId)}${suffix}`;
}

export const importsApi = {
    list(query: ListImportsQuery = {}) {
        const params = new URLSearchParams({
            page: String(clamp(query.page, 1, Number.MAX_SAFE_INTEGER)),
            pageSize: String(clamp(query.pageSize, IMPORT_PAGE_SIZE_DEFAULT, IMPORT_PAGE_SIZE_MAX))
        });
        if (query.status) params.set('status', query.status);
        if (query.accountPublicId) params.set('accountPublicId', query.accountPublicId);
        return fetchWrapper.get(`/api/imports?${params}`) as Promise<ImportList>;
    },

    get(publicId: string) {
        return fetchWrapper.get(importPath(publicId)) as Promise<Import>;
    },

    /** Multipart. `mapping` et `importTemplatePublicId` sont exclusifs. N’écrit aucune transaction. */
    create(payload: CreateImportPayload, options: FetchFormOptions = {}) {
        const form = new FormData();
        form.append('file', payload.file);
        form.append('accountPublicId', payload.accountPublicId);
        if (payload.mapping) form.append('mapping', JSON.stringify(payload.mapping));
        if (payload.importTemplatePublicId) form.append('importTemplatePublicId', payload.importTemplatePublicId);
        if (payload.paymentMethodPublicId) form.append('paymentMethodPublicId', payload.paymentMethodPublicId);
        return fetchWrapper.postForm('/api/imports', form, options) as Promise<Import>;
    },

    /** Échéances ouvertes rapprochables d’une ligne (même sens, compte cible), les plus probables d’abord. */
    listLineRecurringDues(publicId: string, linePublicId: string) {
        return fetchWrapper.get(importPath(publicId, `/lines/${encodeURIComponent(linePublicId)}/recurring-dues`)) as Promise<
            ImportLineRecurringDue[]
        >;
    },

    listLines(publicId: string, query: ListImportLinesQuery = {}) {
        const params = new URLSearchParams({
            page: String(clamp(query.page, 1, Number.MAX_SAFE_INTEGER)),
            pageSize: String(clamp(query.pageSize, IMPORT_LINES_PAGE_SIZE_DEFAULT, IMPORT_LINES_PAGE_SIZE_MAX))
        });
        if (query.status) params.set('status', query.status);
        const q = query.q?.trim().slice(0, IMPORT_LINE_SEARCH_MAX);
        if (q) params.set('q', q);
        if (query.sort) params.set('sort', query.sort);
        return fetchWrapper.get(`${importPath(publicId, '/lines')}?${params}`) as Promise<ImportLineList>;
    },

    updateLine(publicId: string, linePublicId: string, body: UpdateImportLinePayload) {
        return fetchWrapper.patch(importPath(publicId, `/lines/${encodeURIComponent(linePublicId)}`), body) as Promise<ImportLine>;
    },

    bulkUpdateLines(publicId: string, body: BulkUpdateImportLinesPayload) {
        return fetchWrapper.patch(importPath(publicId, '/lines'), body) as Promise<BulkUpdateImportLinesResult>;
    },

    /** Remplace toutes les lignes : les corrections faites en revue sont perdues. */
    reparse(publicId: string, body: ReparseImportPayload = {}) {
        return fetchWrapper.post(importPath(publicId, '/reparse'), body) as Promise<Import>;
    },

    preview(publicId: string) {
        return fetchWrapper.get(importPath(publicId, '/preview')) as Promise<ImportPreview>;
    },

    /** Toujours un body JSON (`{}` au minimum). */
    commit(publicId: string, ignoreUnresolved = false) {
        return fetchWrapper.post(
            importPath(publicId, '/commit'),
            ignoreUnresolved ? { ignoreUnresolved: true } : {}
        ) as Promise<CommitImportResult>;
    },

    cancel(publicId: string) {
        return fetchWrapper.post(importPath(publicId, '/cancel')) as Promise<Import>;
    },

    revert(publicId: string) {
        return fetchWrapper.post(importPath(publicId, '/revert')) as Promise<RevertImportResult>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(importPath(publicId)) as Promise<void>;
    },

    saveAsTemplate(publicId: string, body: SaveImportAsTemplatePayload) {
        return fetchWrapper.post(importPath(publicId, '/save-as-template'), body) as Promise<ImportTemplate>;
    }
};

export const importTemplatesApi = {
    /** Modèles perso (actifs et inactifs) puis modèles système. */
    list(sourceType?: ImportSourceType) {
        const query = sourceType ? `?sourceType=${encodeURIComponent(sourceType)}` : '';
        return fetchWrapper.get(`/api/import-templates${query}`) as Promise<ImportTemplateList>;
    },

    get(publicId: string) {
        return fetchWrapper.get(`/api/import-templates/${encodeURIComponent(publicId)}`) as Promise<ImportTemplate>;
    },

    create(body: CreateImportTemplatePayload) {
        return fetchWrapper.post('/api/import-templates', body) as Promise<ImportTemplate>;
    },

    update(publicId: string, body: UpdateImportTemplatePayload) {
        return fetchWrapper.put(`/api/import-templates/${encodeURIComponent(publicId)}`, body) as Promise<ImportTemplate>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(`/api/import-templates/${encodeURIComponent(publicId)}`) as Promise<void>;
    }
};
