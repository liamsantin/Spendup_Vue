import type { Transaction } from '@/features/transactions/types';

/**
 * Une opération créée par un import bancaire peut être supprimée (doublon, mauvais compte), mais on prévient :
 * la supprimer crée un écart avec le relevé. Avertir, pas interdire.
 */
export function isImportedTransaction(transaction: Pick<Transaction, 'source'> | null | undefined): boolean {
    return transaction?.source === 'import';
}
