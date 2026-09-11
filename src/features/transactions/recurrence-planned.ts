import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import type { RecurringKind } from '@/features/recurring-payments/types';
import type { Transaction } from '@/features/transactions/types';

function templateKind(transaction: Pick<Transaction, 'recurringExpensePublicId' | 'recurringIncomePublicId'>): RecurringKind | null {
    if (transaction.recurringExpensePublicId) return 'expense';
    if (transaction.recurringIncomePublicId) return 'income';
    return null;
}

function templatePublicId(transaction: Pick<Transaction, 'recurringExpensePublicId' | 'recurringIncomePublicId'>): string | null {
    return transaction.recurringExpensePublicId?.trim() || transaction.recurringIncomePublicId?.trim() || null;
}

/** Montant prévu de l’échéance liée, depuis le DTO ou le cache récurrences. */
export function plannedAmountForRecurrenceTransaction(transaction: Transaction): number | null {
    if (transaction.source !== 'recurrence') return null;
    if (transaction.duePlannedAmount != null) return transaction.duePlannedAmount;
    const kind = templateKind(transaction);
    const publicId = templatePublicId(transaction);
    if (!kind || !publicId) return null;
    const store = useRecurringPaymentsStore();
    void store.duesEpoch;
    void store.detailsEpoch;
    const dueId = transaction.duePublicId?.trim();
    if (dueId) {
        const due = store.getDues(kind, publicId).find((item) => item.publicId === dueId);
        if (due) return due.plannedAmount;
    }
    const detail = store.getDetail(kind, publicId);
    if (detail) return detail.plannedAmount;
    const list = kind === 'expense' ? store.expenses : store.incomes;
    return list.find((item) => item.publicId === publicId)?.plannedAmount ?? null;
}
