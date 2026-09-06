import { emptyToNull, normalizeAccountColor, normalizeIban } from '@/features/accounts/format';
import { canEditAccountOwnerFields } from '@/features/accounts/rights';
import type { Account, AccountType, UpdateAccountPayload } from '@/features/accounts/types';

export type AccountFormUpdateFields = {
    name: string;
    type: AccountType;
    /** Solde déjà parsé (owner) — ignoré pour un editor. */
    initialBalance: number;
    iban: string;
    accountNumber: string;
    color: string | null;
};

/**
 * IBAN à valider seulement à la création ou pour un owner.
 * Un editor ne doit pas être bloqué par un IBAN legacy invalide (champ omis du PUT).
 */
export function shouldValidateAccountIban(account: Pick<Account, 'myRole'> | null | undefined): boolean {
    if (!account) return true;
    return canEditAccountOwnerFields(account);
}

/**
 * Construit le payload PUT : editor → name / accountNumber / color uniquement.
 */
export function buildUpdateAccountPayload(
    account: Pick<Account, 'myRole' | 'currency' | 'isPrimary'>,
    fields: AccountFormUpdateFields
): UpdateAccountPayload {
    if (!canEditAccountOwnerFields(account)) {
        return {
            name: fields.name,
            accountNumber: emptyToNull(fields.accountNumber),
            color: normalizeAccountColor(fields.color)
        };
    }
    return {
        name: fields.name,
        type: fields.type,
        currency: account.currency,
        initialBalance: fields.initialBalance,
        iban: emptyToNull(fields.iban),
        accountNumber: emptyToNull(fields.accountNumber),
        color: normalizeAccountColor(fields.color),
        isPrimary: account.isPrimary
    };
}

/**
 * True si le formulaire d’édition diffère des valeurs actuelles du compte
 * (champs éditables selon le rôle).
 */
export function isAccountFormDirty(
    account: Pick<Account, 'name' | 'type' | 'initialBalance' | 'iban' | 'accountNumber' | 'color' | 'myRole'>,
    fields: AccountFormUpdateFields
): boolean {
    if (fields.name.trim() !== account.name.trim()) return true;
    if (emptyToNull(fields.accountNumber) !== emptyToNull(account.accountNumber)) return true;
    if (normalizeAccountColor(fields.color) !== normalizeAccountColor(account.color)) return true;

    if (!canEditAccountOwnerFields(account)) return false;

    if (fields.type !== account.type) return true;
    if (Number(fields.initialBalance) !== Number(account.initialBalance ?? 0)) return true;
    if (normalizeIban(fields.iban) !== normalizeIban(account.iban)) return true;
    return false;
}
