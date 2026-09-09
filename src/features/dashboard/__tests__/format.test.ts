import { describe, expect, it } from 'vitest';
import type { Account } from '@/features/accounts/types';
import { greetingPeriod, pickPrimaryCurrency, sumVisibleBalances } from '@/features/dashboard/format';

function account(partial: Partial<Account> = {}): Account {
    return {
        publicId: 'acc-1',
        name: 'Compte',
        type: 'courant',
        currency: 'CHF',
        initialBalance: 0,
        currentBalance: 100,
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

describe('dashboard format', () => {
    it('somme les soldes visibles par devise', () => {
        const totals = sumVisibleBalances([
            account({ publicId: 'a', currentBalance: 100, currency: 'CHF', isPrimary: true }),
            account({ publicId: 'b', currentBalance: 50, currency: 'CHF' }),
            account({ publicId: 'c', currentBalance: 20, currency: 'EUR' }),
            account({ publicId: 'd', currentBalance: 999, isActive: false }),
            account({ publicId: 'e', currentBalance: 40, hiddenFields: ['balance'] }),
            account({ publicId: 'f', currentBalance: null })
        ]);
        expect(totals).toEqual([
            { currency: 'CHF', amount: 150 },
            { currency: 'EUR', amount: 20 }
        ]);
    });

    it('privilégie la devise du compte principal', () => {
        const accounts = [
            account({ publicId: 'eur', currency: 'EUR', currentBalance: 80, isPrimary: false }),
            account({ publicId: 'chf', currency: 'CHF', currentBalance: 10, isPrimary: true })
        ];
        expect(pickPrimaryCurrency(accounts, sumVisibleBalances(accounts))).toBe('CHF');
    });

    it('découpe la journée pour le salut', () => {
        expect(greetingPeriod(new Date(2026, 8, 9, 8))).toBe('morning');
        expect(greetingPeriod(new Date(2026, 8, 9, 15))).toBe('afternoon');
        expect(greetingPeriod(new Date(2026, 8, 9, 21))).toBe('evening');
    });
});
