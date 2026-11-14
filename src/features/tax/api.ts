import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type {
    TaxReturn,
    TaxReturnCreated,
    TaxReturnListResult,
    UpdateTaxReturnPayload,
    UpsertTaxAmountPayload
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
    }
};
