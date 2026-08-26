import type { Account, AccountRole, AccountShare } from '@/features/accounts/types';

export function canViewAccount(account: Pick<Account, 'myRole'>): boolean {
    return account.myRole === 'owner' || account.myRole === 'editor' || account.myRole === 'viewer';
}

/**
 * Compte partagé : reçu (`!isOwned`) ou possédé avec au moins un partage accepté.
 * Utilisé pour afficher l’auteur des relevés de solde.
 */
export function isSharedAccount(
    account: Pick<Account, 'isOwned'>,
    shares: Pick<AccountShare, 'role'>[] = []
): boolean {
    if (!account.isOwned) return true;
    return shares.some((s) => s.role === 'viewer' || s.role === 'editor');
}

export function canCreateAccount(): boolean {
    return true;
}

/** Rename léger + édition (owner ou editor) — compte actif uniquement. */
export function canEditAccount(account: Pick<Account, 'myRole' | 'isActive'>): boolean {
    if (!account.isActive) return false;
    return account.myRole === 'owner' || account.myRole === 'editor';
}

/**
 * Champs structurants du compte (solde initial, IBAN, type, devise, primary).
 * Owner seulement — un editor qui les envoie reçoit une BusinessException.
 */
export function canEditAccountOwnerFields(account: Pick<Account, 'myRole'>): boolean {
    return account.myRole === 'owner';
}

/** Create / delete relevés de solde — editor+ sur compte actif. */
export function canWriteBalanceSnapshots(account: Pick<Account, 'myRole' | 'isActive'>): boolean {
    if (!account.isActive) return false;
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

/** Inviter / gérer les partages — owner owned sur compte actif. */
export function canManageShares(account: Pick<Account, 'myRole' | 'isOwned' | 'isActive'>): boolean {
    if (!account.isActive) return false;
    return account.isOwned && account.myRole === 'owner';
}

/** Quitter un partage actif — destinataire uniquement (`isOwned: false`). */
export function canLeaveAccountShare(account: Pick<Account, 'isOwned' | 'myRole'>): boolean {
    if (account.isOwned) return false;
    return account.myRole === 'viewer' || account.myRole === 'editor';
}

export function isPrimaryActionBlocked(account: Pick<Account, 'isPrimary'>): boolean {
    return account.isPrimary;
}

export function roleLabelKey(role: AccountRole | 'pending'): string {
    return `comptesPage.roles.${role}`;
}
