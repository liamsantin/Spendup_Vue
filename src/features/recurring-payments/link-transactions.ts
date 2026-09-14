import type { Account } from '@/features/accounts/types';
import type { RecurringKind } from '@/features/recurring-payments/types';
import { involvedAccountPublicIds, sourceAccountPublicId } from '@/features/transactions/format';
import { canWriteTransaction } from '@/features/transactions/rights';
import type { Transaction } from '@/features/transactions/types';

/** TX déjà rattachée à une échéance / un template. */
export function isTransactionLinkedToRecurrence(
    transaction: Pick<Transaction, 'source' | 'recurringExpensePublicId' | 'recurringIncomePublicId' | 'duePublicId'>
): boolean {
    if (transaction.source === 'recurrence') return true;
    if (transaction.duePublicId?.trim()) return true;
    if (transaction.recurringExpensePublicId?.trim()) return true;
    if (transaction.recurringIncomePublicId?.trim()) return true;
    return false;
}

/**
 * Candidat pour `POST …/dues/{due}/link` :
 * TX manuelle, bon type, même compte que le template, pas déjà liée, éditable.
 */
export function isTransactionLinkableToRecurrence(
    transaction: Transaction,
    kind: RecurringKind,
    accountPublicId: string,
    accounts: readonly Pick<Account, 'publicId' | 'myRole' | 'isActive'>[]
): boolean {
    const accountId = accountPublicId.trim();
    if (!accountId) return false;
    if (transaction.amount == null) return false;
    if (!canWriteTransaction(transaction, accounts)) return false;
    if (isTransactionLinkedToRecurrence(transaction)) return false;
    if (transaction.source !== 'manuelle') return false;
    if (kind === 'expense' && transaction.type !== 'depense') return false;
    if (kind === 'income' && transaction.type !== 'revenu') return false;
    const sourceId = sourceAccountPublicId(transaction);
    if (sourceId === accountId) return true;
    return involvedAccountPublicIds(transaction).includes(accountId);
}
