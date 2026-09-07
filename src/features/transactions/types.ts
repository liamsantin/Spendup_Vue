export type TransactionType = 'depense' | 'revenu' | 'transfert';
export type TransactionStatus = 'validee';
export type TransactionSource = 'manuelle';
export type MovementSens = 'debit' | 'credit';

export type TransactionMovement = {
    accountPublicId: string;
    /** `null` si le viewer a le solde masqué sur un compte touché. */
    amount: number | null;
    sens: MovementSens;
};

export type Transaction = {
    publicId: string;
    type: TransactionType;
    status: TransactionStatus;
    source: TransactionSource;
    label: string;
    /** `null` si le viewer a le solde masqué. */
    amount: number | null;
    currency: string;
    /** Date calendaire `yyyy-MM-dd`. */
    operationDate: string;
    /** Date calendaire `yyyy-MM-dd`, ou `null`. */
    valueDate: string | null;
    paymentMethodPublicId: string | null;
    categoryPublicId: string | null;
    createdByUserPublicId: string;
    createdByDisplayName: string;
    createdByPhotoUrl: string | null;
    createdAt: string;
    updatedAt: string | null;
    movements: TransactionMovement[];
};

export type TransactionList = {
    items: Transaction[];
    page: number;
    pageSize: number;
    totalCount: number;
};

export type ListTransactionsQuery = {
    accountPublicId?: string;
    categoryPublicId?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
};

export type CreateTransactionPayload = {
    type: TransactionType;
    accountPublicId: string;
    counterpartyAccountPublicId?: string | null;
    label: string;
    amount: number;
    operationDate: string;
    valueDate?: string | null;
    paymentMethodPublicId?: string | null;
    categoryPublicId?: string | null;
};

export type UpdateTransactionPayload = {
    label: string;
    amount: number;
    operationDate: string;
    valueDate: string | null;
    paymentMethodPublicId: string | null;
    categoryPublicId: string | null;
};

export const TRANSACTION_TYPES: TransactionType[] = ['depense', 'revenu', 'transfert'];

export const TRANSACTION_LABEL_MAX = 255;
export const TRANSACTION_PAGE_SIZE_DEFAULT = 50;
export const TRANSACTION_PAGE_SIZE_MAX = 200;
