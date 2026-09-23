export type SavingsGoalStatus = 'active' | 'atteint' | 'abandonne';

export type SavingsGoalCurrency = 'CHF' | 'EUR' | 'USD' | 'GBP';

export type SavingsGoal = {
    publicId: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    remainingAmount: number;
    percentReached: number;
    currency: SavingsGoalCurrency;
    targetDate: string | null;
    status: SavingsGoalStatus;
    isOverdue: boolean;
    accountPublicId: string | null;
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
    currentAmount?: number;
    targetDate?: string | null;
    accountPublicId?: string | null;
    currency?: SavingsGoalCurrency | null;
};

export type UpdateSavingsGoalPayload = {
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string | null;
    accountPublicId: string | null;
    currency: SavingsGoalCurrency;
    status: SavingsGoalStatus | null;
};

export const SAVINGS_GOAL_STATUSES: SavingsGoalStatus[] = ['active', 'atteint', 'abandonne'];

export const SAVINGS_GOAL_CURRENCIES: SavingsGoalCurrency[] = ['CHF', 'EUR', 'USD', 'GBP'];

export const SAVINGS_GOAL_NAME_MAX = 150;

export const SAVINGS_GOAL_NOT_FOUND_MESSAGE = 'Objectif introuvable.';
