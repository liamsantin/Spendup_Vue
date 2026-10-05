import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import {
    BUDGET_PERIODES,
    type Budget,
    type BudgetList,
    type CreateBudgetPayload,
    type ListBudgetsQuery,
    type UpdateBudgetPayload
} from '@/features/budgets/types';

function listQueryString(query: ListBudgetsQuery = {}): string {
    const params = new URLSearchParams();
    if (query.isActive === true) params.set('isActive', 'true');
    if (query.isActive === false) params.set('isActive', 'false');
    const category = query.categoryPublicId?.trim();
    if (category) params.set('categoryPublicId', category);
    if (query.periode && BUDGET_PERIODES.includes(query.periode)) params.set('periode', query.periode);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

export const budgetsApi = {
    list(query: ListBudgetsQuery = {}) {
        return fetchWrapper.get(`/api/budgets${listQueryString(query)}`) as Promise<BudgetList>;
    },

    get(publicId: string) {
        return fetchWrapper.get(`/api/budgets/${encodeURIComponent(publicId)}`) as Promise<Budget>;
    },

    create(body: CreateBudgetPayload) {
        return fetchWrapper.post('/api/budgets', body) as Promise<Budget>;
    },

    update(publicId: string, body: UpdateBudgetPayload) {
        return fetchWrapper.put(`/api/budgets/${encodeURIComponent(publicId)}`, body) as Promise<Budget>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(`/api/budgets/${encodeURIComponent(publicId)}`) as Promise<void>;
    }
};
