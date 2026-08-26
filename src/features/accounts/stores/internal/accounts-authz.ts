import type { Account, IncomingAccountShare } from '@/features/accounts/types';
import { AppError } from '@/utils/errors/app-error';

export const ACCOUNT_FORBIDDEN_CODE = 'account_forbidden';
export const ACCOUNT_NOT_FOUND_CODE = 'account_not_found';
export const SHARE_INVITE_NOT_FOUND_CODE = 'share_invite_not_found';

export const ACCOUNT_FORBIDDEN_MESSAGE = 'Action non autorisée sur ce compte.';
export const ACCOUNT_NOT_FOUND_MESSAGE = 'Compte introuvable.';
export const SHARE_INVITE_NOT_FOUND_MESSAGE = 'Invitation introuvable.';

/**
 * Résout un compte depuis la sélection ou la liste locale (défense en profondeur côté store).
 */
export function resolveLocalAccount(
    accounts: readonly Account[],
    selectedAccount: Account | null,
    publicId: string
): Account | null {
    if (selectedAccount?.publicId === publicId) return selectedAccount;
    return accounts.find((a) => a.publicId === publicId) ?? null;
}

/**
 * Exige un compte connu localement ; sinon 404 (fail-closed, pas d’appel API).
 */
export function requireLocalAccount(
    accounts: readonly Account[],
    selectedAccount: Account | null,
    publicId: string
): Account {
    const account = resolveLocalAccount(accounts, selectedAccount, publicId);
    if (!account) {
        throw new AppError(ACCOUNT_NOT_FOUND_MESSAGE, 404, ACCOUNT_NOT_FOUND_CODE);
    }
    return account;
}

/** Refuse l’action si le prédicat de droits est faux (403). */
export function assertAccountAllowed(allowed: boolean, message = ACCOUNT_FORBIDDEN_MESSAGE): void {
    if (!allowed) {
        throw new AppError(message, 403, ACCOUNT_FORBIDDEN_CODE);
    }
}

/**
 * Exige une invitation entrante connue localement avant accept/refuse.
 */
export function requireIncomingShare(
    incoming: readonly IncomingAccountShare[],
    sharePublicId: string
): IncomingAccountShare {
    const invite = incoming.find((s) => s.publicId === sharePublicId);
    if (!invite) {
        throw new AppError(SHARE_INVITE_NOT_FOUND_MESSAGE, 404, SHARE_INVITE_NOT_FOUND_CODE);
    }
    return invite;
}
