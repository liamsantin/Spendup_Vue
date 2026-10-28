import { transactionToFormFields, type TransactionFormFields } from '@/features/transactions/payload';
import { canWriteTransaction } from '@/features/transactions/rights';
import type { Account } from '@/features/accounts/types';
import type { Transaction } from '@/features/transactions/types';

/**
 * Transaction encore libre : pas d’actif visible, montant lisible, droit d’édition.
 * Un lien déjà posé sur un autre actif (y compris masqué pour un co-détenteur) est refusé par l’API.
 */
export function isTransactionLinkableToAsset(
    transaction: Transaction,
    accounts: readonly Pick<Account, 'publicId' | 'myRole' | 'isActive'>[]
): boolean {
    if (transaction.assetPublicId) return false;
    if (transaction.amount == null) return false;
    return canWriteTransaction(transaction, accounts);
}

/** Déjà rattachée à cet actif, montant lisible, droit d’édition. */
export function isTransactionUnlinkableFromAsset(
    transaction: Transaction,
    assetPublicId: string,
    accounts: readonly Pick<Account, 'publicId' | 'myRole' | 'isActive'>[]
): boolean {
    const id = assetPublicId.trim();
    if (!id || transaction.assetPublicId !== id) return false;
    if (transaction.amount == null) return false;
    return canWriteTransaction(transaction, accounts);
}

export function transactionFormFieldsWithAsset(transaction: Transaction, assetPublicId: string): TransactionFormFields | null {
    const fields = transactionToFormFields(transaction);
    if (!fields) return null;
    fields.assetPublicId = assetPublicId.trim();
    return fields;
}
