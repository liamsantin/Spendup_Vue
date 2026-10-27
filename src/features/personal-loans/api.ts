import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import {
    LOAN_DIRECTIONS,
    LOAN_STATUSES,
    type CreatePersonalLoanPayload,
    type ListPersonalLoansQuery,
    type PersonalLoan,
    type PersonalLoansListResult,
    type UpdatePersonalLoanPayload
} from '@/features/personal-loans/types';

function listQueryString(query: ListPersonalLoansQuery = {}): string {
    const params = new URLSearchParams();
    if (query.status && LOAN_STATUSES.includes(query.status)) params.set('status', query.status);
    if (query.direction && LOAN_DIRECTIONS.includes(query.direction)) params.set('direction', query.direction);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

export const personalLoansApi = {
    list(query: ListPersonalLoansQuery = {}) {
        return fetchWrapper.get(`/api/personal-loans${listQueryString(query)}`) as Promise<PersonalLoansListResult>;
    },

    get(publicId: string) {
        return fetchWrapper.get(`/api/personal-loans/${encodeURIComponent(publicId)}`) as Promise<PersonalLoan>;
    },

    create(body: CreatePersonalLoanPayload) {
        return fetchWrapper.post('/api/personal-loans', body) as Promise<PersonalLoan>;
    },

    update(publicId: string, body: UpdatePersonalLoanPayload) {
        return fetchWrapper.put(`/api/personal-loans/${encodeURIComponent(publicId)}`, body) as Promise<PersonalLoan>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(`/api/personal-loans/${encodeURIComponent(publicId)}`) as Promise<void>;
    }
};
