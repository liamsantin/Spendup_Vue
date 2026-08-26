import { describe, expect, it } from 'vitest';
import { buildUpdateAccountPayload, shouldValidateAccountIban } from '@/features/accounts/account-form-payload';
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
    color: '#10B981'
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
            isPrimary: true
        });
    });

    it('editor : payload réduit (pas de type / solde / iban / primary)', () => {
        expect(
            buildUpdateAccountPayload(account({ myRole: 'editor', isOwned: false, isPrimary: false }), fields)
        ).toEqual({
            name: 'Renommé',
            accountNumber: '99',
            color: '#10B981'
        });
    });
});
