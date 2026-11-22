import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import {
    SAVINGS_GOAL_STATUSES,
    type CreateSavingsGoalPayload,
    type ListSavingsGoalsQuery,
    type SavingsGoal,
    type SavingsGoalList,
    type UpdateSavingsGoalPayload
} from '@/features/savings-goals/types';
import type { SavingsProjection, SavingsProjectionQuery } from '@/features/savings-goals/projection';

function listQueryString(query: ListSavingsGoalsQuery = {}): string {
    const params = new URLSearchParams();
    if (query.status && SAVINGS_GOAL_STATUSES.includes(query.status)) params.set('status', query.status);
    const account = query.accountPublicId?.trim();
    if (account) params.set('accountPublicId', account);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

export const savingsGoalsApi = {
    list(query: ListSavingsGoalsQuery = {}) {
        return fetchWrapper.get(`/api/savings-goals${listQueryString(query)}`) as Promise<SavingsGoalList>;
    },

    get(publicId: string) {
        return fetchWrapper.get(`/api/savings-goals/${encodeURIComponent(publicId)}`) as Promise<SavingsGoal>;
    },

    projection(publicId: string, query: SavingsProjectionQuery = {}) {
        const params = new URLSearchParams();
        if (query.years !== undefined) params.set('years', String(query.years));
        if (query.monthly !== undefined) params.set('monthly', String(query.monthly));
        if (query.ratePercent !== undefined) params.set('ratePercent', String(query.ratePercent));
        const qs = params.toString();
        return fetchWrapper.get(
            `/api/savings-goals/${encodeURIComponent(publicId)}/projection${qs ? `?${qs}` : ''}`
        ) as Promise<SavingsProjection>;
    },

    create(body: CreateSavingsGoalPayload) {
        return fetchWrapper.post('/api/savings-goals', body) as Promise<SavingsGoal>;
    },

    update(publicId: string, body: UpdateSavingsGoalPayload) {
        return fetchWrapper.put(`/api/savings-goals/${encodeURIComponent(publicId)}`, body) as Promise<SavingsGoal>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(`/api/savings-goals/${encodeURIComponent(publicId)}`) as Promise<void>;
    }
};
