import { defineStore } from 'pinia';
import { AppError } from '@/utils/errors/app-error';
import {
    createRecurringPaymentsState,
    createRecurringPaymentsCrud,
    createRecurringPaymentsRealtime,
    createRecurringPaymentsLifecycle,
    RECURRING_LIST_MAX_AGE_MS
} from '@/features/recurring-payments/stores/internal';

export { RECURRING_LIST_MAX_AGE_MS };

export const useRecurringPaymentsStore = defineStore('recurringPayments', () => {
    const state = createRecurringPaymentsState();
    const crud = createRecurringPaymentsCrud(state);
    const realtime = createRecurringPaymentsRealtime(state, {
        refetchKind: crud.refetchKind,
        getExpense: crud.getExpense,
        getIncome: crud.getIncome,
        loadDues: crud.loadDues
    });
    const lifecycle = createRecurringPaymentsLifecycle(state, {
        loadExpenses: crud.loadExpenses,
        loadIncomes: crud.loadIncomes,
        cancelPendingLoads: crud.cancelPendingLoads,
        ensureRealtimeBridge: realtime.ensureRealtimeBridge,
        teardownRealtimeBridge: realtime.teardownRealtimeBridge
    });

    function toAppError(e: unknown): AppError {
        return AppError.fromUnknown(e);
    }

    return {
        expenses: state.expenses,
        incomes: state.incomes,
        expensePage: state.expensePage,
        expensePageSize: state.expensePageSize,
        expenseTotalCount: state.expenseTotalCount,
        incomePage: state.incomePage,
        incomePageSize: state.incomePageSize,
        incomeTotalCount: state.incomeTotalCount,
        loadingExpenses: state.loadingExpenses,
        loadingIncomes: state.loadingIncomes,
        loadingMoreExpenses: state.loadingMoreExpenses,
        loadingMoreIncomes: state.loadingMoreIncomes,
        loadingDetail: state.loadingDetail,
        loadingDues: state.loadingDues,
        acting: state.acting,
        initializedExpenses: state.initializedExpenses,
        initializedIncomes: state.initializedIncomes,
        error: state.error,
        hasExpenses: state.hasExpenses,
        hasIncomes: state.hasIncomes,
        hasMoreExpenses: state.hasMoreExpenses,
        hasMoreIncomes: state.hasMoreIncomes,
        getDetail: state.getDetail,
        getDues: state.getDues,
        clearError: state.clearError,
        loadExpenses: crud.loadExpenses,
        loadIncomes: crud.loadIncomes,
        loadMoreExpenses: crud.loadMoreExpenses,
        loadMoreIncomes: crud.loadMoreIncomes,
        getExpense: crud.getExpense,
        getIncome: crud.getIncome,
        createExpense: crud.createExpense,
        createIncome: crud.createIncome,
        updateExpense: crud.updateExpense,
        updateIncome: crud.updateIncome,
        deleteExpense: crud.deleteExpense,
        deleteIncome: crud.deleteIncome,
        loadDues: crud.loadDues,
        confirmDue: crud.confirmDue,
        skipDue: crud.skipDue,
        attachExpenseFile: crud.attachExpenseFile,
        detachExpenseFile: crud.detachExpenseFile,
        refetchKind: crud.refetchKind,
        onAuthenticatedSession: realtime.onAuthenticatedSession,
        bootstrap: lifecycle.bootstrap,
        reset: lifecycle.reset,
        toAppError
    };
});
