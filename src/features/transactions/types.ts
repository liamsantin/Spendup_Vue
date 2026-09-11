export type TransactionType = 'depense' | 'revenu' | 'transfert';
export type TransactionStatus = 'validee';
export type TransactionSource = 'manuelle' | 'recurrence';
export type MovementSens = 'debit' | 'credit';

export type TransactionFile = {
    publicId: string;
    nameOriginal: string;
    sizeBytes: number;
    mimeType: string;
};

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
    /** Présent si `source === "recurrence"`. */
    recurringExpensePublicId: string | null;
    recurringIncomePublicId: string | null;
    duePublicId: string | null;
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
    /** Contrepartie **personnelle** : `null` aussi quand le tier appartient à un co-détenteur. */
    tierPublicId: string | null;
    createdByUserPublicId: string;
    createdByDisplayName: string;
    createdByPhotoUrl: string | null;
    createdAt: string;
    updatedAt: string | null;
    movements: TransactionMovement[];
    /** Justificatifs PDF. Toujours un tableau (éventuellement vide). */
    files: TransactionFile[];
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
    tierPublicId?: string;
    recurringExpensePublicId?: string;
    recurringIncomePublicId?: string;
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
    tierPublicId?: string | null;
    /** PDF déjà uploadés via `/api/files`. Max 5, dédupliqués côté API. */
    filePublicIds?: string[];
};

export type UpdateTransactionPayload = {
    label: string;
    amount: number;
    operationDate: string;
    valueDate: string | null;
    paymentMethodPublicId: string | null;
    categoryPublicId: string | null;
    /** État complet : `null` détache le tier. */
    tierPublicId: string | null;
};

export type AttachTransactionFilePayload = {
    filePublicId: string;
};

export const TRANSACTION_TYPES: TransactionType[] = ['depense', 'revenu', 'transfert'];

export const TRANSACTION_LABEL_MAX = 255;
export const TRANSACTION_SEARCH_MAX = 100;
export const TRANSACTION_PAGE_SIZE_DEFAULT = 50;
export const TRANSACTION_PAGE_SIZE_MAX = 200;
/** Justificatifs PDF par transaction. */
export const TRANSACTION_FILES_MAX = 5;
export const FILE_ALREADY_LINKED_MESSAGE = 'Fichier déjà lié.';
export const TRANSACTION_MAX_FILES_MESSAGE = 'Une transaction accepte au plus 5 fichiers.';
