import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import {
    LIABILITY_STATUSES,
    LIABILITY_TYPES,
    type CreateLiabilityPayload,
    type LiabilitiesListResult,
    type Liability,
    type ListLiabilitiesQuery,
    type SetRemainingAmountPayload,
    type UpdateLiabilityPayload
} from '@/features/liabilities/types';

function listQueryString(query: ListLiabilitiesQuery = {}): string {
    const params = new URLSearchParams();
    if (query.type && LIABILITY_TYPES.includes(query.type)) params.set('type', query.type);
    if (query.status && LIABILITY_STATUSES.includes(query.status)) params.set('status', query.status);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

export const liabilitiesApi = {
    list(query: ListLiabilitiesQuery = {}) {
        return fetchWrapper.get(`/api/liabilities${listQueryString(query)}`) as Promise<LiabilitiesListResult>;
    },

    get(publicId: string) {
        return fetchWrapper.get(`/api/liabilities/${encodeURIComponent(publicId)}`) as Promise<Liability>;
    },

    create(body: CreateLiabilityPayload) {
        return fetchWrapper.post('/api/liabilities', body) as Promise<Liability>;
    },

    update(publicId: string, body: UpdateLiabilityPayload) {
        return fetchWrapper.put(`/api/liabilities/${encodeURIComponent(publicId)}`, body) as Promise<Liability>;
    },

    /** Geste rapide : ne touche que le restant (le statut `annule` colle). */
    setRemainingAmount(publicId: string, body: SetRemainingAmountPayload) {
        return fetchWrapper.post(`/api/liabilities/${encodeURIComponent(publicId)}/remaining-amount`, body) as Promise<Liability>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(`/api/liabilities/${encodeURIComponent(publicId)}`) as Promise<void>;
    }
};
