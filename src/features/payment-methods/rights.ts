import type { Account } from '@/features/accounts/types';

export function canViewPaymentMethods(account: Pick<Account, 'myRole'>): boolean {
    return account.myRole === 'owner' || account.myRole === 'editor' || account.myRole === 'viewer';
}

/** Créer / modifier / supprimer — editor+ sur compte actif. */
export function canWritePaymentMethods(account: Pick<Account, 'myRole' | 'isActive'>): boolean {
    if (!account.isActive) return false;
    return account.myRole === 'owner' || account.myRole === 'editor';
}
