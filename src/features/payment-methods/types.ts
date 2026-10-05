export type PaymentMethodType = 'carte' | 'virement' | 'prelevement' | 'cash' | 'twint' | 'paypal' | 'applePay' | 'googlePay' | 'other';

export type PaymentMethod = {
    publicId: string;
    accountPublicId: string;
    type: PaymentMethodType;
    label: string;
    reference: string | null;
    lastFourDigits: string | null;
    expirationDate: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string | null;
};

export type PaymentMethodList = {
    items: PaymentMethod[];
    page: number;
    pageSize: number;
    totalCount: number;
};

export type ListPaymentMethodsQuery = {
    accountPublicId?: string;
    page?: number;
    pageSize?: number;
};

export type CreatePaymentMethodPayload = {
    accountPublicId: string;
    type: PaymentMethodType;
    label: string;
    reference?: string | null;
    lastFourDigits?: string | null;
    expirationDate?: string | null;
    isActive?: boolean;
};

export type UpdatePaymentMethodPayload = {
    type: PaymentMethodType;
    label: string;
    reference: string | null;
    lastFourDigits: string | null;
    expirationDate: string | null;
    isActive: boolean;
};

export const PAYMENT_METHOD_TYPES: PaymentMethodType[] = [
    'carte',
    'virement',
    'prelevement',
    'cash',
    'twint',
    'paypal',
    'applePay',
    'googlePay',
    'other'
];

export const PAYMENT_METHOD_LABEL_MAX = 150;
export const PAYMENT_METHOD_REFERENCE_MAX = 100;
export const PAYMENT_METHOD_PAGE_SIZE_DEFAULT = 50;
export const PAYMENT_METHOD_PAGE_SIZE_MAX = 200;
