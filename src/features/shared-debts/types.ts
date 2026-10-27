export type SharedDebtRole = 'creditor' | 'debtor';

export type SharedDebtStatus = 'aRembourser' | 'partiellementRemboursee' | 'remboursee' | 'canceled';

export type SharedDebtCurrency = 'CHF' | 'EUR' | 'USD' | 'GBP';

/** L’autre partie de la dette (débiteur vu par le créancier, créancier vu par le débiteur). */
export type SharedDebtCounterpart = {
    publicId: string;
    username: string | null;
    firstName: string | null;
    name: string | null;
    profilePicture: string | null;
};

export type SharedDebt = {
    publicId: string;
    /** Point de vue de l’utilisateur courant. */
    role: SharedDebtRole;
    counterpart: SharedDebtCounterpart;
    label: string;
    amount: number;
    repaidAmount: number;
    remainingAmount: number;
    currency: SharedDebtCurrency;
    /** Dérivé de `repaidAmount` ; `canceled` via `/cancel`. */
    status: SharedDebtStatus;
    /** Date calendaire `yyyy-MM-dd` ou `null`. */
    dueDate: string | null;
    /** Horodatage ISO posé à la clôture (remboursée ou annulée). */
    settledAt: string | null;
    /** Dépense liée — toujours `null` côté débiteur. */
    transactionPublicId: string | null;
    createdAt: string;
    updatedAt: string | null;
};

export type SharedDebtsListResult = {
    items: SharedDebt[];
    totalCount: number;
    /** Reste dû par les amis (rôle créancier), devise `currency`. */
    totalOwedToMe: number;
    /** Reste que je dois (rôle débiteur), devise `currency`. */
    totalIOwe: number;
    currency: SharedDebtCurrency;
};

export type ListSharedDebtsQuery = {
    role?: SharedDebtRole;
    status?: SharedDebtStatus;
};

export type CreateSharedDebtPayload = {
    debtorUserPublicId: string;
    amount: number;
    /** Obligatoire sans transaction ; sinon `null` = libellé de la transaction. */
    label: string | null;
    transactionPublicId: string | null;
    /** Ignorée si une transaction est liée (devise de la transaction). `null` = devise des settings. */
    currency: SharedDebtCurrency | null;
    dueDate: string | null;
};

/** Seulement tant que rien n’est remboursé. */
export type UpdateSharedDebtPayload = {
    label: string;
    amount: number;
    dueDate: string | null;
};

export type SettleSharedDebtPayload = {
    /** Omis = tout le restant. Jamais au-dessus du restant. */
    amount?: number;
    /** `yyyy-MM-dd`, jamais future. */
    date?: string;
};

export const SHARED_DEBT_ROLES: SharedDebtRole[] = ['creditor', 'debtor'];

export const SHARED_DEBT_STATUSES: SharedDebtStatus[] = ['aRembourser', 'partiellementRemboursee', 'remboursee', 'canceled'];

export const SHARED_DEBT_CURRENCIES: SharedDebtCurrency[] = ['CHF', 'EUR', 'USD', 'GBP'];

export const SHARED_DEBT_LABEL_MAX = 150;

export const SHARED_DEBT_DEFAULT_ROLE: SharedDebtRole = 'creditor';

export const SHARED_DEBT_NOT_FOUND_MESSAGE = 'Dette introuvable.';
