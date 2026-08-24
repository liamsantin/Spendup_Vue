import type { Account, AccountRole } from '@/features/accounts/types';

export function canViewAccount(account: Pick<Account, 'myRole'>): boolean {
    return account.myRole === 'owner' || account.myRole === 'editor' || account.myRole === 'viewer';
}

export function canCreateAccount(): boolean {
    return true;
}

export function canEditAccount(account: Pick<Account, 'myRole'>): boolean {
    return account.myRole === 'owner' || account.myRole === 'editor';
}

export function canArchiveAccount(account: Pick<Account, 'myRole' | 'isPrimary' | 'isActive'>): boolean {
    if (account.isPrimary || !account.isActive) return false;
    return account.myRole === 'owner' || account.myRole === 'editor';
}

export function canRestoreAccount(account: Pick<Account, 'myRole' | 'isActive'>): boolean {
    if (account.isActive) return false;
    return account.myRole === 'owner' || account.myRole === 'editor';
}

export function canSetPrimaryAccount(account: Pick<Account, 'myRole' | 'isOwned' | 'isPrimary' | 'isActive'>): boolean {
    if (!account.isOwned || account.isPrimary || !account.isActive) return false;
    return account.myRole === 'owner';
}

export function canDeleteAccount(account: Pick<Account, 'myRole' | 'isOwned' | 'isPrimary'>): boolean {
    if (!account.isOwned || account.isPrimary) return false;
    return account.myRole === 'owner';
}

export function canManageShares(account: Pick<Account, 'myRole' | 'isOwned'>): boolean {
    return account.isOwned && account.myRole === 'owner';
}

export function isPrimaryActionBlocked(account: Pick<Account, 'isPrimary'>): boolean {
    return account.isPrimary;
}

export function roleLabelKey(role: AccountRole | 'pending'): string {
    return `comptesPage.roles.${role}`;
}
