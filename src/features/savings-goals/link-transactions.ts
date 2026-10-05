import type { Account } from '@/features/accounts/types';
import type { SavingsGoal } from '@/features/savings-goals/types';
import { emptyToNull } from '@/features/transactions/format';
import { canWriteTransaction } from '@/features/transactions/rights';
import { transactionToFormFields, type TransactionFormFields } from '@/features/transactions/payload';
import type { Transaction, TransactionStatus } from '@/features/transactions/types';

const COUNTED_STATUSES = new Set<TransactionStatus>(['validee', 'rapprochee']);

export function isCountedSavingsGoalTransactionStatus(status: TransactionStatus | string | null | undefined): boolean {
    return typeof status === 'string' && COUNTED_STATUSES.has(status as TransactionStatus);
}

export function transactionTouchesSavingsGoalAccount(
    transaction: Pick<Transaction, 'movements'>,
    accountPublicId: string | null | undefined
): boolean {
    const id = accountPublicId?.trim();
    if (!id) return false;
    return transaction.movements.some((movement) => movement.accountPublicId === id);
}

/** Comptes du formulaire qui peuvent porter un mouvement (source, et cible si transfert). */
export function transactionFormInvolvedAccountIds(
    fields: Pick<TransactionFormFields, 'accountPublicId' | 'counterpartyAccountPublicId' | 'type'>
): string[] {
    const ids = [fields.accountPublicId.trim()].filter(Boolean);
    const counterparty = emptyToNull(fields.counterpartyAccountPublicId);
    if (fields.type === 'transfert' && counterparty && !ids.includes(counterparty)) ids.push(counterparty);
    return ids;
}

export function isSavingsGoalCompatibleWithTransactionForm(
    goal: Pick<SavingsGoal, 'accountPublicId' | 'currency'>,
    fields: Pick<TransactionFormFields, 'accountPublicId' | 'counterpartyAccountPublicId' | 'type'>,
    accounts: readonly Pick<Account, 'publicId' | 'currency'>[]
): boolean {
    const accountId = goal.accountPublicId?.trim();
    if (!accountId) return false;
    if (!transactionFormInvolvedAccountIds(fields).includes(accountId)) return false;
    const source = accounts.find((item) => item.publicId === fields.accountPublicId.trim());
    if (source && source.currency !== goal.currency) return false;
    return true;
}

export function isTransactionLinkableToSavingsGoal(
    transaction: Transaction,
    goal: Pick<SavingsGoal, 'publicId' | 'accountPublicId' | 'currency'>,
    accounts: readonly Pick<Account, 'publicId' | 'myRole' | 'isActive'>[]
): boolean {
    if (!goal.accountPublicId) return false;
    if (transaction.amount == null) return false;
    if (!canWriteTransaction(transaction, accounts)) return false;
    if (transaction.savingsGoalPublicId) return false;
    if (transaction.currency !== goal.currency) return false;
    if (!isCountedSavingsGoalTransactionStatus(transaction.status)) return false;
    return transactionTouchesSavingsGoalAccount(transaction, goal.accountPublicId);
}

export function isTransactionUnlinkableFromSavingsGoal(
    transaction: Transaction,
    goal: Pick<SavingsGoal, 'publicId'>,
    accounts: readonly Pick<Account, 'publicId' | 'myRole' | 'isActive'>[]
): boolean {
    if (transaction.savingsGoalPublicId !== goal.publicId) return false;
    if (transaction.amount == null) return false;
    return canWriteTransaction(transaction, accounts);
}

export function transactionFormFieldsWithSavingsGoal(transaction: Transaction, savingsGoalPublicId: string): TransactionFormFields | null {
    const fields = transactionToFormFields(transaction);
    if (!fields) return null;
    fields.savingsGoalPublicId = savingsGoalPublicId;
    return fields;
}
