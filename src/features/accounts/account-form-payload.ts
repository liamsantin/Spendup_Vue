import { emptyToNull, normalizeAccountColor, normalizeIban } from '@/features/accounts/format';
import { canEditAccountOwnerFields } from '@/features/accounts/rights';
import {
    BANK_REQUIRED_ACCOUNT_TYPES,
    type Account,
    type AccountType,
    type CreateAccountPayload,
    type UpdateAccountPayload
} from '@/features/accounts/types';
import { sameBankChoice } from '@/features/banks/format';
import type { BankChoice } from '@/features/banks/types';

export type AccountFormUpdateFields = {
    name: string;
    type: AccountType;
    /** Solde déjà parsé (owner) — ignoré pour un editor. */
    initialBalance: number;
    iban: string;
    accountNumber: string;
    color: string | null;
    /** `null` = aucune banque. Ignoré pour un editor (PUT envoie `null`). */
    bank: BankChoice | null;
};

/** Banque obligatoire pour un compte courant ou d’épargne. */
export function accountTypeRequiresBank(type: AccountType): boolean {
    return BANK_REQUIRED_ACCOUNT_TYPES.includes(type);
}

/**
 * Choix du sélecteur « Banque » correspondant à la banque actuelle du compte.
 * Seul `bank` compte : un ancien `institutionTierPublicId` sans volet banque serait refusé (`400`) au PUT.
 */
export function accountBankChoice(account: Pick<Account, 'bank'>): BankChoice | null {
    const bank = account.bank;
    if (!bank) return null;
    return { kind: 'tier', tierPublicId: bank.tierPublicId, name: bank.name, bankPublicId: bank.bankPublicId, bankName: bank.bankName };
}

/**
 * Champs banque du POST / PUT : `institutionTierPublicId` (un de mes tiers banque)
 * ou `bankPublicId` (référentiel), jamais les deux (`400`). Aucun choix → banque déduite de l’IBAN CH / LI.
 */
export function bankPayloadFields(choice: BankChoice | null): Pick<CreateAccountPayload, 'institutionTierPublicId' | 'bankPublicId'> {
    if (!choice) return { institutionTierPublicId: null };
    if (choice.kind === 'tier') return { institutionTierPublicId: choice.tierPublicId };
    return { bankPublicId: choice.bankPublicId };
}

/**
 * IBAN à valider seulement à la création ou pour un owner.
 * Un editor ne doit pas être bloqué par un IBAN legacy invalide (champ omis du PUT).
 */
export function shouldValidateAccountIban(account: Pick<Account, 'myRole'> | null | undefined): boolean {
    if (!account) return true;
    return canEditAccountOwnerFields(account);
}

/**
 * Construit le payload PUT : editor → name / accountNumber / color + banque nulle (= omise).
 */
export function buildUpdateAccountPayload(
    account: Pick<Account, 'myRole' | 'currency' | 'isPrimary'>,
    fields: AccountFormUpdateFields
): UpdateAccountPayload {
    if (!canEditAccountOwnerFields(account)) {
        return {
            name: fields.name,
            accountNumber: emptyToNull(fields.accountNumber),
            color: normalizeAccountColor(fields.color),
            institutionTierPublicId: null
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
        isPrimary: account.isPrimary,
        ...bankPayloadFields(fields.bank)
    };
}

/**
 * True si le formulaire d’édition diffère des valeurs actuelles du compte
 * (champs éditables selon le rôle).
 */
export function isAccountFormDirty(
    account: Pick<
        Account,
        | 'name'
        | 'type'
        | 'initialBalance'
        | 'iban'
        | 'accountNumber'
        | 'color'
        | 'myRole'
        | 'institutionTierPublicId'
        | 'institutionName'
        | 'bank'
    >,
    fields: AccountFormUpdateFields
): boolean {
    if (fields.name.trim() !== account.name.trim()) return true;
    if (emptyToNull(fields.accountNumber) !== emptyToNull(account.accountNumber)) return true;
    if (normalizeAccountColor(fields.color) !== normalizeAccountColor(account.color)) return true;

    if (!canEditAccountOwnerFields(account)) return false;

    if (fields.type !== account.type) return true;
    if (Number(fields.initialBalance) !== Number(account.initialBalance ?? 0)) return true;
    if (normalizeIban(fields.iban) !== normalizeIban(account.iban)) return true;
    if (!sameBankChoice(fields.bank, accountBankChoice(account))) return true;
    return false;
}
