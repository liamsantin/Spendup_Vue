import type { Account } from '@/features/accounts/types';
import { involvedAccountPublicIds } from '@/features/transactions/format';
import type { Transaction } from '@/features/transactions/types';

export function canViewTransactions(account: Pick<Account, 'myRole'>): boolean {
    return account.myRole === 'owner' || account.myRole === 'editor' || account.myRole === 'viewer';
}

/** Créer / modifier / supprimer — editor+ sur compte actif. */
export function canWriteTransactions(account: Pick<Account, 'myRole' | 'isActive'>): boolean {
    if (!account.isActive) return false;
    return account.myRole === 'owner' || account.myRole === 'editor';
}

/**
 * Écriture sur une transaction existante : editor+ et comptes actifs sur **tous** les comptes touchés.
 */
export function canWriteTransaction(
    transaction: Pick<Transaction, 'movements'>,
    accounts: readonly Pick<Account, 'publicId' | 'myRole' | 'isActive'>[]
): boolean {
    const ids = involvedAccountPublicIds(transaction);
    if (!ids.length) return false;
    return ids.every((id) => {
        const account = accounts.find((a) => a.publicId === id);
        return !!account && canWriteTransactions(account);
    });
}

/** Transfert : editor+ sur les deux comptes, tous deux actifs. */
export function canWriteTransfer(
    source: Pick<Account, 'myRole' | 'isActive'> | null | undefined,
    target: Pick<Account, 'myRole' | 'isActive'> | null | undefined
): boolean {
    if (!source || !target) return false;
    return canWriteTransactions(source) && canWriteTransactions(target);
}
