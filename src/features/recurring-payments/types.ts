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

/** Ligne de la vue Échéances : une échéance et le modèle qui la porte. */
export type RecurringUpcomingRow = {
    kind: RecurringKind;
    templatePublicId: string;
    templateName: string;
    accountPublicId: string;
    currency: string;
    due: RecurringDue;
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
    /**
     * Tags **de l’utilisateur courant**, triés par nom. Jamais `null` (tableau vide).
     * Copiés sur la TX à la confirmation d’échéance.
     */
    tagPublicIds: string[];
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
    /** Max 10. PUT : toujours envoyé (`[]` détache). */
    tagPublicIds: string[];
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

/** Lie une TX manuelle ou importée existante à une échéance ouverte (1 TX ↔ 1 due). */
export type LinkDueBody = {
    transactionPublicId: string;
};

export type AttachRecurringFilePayload = {
    filePublicId: string;
};

/** Suggestion de récurrence : `propose` à traiter, `accepte` (modèle créé), `ignore` (refusée). */
export type RecurringSuggestionStatus = 'propose' | 'accepte' | 'ignore';

/** Fréquence détectée (même vocabulaire que les revenus récurrents). */
export type RecurringSuggestionFrequency = 'hebdomadaire' | 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle';

/** Série régulière détectée dans l’historique d’un compte, pas encore suivie par une récurrence. */
export type RecurringSuggestion = {
    publicId: string;
    /** `null` si le compte a été supprimé. */
    accountPublicId: string | null;
    type: 'depense' | 'revenu';
    /** Libellé banque de la série. */
    label: string;
    suggestedName: string;
    frequency: RecurringSuggestionFrequency | string;
    /** Positif : le sens est porté par `type`. Médian des 3 dernières occurrences. */
    amount: number;
    currency: string;
    occurrenceCount: number;
    firstOccurrence: string;
    lastOccurrence: string;
    nextExpectedDate: string;
    /** 0 à 0.99. */
    confidence: number;
    status: RecurringSuggestionStatus;
    categoryPublicId: string | null;
    tierPublicId: string | null;
    tierName: string | null;
    paymentMethodPublicId: string | null;
    /** Import qui a créé ou rafraîchi la suggestion. */
    sourceImportPublicId: string | null;
    recurringExpensePublicId: string | null;
    recurringIncomePublicId: string | null;
    transactionPublicIds: string[];
    createdAt: string;
    updatedAt: string | null;
};

/** Confiance décroissante. Non paginée. */
export type RecurringSuggestionList = {
    items: RecurringSuggestion[];
    totalCount: number;
};

/** `status` absent = `propose`. */
export type ListRecurringSuggestionsQuery = {
    accountPublicId?: string | null;
    status?: RecurringSuggestionStatus | null;
    importPublicId?: string | null;
};

/** Tout est optionnel : absent = valeur détectée ; `null` explicite = aucun (catégorie / tier / moyen). */
export type AcceptRecurringSuggestionPayload = {
    name?: string;
    type?: RecurringExpenseType | RecurringIncomeType;
    frequency?: RecurringExpenseFrequency | RecurringIncomeFrequency;
    plannedAmount?: number;
    startDate?: string;
    categoryPublicId?: string | null;
    tierPublicId?: string | null;
    paymentMethodPublicId?: string | null;
};

/** Un seul des deux modèles est renseigné, selon le sens de la suggestion. */
export type AcceptRecurringSuggestionResult = {
    suggestion: RecurringSuggestion;
    recurringExpense: RecurringExpense | null;
    recurringIncome: RecurringIncome | null;
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

export const RECURRING_SUGGESTION_FREQUENCIES: RecurringSuggestionFrequency[] = [
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
