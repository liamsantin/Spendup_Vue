import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import {
    SHARED_DEBT_ROLES,
    SHARED_DEBT_STATUSES,
    type CreateSharedDebtPayload,
    type ListSharedDebtsQuery,
    type SettleSharedDebtPayload,
    type SharedDebt,
    type SharedDebtsListResult,
    type UpdateSharedDebtPayload
} from '@/features/shared-debts/types';

function listQueryString(query: ListSharedDebtsQuery = {}): string {
    const params = new URLSearchParams();
    if (query.role && SHARED_DEBT_ROLES.includes(query.role)) params.set('role', query.role);
    if (query.status && SHARED_DEBT_STATUSES.includes(query.status)) params.set('status', query.status);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

function path(publicId: string, suffix = ''): string {
    return `/api/shared-debts/${encodeURIComponent(publicId)}${suffix}`;
}

export const sharedDebtsApi = {
    list(query: ListSharedDebtsQuery = {}) {
        return fetchWrapper.get(`/api/shared-debts${listQueryString(query)}`) as Promise<SharedDebtsListResult>;
    },

    get(publicId: string) {
        return fetchWrapper.get(path(publicId)) as Promise<SharedDebt>;
    },

    create(body: CreateSharedDebtPayload) {
        return fetchWrapper.post('/api/shared-debts', body) as Promise<SharedDebt>;
    },

    update(publicId: string, body: UpdateSharedDebtPayload) {
        return fetchWrapper.put(path(publicId), body) as Promise<SharedDebt>;
    },

    settle(publicId: string, body: SettleSharedDebtPayload = {}) {
        return fetchWrapper.post(path(publicId, '/settle'), body) as Promise<SharedDebt>;
    },

    cancel(publicId: string) {
        return fetchWrapper.post(path(publicId, '/cancel'), {}) as Promise<SharedDebt>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(path(publicId)) as Promise<void>;
    }
};
