import { describe, expect, it } from 'vitest';
import {
    accountBankChoice,
    accountTypeRequiresBank,
    bankPayloadFields,
    buildUpdateAccountPayload,
    isAccountFormDirty,
    shouldValidateAccountIban
} from '@/features/accounts/account-form-payload';
import type { Account } from '@/features/accounts/types';

function account(partial: Partial<Account> = {}): Account {
    return {
        publicId: 'acc-1',
        name: 'Courant',
        type: 'courant',
        currency: 'CHF',
        initialBalance: 100,
        currentBalance: 100,
        iban: 'CH93INVALID',
        accountNumber: '42',
        color: '#4F46E5',
        institutionTierPublicId: null,
        institutionName: null,
        bank: null,
        isPrimary: false,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: null,
        isOwned: true,
        myRole: 'owner',
        hiddenFields: [],
        ...partial
    };
}

const fields = {
    name: 'Renommé',
    type: 'epargne' as const,
    initialBalance: 999,
    iban: 'CH93INVALID',
    accountNumber: '99',
    color: '#10B981',
    bank: null
};

describe('account-form-payload (formulaire verrouillé / IBAN)', () => {
    it('ne valide pas l’IBAN pour un editor (champ omis du PUT)', () => {
        expect(shouldValidateAccountIban(null)).toBe(true);
        expect(shouldValidateAccountIban(account({ myRole: 'owner' }))).toBe(true);
        expect(shouldValidateAccountIban(account({ myRole: 'editor' }))).toBe(false);
        expect(shouldValidateAccountIban(account({ myRole: 'viewer' }))).toBe(false);
    });

    it('owner : payload complet avec iban', () => {
        expect(buildUpdateAccountPayload(account({ myRole: 'owner', isPrimary: true }), fields)).toEqual({
            name: 'Renommé',
            type: 'epargne',
            currency: 'CHF',
            initialBalance: 999,
            iban: 'CH93INVALID',
            accountNumber: '99',
            color: '#10B981',
            isPrimary: true,
            institutionTierPublicId: null
        });
    });

    it('editor : payload réduit (pas de type / solde / iban / primary)', () => {
        expect(buildUpdateAccountPayload(account({ myRole: 'editor', isOwned: false, isPrimary: false }), fields)).toEqual({
            name: 'Renommé',
            accountNumber: '99',
            color: '#10B981',
            institutionTierPublicId: null
        });
    });
});

describe('isAccountFormDirty', () => {
    it('retourne false si rien n’a changé (owner)', () => {
        const acc = account();
        expect(
            isAccountFormDirty(acc, {
                name: acc.name,
                type: acc.type,
                initialBalance: acc.initialBalance ?? 0,
                iban: acc.iban ?? '',
                accountNumber: acc.accountNumber ?? '',
                color: acc.color,
                bank: accountBankChoice(acc)
            })
        ).toBe(false);
    });

    it('détecte un changement de nom et ignore type/iban/institution pour un editor', () => {
        const acc = account({ myRole: 'editor', isOwned: false });
        expect(
            isAccountFormDirty(acc, {
                name: acc.name,
                type: 'epargne',
                initialBalance: 0,
                iban: 'CHANGED',
                accountNumber: acc.accountNumber ?? '',
                color: acc.color,
                bank: { kind: 'tier', tierPublicId: 'other-tier', name: 'Autre', bankPublicId: null, bankName: null }
            })
        ).toBe(false);
        expect(
            isAccountFormDirty(acc, {
                name: 'Autre',
                type: acc.type,
                initialBalance: acc.initialBalance ?? 0,
                iban: acc.iban ?? '',
                accountNumber: acc.accountNumber ?? '',
                color: acc.color,
                bank: accountBankChoice(acc)
            })
        ).toBe(true);
    });

    it('détecte un changement de banque pour un owner', () => {
        const acc = account({ institutionTierPublicId: 'tier-ubs', institutionName: 'UBS', bank: ubsBank });
        const base = {
            name: acc.name,
            type: acc.type,
            initialBalance: acc.initialBalance ?? 0,
            iban: acc.iban ?? '',
            accountNumber: acc.accountNumber ?? '',
            color: acc.color
        };
        expect(isAccountFormDirty(acc, { ...base, bank: accountBankChoice(acc) })).toBe(false);
        expect(isAccountFormDirty(acc, { ...base, bank: null })).toBe(true);
        expect(isAccountFormDirty(acc, { ...base, bank: { kind: 'registry', bankPublicId: 'bank-09000', name: 'PostFinance AG' } })).toBe(
            true
        );
    });
});

const ubsBank = {
    tierPublicId: 'tier-ubs',
    name: 'Mon UBS',
    bankPublicId: 'bank-00230',
    bankName: 'UBS Switzerland AG',
    bic: 'UBSWCHZH80A',
    iid: '00230'
};

describe('banque du compte', () => {
    it('banque obligatoire pour courant et épargne seulement', () => {
        expect(accountTypeRequiresBank('courant')).toBe(true);
        expect(accountTypeRequiresBank('epargne')).toBe(true);
        expect(accountTypeRequiresBank('cash')).toBe(false);
        expect(accountTypeRequiresBank('credit')).toBe(false);
    });

    it('envoie institutionTierPublicId ou bankPublicId, jamais les deux', () => {
        expect(bankPayloadFields(null)).toEqual({ institutionTierPublicId: null });
        expect(bankPayloadFields({ kind: 'tier', tierPublicId: 't1', name: 'UBS', bankPublicId: 'bank-00230', bankName: null })).toEqual({
            institutionTierPublicId: 't1'
        });
        expect(bankPayloadFields({ kind: 'registry', bankPublicId: 'bank-09000', name: 'PostFinance AG' })).toEqual({
            bankPublicId: 'bank-09000'
        });
    });

    it('PUT owner renvoie la banque actuelle du compte', () => {
        const acc = account({ institutionTierPublicId: 'tier-ubs', institutionName: 'Mon UBS', bank: ubsBank });
        const payload = buildUpdateAccountPayload(acc, { ...fields, bank: accountBankChoice(acc) });
        expect(payload.institutionTierPublicId).toBe('tier-ubs');
        expect(payload).not.toHaveProperty('bankPublicId');
    });

    it('PUT editor : banque nulle même si un autre choix est fait', () => {
        const acc = account({ myRole: 'editor', isOwned: false, bank: ubsBank });
        const payload = buildUpdateAccountPayload(acc, {
            ...fields,
            bank: { kind: 'registry', bankPublicId: 'bank-09000', name: 'PostFinance AG' }
        });
        expect(payload.institutionTierPublicId).toBeNull();
        expect(payload).not.toHaveProperty('bankPublicId');
    });

    it('choix initial : nom du tier, nom SIX en complément', () => {
        expect(accountBankChoice(account({ bank: ubsBank, institutionTierPublicId: 'tier-ubs', institutionName: 'Mon UBS' }))).toEqual({
            kind: 'tier',
            tierPublicId: 'tier-ubs',
            name: 'Mon UBS',
            bankPublicId: 'bank-00230',
            bankName: 'UBS Switzerland AG'
        });
        expect(accountBankChoice(account())).toBeNull();
        // Ancienne institution sans volet banque : ne pas la renvoyer (400 « Ce tier n’est pas une banque »).
        expect(accountBankChoice(account({ institutionTierPublicId: 'tier-migros', institutionName: 'Migros', bank: null }))).toBeNull();
    });
});
