export type BudgetPeriode = 'hebdomadaire' | 'mensuel' | 'trimestriel' | 'annuel';

export type BudgetCurrency = 'CHF' | 'EUR' | 'USD' | 'GBP';

export type Budget = {
    publicId: string;
    name: string;
    limitAmount: number;
    currency: BudgetCurrency;
    periode: BudgetPeriode;
    startDate: string;
    endDate: string | null;
    isActive: boolean;
    categoryPublicId: string | null;
    periodStart: string;
    periodEnd: string;
    spentAmount: number;
    remainingAmount: number;
    percentUsed: number;
    isCurrent: boolean;
    createdAt: string;
    updatedAt: string | null;
};

export type BudgetList = {
    items: Budget[];
    totalCount: number;
};

export type ListBudgetsQuery = {
    isActive?: boolean;
    categoryPublicId?: string;
    periode?: BudgetPeriode;
};

export type CreateBudgetPayload = {
    name: string;
    limitAmount: number;
    periode: BudgetPeriode;
    startDate: string;
    endDate?: string | null;
    isActive?: boolean;
    categoryPublicId?: string | null;
    currency?: BudgetCurrency | null;
};

export type UpdateBudgetPayload = {
    name: string;
    limitAmount: number;
    periode: BudgetPeriode;
    startDate: string;
    endDate: string | null;
    isActive: boolean;
    categoryPublicId: string | null;
    currency: BudgetCurrency;
};

export const BUDGET_PERIODES: BudgetPeriode[] = ['hebdomadaire', 'mensuel', 'trimestriel', 'annuel'];

export const BUDGET_CURRENCIES: BudgetCurrency[] = ['CHF', 'EUR', 'USD', 'GBP'];

export const BUDGET_NAME_MAX = 150;

export const BUDGET_ALERT_WARN_PERCENT = 80;
export const BUDGET_ALERT_OVER_PERCENT = 100;
