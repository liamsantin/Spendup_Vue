import type { Account } from '@/features/accounts/types';

/** Templates personnels : tout user authentifié les voit. Confirm / write sur le compte cible : editor+ actif. */
export function canWriteRecurringOnAccount(account: Pick<Account, 'myRole' | 'isActive'>): boolean {
    if (!account.isActive) return false;
    return account.myRole === 'owner' || account.myRole === 'editor';
}

export function canConfirmRecurringOnAccount(account: Pick<Account, 'myRole' | 'isActive'> | null | undefined): boolean {
    if (!account) return false;
    return canWriteRecurringOnAccount(account);
}
