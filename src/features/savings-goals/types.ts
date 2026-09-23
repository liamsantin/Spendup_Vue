export type SavingsGoalStatus = 'active' | 'atteint' | 'abandonne';

export type SavingsGoalCurrency = 'CHF' | 'EUR' | 'USD' | 'GBP';

export type SavingsGoalContribution = {
    transactionPublicId: string;
    label: string;
    /** Date calendaire `yyyy-MM-dd`. */
    operationDate: string;
    /** Signé : positif = versement, négatif = retrait. */
    amount: number;
};

export type SavingsGoal = {
    publicId: string;
    name: string;
    targetAmount: number;
    /** Argent déjà de côté avant Spendup — seul montant saisi par le client. */
    openingAmount: number;
    /** Somme des transactions rattachées (validee/rapprochee, même devise, mouvement sur le compte). */
    contributedAmount: number;
    /** `openingAmount` + `contributedAmount`. */
    currentAmount: number;
    remainingAmount: number;
    percentReached: number;
    currency: SavingsGoalCurrency;
    targetDate: string | null;
    /** Estimation d’atteinte (moyenne nette 3 mois). `null` si rythme ≤ 0 ou cible déjà couverte. */
    projectedDate: string | null;
    status: SavingsGoalStatus;
    isOverdue: boolean;
    accountPublicId: string | null;
    /** Détail : 20 dernières, plus récentes d’abord. Liste : toujours `[]`. */
    contributions: SavingsGoalContribution[];
    createdAt: string;
    updatedAt: string | null;
};

export type SavingsGoalList = {
    items: SavingsGoal[];
    totalCount: number;
};

export type ListSavingsGoalsQuery = {
    status?: SavingsGoalStatus;
    accountPublicId?: string;
};

export type CreateSavingsGoalPayload = {
    name: string;
    targetAmount: number;
    openingAmount?: number;
    targetDate?: string | null;
    accountPublicId?: string | null;
    currency?: SavingsGoalCurrency | null;
};

export type UpdateSavingsGoalPayload = {
    name: string;
    targetAmount: number;
    openingAmount: number;
    targetDate: string | null;
    accountPublicId: string | null;
    currency: SavingsGoalCurrency;
    status: SavingsGoalStatus | null;
};

export const SAVINGS_GOAL_STATUSES: SavingsGoalStatus[] = ['active', 'atteint', 'abandonne'];

export const SAVINGS_GOAL_CURRENCIES: SavingsGoalCurrency[] = ['CHF', 'EUR', 'USD', 'GBP'];

export const SAVINGS_GOAL_NAME_MAX = 150;

export const SAVINGS_GOAL_NOT_FOUND_MESSAGE = 'Objectif introuvable.';
