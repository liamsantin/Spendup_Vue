import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import {
    RECURRING_PAGE_SIZE_DEFAULT,
    RECURRING_PAGE_SIZE_MAX,
    type AcceptRecurringSuggestionPayload,
    type AcceptRecurringSuggestionResult,
    type ConfirmDueBody,
    type CreateRecurringExpensePayload,
    type CreateRecurringIncomePayload,
    type LinkDueBody,
    type ListRecurringDuesQuery,
    type ListRecurringSuggestionsQuery,
    type ListRecurringTemplatesQuery,
    type RecurringDue,
    type RecurringDueList,
    type RecurringExpense,
    type RecurringIncome,
    type RecurringSuggestion,
    type RecurringSuggestionList,
    type RecurringTemplateList,
    type UpdateRecurringExpensePayload,
    type UpdateRecurringIncomePayload
} from '@/features/recurring-payments/types';

function clampPageSize(pageSize: number | undefined): number {
    const raw = pageSize ?? RECURRING_PAGE_SIZE_DEFAULT;
    if (!Number.isFinite(raw)) return RECURRING_PAGE_SIZE_DEFAULT;
    return Math.min(RECURRING_PAGE_SIZE_MAX, Math.max(1, Math.trunc(raw)));
}

function listParams(query: ListRecurringTemplatesQuery = {}): URLSearchParams {
    const page = Math.max(1, Math.trunc(query.page ?? 1));
    const params = new URLSearchParams({
        page: String(page),
        pageSize: String(clampPageSize(query.pageSize))
    });
    if (typeof query.isActive === 'boolean') params.set('isActive', String(query.isActive));
    const accountPublicId = query.accountPublicId?.trim();
    if (accountPublicId) params.set('accountPublicId', accountPublicId);
    const from = query.from?.trim();
    if (from) params.set('from', from);
    const to = query.to?.trim();
    if (to) params.set('to', to);
    return params;
}

function duesParams(query: ListRecurringDuesQuery = {}): URLSearchParams {
    const page = Math.max(1, Math.trunc(query.page ?? 1));
    const params = new URLSearchParams({
        page: String(page),
        pageSize: String(clampPageSize(query.pageSize))
    });
    const status = query.status?.trim();
    if (status) params.set('status', status);
    const from = query.from?.trim();
    if (from) params.set('from', from);
    const to = query.to?.trim();
    if (to) params.set('to', to);
    return params;
}

export const recurringExpensesApi = {
    list(query: ListRecurringTemplatesQuery = {}) {
        return fetchWrapper.get(`/api/recurring-expenses?${listParams(query)}`) as Promise<RecurringTemplateList<RecurringExpense>>;
    },

    get(publicId: string) {
        return fetchWrapper.get(`/api/recurring-expenses/${encodeURIComponent(publicId)}`) as Promise<RecurringExpense>;
    },

    create(body: CreateRecurringExpensePayload) {
        return fetchWrapper.post('/api/recurring-expenses', body) as Promise<RecurringExpense>;
    },

    update(publicId: string, body: UpdateRecurringExpensePayload) {
        return fetchWrapper.put(`/api/recurring-expenses/${encodeURIComponent(publicId)}`, body) as Promise<RecurringExpense>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(`/api/recurring-expenses/${encodeURIComponent(publicId)}`) as Promise<void>;
    },

    listDues(publicId: string, query: ListRecurringDuesQuery = {}) {
        return fetchWrapper.get(
            `/api/recurring-expenses/${encodeURIComponent(publicId)}/dues?${duesParams(query)}`
        ) as Promise<RecurringDueList>;
    },

    confirmDue(publicId: string, duePublicId: string, body: ConfirmDueBody = {}) {
        return fetchWrapper.post(
            `/api/recurring-expenses/${encodeURIComponent(publicId)}/dues/${encodeURIComponent(duePublicId)}/confirm`,
            body
        ) as Promise<RecurringDue>;
    },

    linkDue(publicId: string, duePublicId: string, body: LinkDueBody) {
        return fetchWrapper.post(
            `/api/recurring-expenses/${encodeURIComponent(publicId)}/dues/${encodeURIComponent(duePublicId)}/link`,
            body
        ) as Promise<RecurringDue>;
    },

    skipDue(publicId: string, duePublicId: string) {
        return fetchWrapper.post(
            `/api/recurring-expenses/${encodeURIComponent(publicId)}/dues/${encodeURIComponent(duePublicId)}/skip`,
            {}
        ) as Promise<RecurringDue>;
    },

    attachFile(publicId: string, filePublicId: string) {
        return fetchWrapper.post(`/api/recurring-expenses/${encodeURIComponent(publicId)}/files`, {
            filePublicId
        }) as Promise<RecurringExpense>;
    },

    detachFile(publicId: string, filePublicId: string) {
        return fetchWrapper.delete(
            `/api/recurring-expenses/${encodeURIComponent(publicId)}/files/${encodeURIComponent(filePublicId)}`
        ) as Promise<void>;
    }
};

export const recurringIncomesApi = {
    list(query: ListRecurringTemplatesQuery = {}) {
        return fetchWrapper.get(`/api/recurring-incomes?${listParams(query)}`) as Promise<RecurringTemplateList<RecurringIncome>>;
    },

    get(publicId: string) {
        return fetchWrapper.get(`/api/recurring-incomes/${encodeURIComponent(publicId)}`) as Promise<RecurringIncome>;
    },

    create(body: CreateRecurringIncomePayload) {
        return fetchWrapper.post('/api/recurring-incomes', body) as Promise<RecurringIncome>;
    },

    update(publicId: string, body: UpdateRecurringIncomePayload) {
        return fetchWrapper.put(`/api/recurring-incomes/${encodeURIComponent(publicId)}`, body) as Promise<RecurringIncome>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(`/api/recurring-incomes/${encodeURIComponent(publicId)}`) as Promise<void>;
    },

    listDues(publicId: string, query: ListRecurringDuesQuery = {}) {
        return fetchWrapper.get(
            `/api/recurring-incomes/${encodeURIComponent(publicId)}/dues?${duesParams(query)}`
        ) as Promise<RecurringDueList>;
    },

    confirmDue(publicId: string, duePublicId: string, body: ConfirmDueBody = {}) {
        return fetchWrapper.post(
            `/api/recurring-incomes/${encodeURIComponent(publicId)}/dues/${encodeURIComponent(duePublicId)}/confirm`,
            body
        ) as Promise<RecurringDue>;
    },

    linkDue(publicId: string, duePublicId: string, body: LinkDueBody) {
        return fetchWrapper.post(
            `/api/recurring-incomes/${encodeURIComponent(publicId)}/dues/${encodeURIComponent(duePublicId)}/link`,
            body
        ) as Promise<RecurringDue>;
    },

    skipDue(publicId: string, duePublicId: string) {
        return fetchWrapper.post(
            `/api/recurring-incomes/${encodeURIComponent(publicId)}/dues/${encodeURIComponent(duePublicId)}/skip`,
            {}
        ) as Promise<RecurringDue>;
    }
};

/** Suggestions personnelles : visibles tant que l’utilisateur est éditeur du compte. */
export const recurringSuggestionsApi = {
    /** Confiance décroissante ; `status` absent = `propose`. */
    list(query: ListRecurringSuggestionsQuery = {}) {
        const params = new URLSearchParams();
        const accountPublicId = query.accountPublicId?.trim();
        if (accountPublicId) params.set('accountPublicId', accountPublicId);
        if (query.status) params.set('status', query.status);
        const importPublicId = query.importPublicId?.trim();
        if (importPublicId) params.set('importPublicId', importPublicId);
        const qs = params.toString();
        const suffix = qs ? `?${qs}` : '';
        return fetchWrapper.get(`/api/recurring-suggestions${suffix}`) as Promise<RecurringSuggestionList>;
    },

    /** Relance la détection sur le compte ; renvoie ses suggestions `propose`. */
    scan(accountPublicId: string) {
        return fetchWrapper.post('/api/recurring-suggestions/scan', { accountPublicId }) as Promise<RecurringSuggestionList>;
    },

    /** Crée la charge ou le revenu récurrent ; `{}` = valeurs détectées. */
    accept(publicId: string, body: AcceptRecurringSuggestionPayload = {}) {
        return fetchWrapper.post(
            `/api/recurring-suggestions/${encodeURIComponent(publicId)}/accept`,
            body
        ) as Promise<AcceptRecurringSuggestionResult>;
    },

    /** Ne sera plus jamais reproposée. */
    dismiss(publicId: string) {
        return fetchWrapper.post(`/api/recurring-suggestions/${encodeURIComponent(publicId)}/dismiss`, {}) as Promise<RecurringSuggestion>;
    }
};
