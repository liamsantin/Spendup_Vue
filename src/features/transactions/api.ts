import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import {
    TRANSACTION_PAGE_SIZE_DEFAULT,
    TRANSACTION_PAGE_SIZE_MAX,
    type CreateTransactionPayload,
    type ListTransactionsQuery,
    type Transaction,
    type TransactionList,
    type UpdateTransactionPayload
} from '@/features/transactions/types';

function clampPageSize(pageSize: number | undefined): number {
    const raw = pageSize ?? TRANSACTION_PAGE_SIZE_DEFAULT;
    if (!Number.isFinite(raw)) return TRANSACTION_PAGE_SIZE_DEFAULT;
    return Math.min(TRANSACTION_PAGE_SIZE_MAX, Math.max(1, Math.trunc(raw)));
}

export const transactionsApi = {
    list(query: ListTransactionsQuery = {}) {
        const page = Math.max(1, Math.trunc(query.page ?? 1));
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(clampPageSize(query.pageSize))
        });
        const accountPublicId = query.accountPublicId?.trim();
        if (accountPublicId) params.set('accountPublicId', accountPublicId);
        const categoryPublicId = query.categoryPublicId?.trim();
        if (categoryPublicId) params.set('categoryPublicId', categoryPublicId);
        const tierPublicId = query.tierPublicId?.trim();
        if (tierPublicId) params.set('tierPublicId', tierPublicId);
        const from = query.from?.trim();
        if (from) params.set('from', from);
        const to = query.to?.trim();
        if (to) params.set('to', to);
        return fetchWrapper.get(`/api/transactions?${params}`) as Promise<TransactionList>;
    },

    get(publicId: string) {
        return fetchWrapper.get(`/api/transactions/${encodeURIComponent(publicId)}`) as Promise<Transaction>;
    },

    create(body: CreateTransactionPayload) {
        return fetchWrapper.post('/api/transactions', body) as Promise<Transaction>;
    },

    update(publicId: string, body: UpdateTransactionPayload) {
        return fetchWrapper.put(`/api/transactions/${encodeURIComponent(publicId)}`, body) as Promise<Transaction>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(`/api/transactions/${encodeURIComponent(publicId)}`) as Promise<void>;
    }
};
