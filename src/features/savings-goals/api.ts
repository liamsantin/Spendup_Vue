import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import {
    SAVINGS_GOAL_STATUSES,
    type CreateSavingsGoalPayload,
    type ListSavingsGoalsQuery,
    type SavingsGoal,
    type SavingsGoalList,
    type UpdateSavingsGoalPayload
} from '@/features/savings-goals/types';

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
