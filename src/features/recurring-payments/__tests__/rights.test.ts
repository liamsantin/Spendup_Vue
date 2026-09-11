import { describe, expect, it } from 'vitest';
import { canConfirmRecurringOnAccount, canWriteRecurringOnAccount } from '@/features/recurring-payments/rights';
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
        institutionTierPublicId: null,
        institutionName: null,
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

describe('recurring rights', () => {
    it('autorise editor+ sur compte actif', () => {
        expect(canWriteRecurringOnAccount(account({ myRole: 'editor' }))).toBe(true);
        expect(canConfirmRecurringOnAccount(account({ myRole: 'owner' }))).toBe(true);
    });

    it('refuse viewer et compte archivé', () => {
        expect(canWriteRecurringOnAccount(account({ myRole: 'viewer' }))).toBe(false);
        expect(canWriteRecurringOnAccount(account({ isActive: false }))).toBe(false);
    });
});
