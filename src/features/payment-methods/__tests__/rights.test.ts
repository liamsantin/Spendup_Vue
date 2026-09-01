import { describe, expect, it } from 'vitest';
import { canViewPaymentMethods, canWritePaymentMethods } from '@/features/payment-methods/rights';
import type { Account } from '@/features/accounts/types';

function account(partial: Partial<Account> = {}): Account {
    return {
        publicId: 'a1',
        name: 'Compte',
        type: 'courant',
        currency: 'CHF',
        initialBalance: 0,
        currentBalance: 0,
        iban: null,
        accountNumber: null,
        color: null,
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

describe('payment-methods rights', () => {
    it('autorise la lecture pour viewer+', () => {
        expect(canViewPaymentMethods(account({ myRole: 'owner' }))).toBe(true);
        expect(canViewPaymentMethods(account({ myRole: 'editor' }))).toBe(true);
        expect(canViewPaymentMethods(account({ myRole: 'viewer' }))).toBe(true);
    });

    it('autorise l’écriture editor+ sur compte actif seulement', () => {
        expect(canWritePaymentMethods(account({ myRole: 'owner' }))).toBe(true);
        expect(canWritePaymentMethods(account({ myRole: 'editor' }))).toBe(true);
        expect(canWritePaymentMethods(account({ myRole: 'viewer' }))).toBe(false);
        expect(canWritePaymentMethods(account({ myRole: 'owner', isActive: false }))).toBe(false);
        expect(canWritePaymentMethods(account({ myRole: 'editor', isActive: false }))).toBe(false);
    });
});
