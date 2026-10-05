import type { Budget } from '@/features/budgets/types';
import { findCategoryInTree } from '@/features/categories/format';
import type { Category } from '@/features/categories/types';
import { transactionToFormFields, type TransactionFormFields } from '@/features/transactions/payload';
import { canWriteTransaction } from '@/features/transactions/rights';
import type { Transaction } from '@/features/transactions/types';
import type { Account } from '@/features/accounts/types';

/** Catégorie du budget + enfants. `null` = enveloppe globale (toutes les dépenses). */
export function budgetLinkedCategoryIds(budget: Pick<Budget, 'categoryPublicId'>, categories: readonly Category[]): Set<string> | null {
    const id = budget.categoryPublicId?.trim();
    if (!id) return null;
    const ids = new Set<string>([id]);
    const node = findCategoryInTree(categories, id);
    for (const child of node?.children ?? []) ids.add(child.publicId);
    return ids;
}

export function isTransactionInBudgetWindow(
    transaction: Pick<Transaction, 'operationDate'>,
    budget: Pick<Budget, 'periodStart' | 'periodEnd'>
): boolean {
    return transaction.operationDate >= budget.periodStart && transaction.operationDate <= budget.periodEnd;
}

export function isTransactionCountedInBudget(
    transaction: Pick<Transaction, 'type' | 'operationDate' | 'categoryPublicId' | 'currency'>,
    budget: Pick<Budget, 'periodStart' | 'periodEnd' | 'currency' | 'categoryPublicId'>,
    linkedCategoryIds: Set<string> | null
): boolean {
    if (transaction.type !== 'depense') return false;
    if (transaction.currency !== budget.currency) return false;
    if (!isTransactionInBudgetWindow(transaction, budget)) return false;
    if (!linkedCategoryIds) return true;
    return !!transaction.categoryPublicId && linkedCategoryIds.has(transaction.categoryPublicId);
}

export function isTransactionLinkableToBudget(
    transaction: Transaction,
    budget: Pick<Budget, 'periodStart' | 'periodEnd' | 'currency' | 'categoryPublicId'>,
    linkedCategoryIds: Set<string> | null,
    accounts: readonly Pick<Account, 'publicId' | 'myRole' | 'isActive'>[]
): boolean {
    if (!budget.categoryPublicId) return false;
    if (transaction.amount == null) return false;
    if (!canWriteTransaction(transaction, accounts)) return false;
    if (isTransactionCountedInBudget(transaction, budget, linkedCategoryIds)) return false;
    if (transaction.type !== 'depense') return false;
    if (transaction.currency !== budget.currency) return false;
    return isTransactionInBudgetWindow(transaction, budget);
}

/** Dépense déjà dans l’enveloppe, que l’on peut retirer en vidant sa catégorie. */
export function isTransactionUnlinkableFromBudget(
    transaction: Transaction,
    budget: Pick<Budget, 'periodStart' | 'periodEnd' | 'currency' | 'categoryPublicId'>,
    linkedCategoryIds: Set<string> | null,
    accounts: readonly Pick<Account, 'publicId' | 'myRole' | 'isActive'>[]
): boolean {
    if (!budget.categoryPublicId) return false;
    if (transaction.amount == null) return false;
    if (!canWriteTransaction(transaction, accounts)) return false;
    return isTransactionCountedInBudget(transaction, budget, linkedCategoryIds);
}

export function transactionFormFieldsWithCategory(transaction: Transaction, categoryPublicId: string): TransactionFormFields | null {
    const fields = transactionToFormFields(transaction);
    if (!fields) return null;
    fields.categoryPublicId = categoryPublicId;
    return fields;
}
