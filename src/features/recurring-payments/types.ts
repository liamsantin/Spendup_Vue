export type RecurringKind = 'expense' | 'income';

export type RecurringExpenseType =
    | 'leasing'
    | 'assurance'
    | 'credit'
    | 'abonnement'
    | 'loyer'
    | 'impot'
    | 'service'
    | 'entretien'
    | 'other';

export type RecurringExpenseFrequency = 'quotidien' | 'hebdomadaire' | 'mensuel' | 'trimestriel' | 'semestriel' | 'annuel';

export type RecurringIncomeType =
    | 'salaire'
    | 'prime'
    | 'treiziemeSalaire'
    | 'freelance'
    | 'loyerEncaisse'
    | 'dividende'
    | 'interet'
    | 'rente'
    | 'pension'
    | 'allocation'
    | 'remboursement'
    | 'other';

export type RecurringIncomeFrequency = 'hebdomadaire' | 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle';

export type RecurringExpenseDueStatus = 'prevue' | 'generee' | 'payee' | 'enRetard' | 'canceled';
export type RecurringIncomeDueStatus = 'prevu' | 'pending' | 'encaisse' | 'partiel' | 'annule' | 'retard';
export type RecurringDueStatus = RecurringExpenseDueStatus | RecurringIncomeDueStatus;

export type RecurringDue = {
    publicId: string;
    scheduledAt: string;
    plannedAmount: number;
    actualAmount: number | null;
    status: string;
    transactionPublicId: string | null;
    notes: string | null;
};

export type RecurringDueList = {
    items: RecurringDue[];
    page: number;
    pageSize: number;
    totalCount: number;
};

export type RecurringFile = {
    publicId: string;
    nameOriginal: string;
    sizeBytes: number;
    mimeType: string;
};

export type RecurringExpense = {
    publicId: string;
    name: string;
    expenseType: RecurringExpenseType | string;
    frequency: RecurringExpenseFrequency | string;
    plannedAmount: number;
    currency: string;
    startDate: string;
    endDate: string | null;
    nextDueDate: string | null;
    isActive: boolean;
    accountPublicId: string;
    paymentMethodPublicId: string | null;
    categoryPublicId: string | null;
    tierPublicId: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string | null;
    upcomingDues: RecurringDue[];
    files: RecurringFile[];
};

export type RecurringIncome = {
    publicId: string;
    name: string;
    incomeType: RecurringIncomeType | string;
    frequency: RecurringIncomeFrequency | string;
    plannedAmount: number;
    currency: string;
    startDate: string;
    endDate: string | null;
    nextDueDate: string | null;
    isActive: boolean;
    accountPublicId: string;
    paymentMethodPublicId: string | null;
    categoryPublicId: string | null;
    tierPublicId: string | null;
    notes: string | null;
    paymentDay: number | null;
    createdAt: string;
    updatedAt: string | null;
    upcomingDues: RecurringDue[];
};

export type RecurringTemplate = RecurringExpense | RecurringIncome;

export type RecurringTemplateList<T> = {
    items: T[];
    page: number;
    pageSize: number;
    totalCount: number;
};

export type ListRecurringTemplatesQuery = {
    isActive?: boolean;
    accountPublicId?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
};

export type ListRecurringDuesQuery = {
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
};

export type CreateRecurringExpensePayload = {
    name: string;
    expenseType: RecurringExpenseType;
    frequency: RecurringExpenseFrequency;
    plannedAmount: number;
    startDate: string;
    endDate: string | null;
    isActive: boolean;
    accountPublicId: string;
    paymentMethodPublicId: string | null;
    categoryPublicId: string | null;
    tierPublicId: string | null;
    notes: string | null;
};

export type UpdateRecurringExpensePayload = CreateRecurringExpensePayload;

export type CreateRecurringIncomePayload = {
    name: string;
    incomeType: RecurringIncomeType;
    frequency: RecurringIncomeFrequency;
    plannedAmount: number;
    startDate: string;
    endDate: string | null;
    isActive: boolean;
    accountPublicId: string;
    paymentMethodPublicId: string | null;
    categoryPublicId: string | null;
    tierPublicId: string | null;
    notes: string | null;
    paymentDay: number | null;
};

export type UpdateRecurringIncomePayload = CreateRecurringIncomePayload;

export type ConfirmDueBody = {
    paymentDate?: string | null;
    amount?: number | null;
    paymentMethodPublicId?: string | null;
    notes?: string | null;
};

export type AttachRecurringFilePayload = {
    filePublicId: string;
};

export const RECURRING_EXPENSE_TYPES: RecurringExpenseType[] = [
    'leasing',
    'assurance',
    'credit',
    'abonnement',
    'loyer',
    'impot',
    'service',
    'entretien',
    'other'
];

export const RECURRING_EXPENSE_FREQUENCIES: RecurringExpenseFrequency[] = [
    'quotidien',
    'hebdomadaire',
    'mensuel',
    'trimestriel',
    'semestriel',
    'annuel'
];

export const RECURRING_INCOME_TYPES: RecurringIncomeType[] = [
    'salaire',
    'prime',
    'treiziemeSalaire',
    'freelance',
    'loyerEncaisse',
    'dividende',
    'interet',
    'rente',
    'pension',
    'allocation',
    'remboursement',
    'other'
];

export const RECURRING_INCOME_FREQUENCIES: RecurringIncomeFrequency[] = [
    'hebdomadaire',
    'mensuelle',
    'trimestrielle',
    'semestrielle',
    'annuelle'
];

export const RECURRING_EXPENSE_OPEN_DUE_STATUSES: RecurringExpenseDueStatus[] = ['prevue', 'generee', 'enRetard'];
export const RECURRING_INCOME_OPEN_DUE_STATUSES: RecurringIncomeDueStatus[] = ['prevu', 'pending', 'retard', 'partiel'];
export const RECURRING_EXPENSE_SETTLED_DUE_STATUS: RecurringExpenseDueStatus = 'payee';
export const RECURRING_INCOME_SETTLED_DUE_STATUS: RecurringIncomeDueStatus = 'encaisse';

export const RECURRING_EXPENSE_NAME_MAX = 200;
export const RECURRING_INCOME_NAME_MAX = 255;
export const RECURRING_NOTES_MAX = 2000;
export const RECURRING_PAGE_SIZE_DEFAULT = 50;
export const RECURRING_PAGE_SIZE_MAX = 200;
export const RECURRING_FILES_MAX = 5;
export const RECURRING_PAYMENT_DAY_MIN = 1;
export const RECURRING_PAYMENT_DAY_MAX = 28;
