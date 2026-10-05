import { describe, expect, it } from 'vitest';
import type { Account } from '@/features/accounts/types';
import {
    greetingPeriod,
    pickPrimaryCurrency,
    sumVisibleBalances,
    monthToDateRanges,
    percentChange,
    summarizeFlows,
    topExpenseCategories,
    upcomingDues
} from '@/features/dashboard/format';

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

describe('dashboard : chiffres du mois', () => {
    const tx = (type: string, amount: number | null, categoryPublicId: string | null = null, currency = 'CHF') => ({
        type,
        amount,
        currency,
        categoryPublicId
    });

    it('compare au même jour du mois précédent, borné à sa fin', () => {
        expect(monthToDateRanges(new Date(2026, 9, 10))).toEqual({
            current: { from: '2026-10-01', to: '2026-10-10' },
            previous: { from: '2026-09-01', to: '2026-09-10' }
        });
        expect(monthToDateRanges(new Date(2026, 2, 31)).previous).toEqual({ from: '2026-02-01', to: '2026-02-28' });
        expect(monthToDateRanges(new Date(2026, 0, 15)).previous).toEqual({ from: '2025-12-01', to: '2025-12-15' });
    });

    it('somme revenus et dépenses de la devise, sans transferts ni montants masqués', () => {
        const flows = summarizeFlows(
            [
                tx('revenu', 6250),
                tx('depense', 1890),
                tx('depense', 45.5),
                tx('transfert', 500),
                tx('depense', null),
                tx('depense', 99, null, 'EUR')
            ],
            'CHF'
        );
        expect(flows).toEqual({ income: 6250, expense: 1935.5, net: 4314.5, count: 3 });
    });

    it('variation en % ; null sans base', () => {
        expect(percentChange(120, 100)).toBe(20);
        expect(percentChange(80, 100)).toBe(-20);
        expect(percentChange(50, 0)).toBeNull();
    });

    it('top catégories avec regroupement « Autres »', () => {
        const rows = topExpenseCategories(
            [tx('depense', 50, 'a'), tx('depense', 30, 'b'), tx('depense', 10, 'c'), tx('depense', 10, null), tx('revenu', 999, 'a')],
            'CHF',
            2
        );
        expect(rows.map((row) => [row.categoryPublicId, row.amount, row.share])).toEqual([
            ['a', 50, 0.5],
            ['b', 30, 0.3],
            ['other', 20, 0.2]
        ]);
        expect(topExpenseCategories([], 'CHF')).toEqual([]);
    });

    it('échéances actives de la période, triées, charges en négatif', () => {
        const template = (publicId: string, nextDueDate: string | null, isActive = true) => ({
            publicId,
            name: publicId,
            plannedAmount: 100,
            currency: 'CHF',
            nextDueDate,
            isActive
        });
        const dues = upcomingDues(
            [template('loyer', '2026-11-01'), template('vieux', '2026-09-01'), template('off', '2026-10-20', false)],
            [template('salaire', '2026-10-25')],
            { from: '2026-10-04', to: '2026-11-03' }
        );
        expect(dues.map((due) => [due.publicId, due.amount])).toEqual([
            ['salaire', 100],
            ['loyer', -100]
        ]);
    });
});
