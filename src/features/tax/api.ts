import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type {
    TaxEntryKind,
    TaxPerson,
    TaxReturn,
    TaxReturnCreated,
    TaxReturnListResult,
    TaxSuggestionList,
    UpdateTaxReturnPayload,
    UpsertTaxAmountPayload,
    UpsertTaxEntryPayload
} from '@/features/tax/types';

export const taxApi = {
    list() {
        return fetchWrapper.get('/api/tax-returns') as Promise<TaxReturnListResult>;
    },

    create(year: number, canton: string) {
        return fetchWrapper.post('/api/tax-returns', { year, canton }) as Promise<TaxReturnCreated>;
    },

    get(publicId: string) {
        return fetchWrapper.get(`/api/tax-returns/${encodeURIComponent(publicId)}`) as Promise<TaxReturn>;
    },

    update(publicId: string, body: UpdateTaxReturnPayload) {
        return fetchWrapper.put(`/api/tax-returns/${encodeURIComponent(publicId)}`, body) as Promise<TaxReturn>;
    },

    upsertAmount(publicId: string, code: string, body: UpsertTaxAmountPayload) {
        return fetchWrapper.put(
            `/api/tax-returns/${encodeURIComponent(publicId)}/amounts/${encodeURIComponent(code)}`,
            body
        ) as Promise<TaxReturn>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(`/api/tax-returns/${encodeURIComponent(publicId)}`) as Promise<void>;
    },

    createEntry(publicId: string, body: UpsertTaxEntryPayload) {
        return fetchWrapper.post(`/api/tax-returns/${encodeURIComponent(publicId)}/entries`, body) as Promise<TaxReturn>;
    },

    deleteEntry(publicId: string, entryPublicId: string) {
        return fetchWrapper.delete(
            `/api/tax-returns/${encodeURIComponent(publicId)}/entries/${encodeURIComponent(entryPublicId)}`
        ) as Promise<TaxReturn>;
    },

    reportEntries(publicId: string, kind: TaxEntryKind, person: TaxPerson) {
        return fetchWrapper.post(`/api/tax-returns/${encodeURIComponent(publicId)}/entries/report`, { kind, person }) as Promise<TaxReturn>;
    },

    pdf(publicId: string) {
        return fetchWrapper.getBlob(`/api/tax-returns/${encodeURIComponent(publicId)}/pdf`);
    },

    suggestions(publicId: string) {
        return fetchWrapper.get(`/api/tax-returns/${encodeURIComponent(publicId)}/suggestions`) as Promise<TaxSuggestionList>;
    },

    acceptSuggestion(publicId: string, body: { code: string; person: string; competence: string; amount: number }) {
        return fetchWrapper.post(`/api/tax-returns/${encodeURIComponent(publicId)}/suggestions/accept`, body) as Promise<TaxReturn>;
    },

    attachDocument(publicId: string, filePublicId: string, lineCode: string | null) {
        return fetchWrapper.post(`/api/tax-returns/${encodeURIComponent(publicId)}/documents`, {
            filePublicId,
            lineCode
        }) as Promise<TaxReturn>;
    },

    detachDocument(publicId: string, documentPublicId: string) {
        return fetchWrapper.delete(
            `/api/tax-returns/${encodeURIComponent(publicId)}/documents/${encodeURIComponent(documentPublicId)}`
        ) as Promise<TaxReturn>;
    },

    importStatement(publicId: string, xml: string) {
        return fetchWrapper.post(`/api/tax-returns/${encodeURIComponent(publicId)}/statements`, { xml }) as Promise<TaxSuggestionList>;
    }
};
