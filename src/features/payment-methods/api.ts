import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import {
    PAYMENT_METHOD_PAGE_SIZE_DEFAULT,
    PAYMENT_METHOD_PAGE_SIZE_MAX,
    type CreatePaymentMethodPayload,
    type ListPaymentMethodsQuery,
    type PaymentMethod,
    type PaymentMethodList,
    type UpdatePaymentMethodPayload
} from '@/features/payment-methods/types';

function clampPageSize(pageSize: number | undefined): number {
    const raw = pageSize ?? PAYMENT_METHOD_PAGE_SIZE_DEFAULT;
    if (!Number.isFinite(raw)) return PAYMENT_METHOD_PAGE_SIZE_DEFAULT;
    return Math.min(PAYMENT_METHOD_PAGE_SIZE_MAX, Math.max(1, Math.trunc(raw)));
}

export const paymentMethodsApi = {
    list(query: ListPaymentMethodsQuery = {}) {
        const page = Math.max(1, Math.trunc(query.page ?? 1));
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(clampPageSize(query.pageSize))
        });
        const accountPublicId = query.accountPublicId?.trim();
        if (accountPublicId) {
            params.set('accountPublicId', accountPublicId);
        }
        return fetchWrapper.get(`/api/payment-methods?${params}`) as Promise<PaymentMethodList>;
    },

    get(publicId: string) {
        return fetchWrapper.get(`/api/payment-methods/${encodeURIComponent(publicId)}`) as Promise<PaymentMethod>;
    },

    create(body: CreatePaymentMethodPayload) {
        return fetchWrapper.post('/api/payment-methods', body) as Promise<PaymentMethod>;
    },

    update(publicId: string, body: UpdatePaymentMethodPayload) {
        return fetchWrapper.put(`/api/payment-methods/${encodeURIComponent(publicId)}`, body) as Promise<PaymentMethod>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(`/api/payment-methods/${encodeURIComponent(publicId)}`) as Promise<void>;
    }
};
