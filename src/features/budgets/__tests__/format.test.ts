import { describe, expect, it } from 'vitest';
import {
    budgetBarWidth,
    budgetProgressTone,
    budgetScheduleStatus,
    isBudgetCurrency,
    isBudgetPeriode,
    isDuplicateBudgetScope,
    isValidYmd
} from '@/features/budgets/format';
import type { Budget } from '@/features/budgets/types';

function budget(partial: Partial<Budget> = {}): Budget {
    return {
        publicId: 'b-1',
        name: 'Alimentation',
        limitAmount: 400,
        currency: 'CHF',
        periode: 'mensuel',
        startDate: '2026-07-01',
        endDate: null,
        isActive: true,
        categoryPublicId: null,
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        spentAmount: 80,
        remainingAmount: 320,
        percentUsed: 20,
        isCurrent: true,
        createdAt: '2026-07-01T00:00:00Z',
        updatedAt: null,
        ...partial
    };
}

describe('budgets format', () => {
    it('valide période, devise et date', () => {
        expect(isBudgetPeriode('mensuel')).toBe(true);
        expect(isBudgetPeriode('monthly')).toBe(false);
        expect(isBudgetCurrency('CHF')).toBe(true);
        expect(isBudgetCurrency('JPY')).toBe(false);
        expect(isValidYmd('2026-07-01')).toBe(true);
        expect(isValidYmd('2026-02-30')).toBe(false);
    });

    it('détecte un doublon de scope', () => {
        const known = [budget()];
        expect(isDuplicateBudgetScope('mensuel', '2026-07-01', null, known)).toBe(true);
        expect(isDuplicateBudgetScope('annuel', '2026-07-01', null, known)).toBe(false);
        expect(isDuplicateBudgetScope('mensuel', '2026-07-01', 'cat-1', known)).toBe(false);
        expect(isDuplicateBudgetScope('mensuel', '2026-07-01', null, known, 'b-1')).toBe(false);
    });

    it('calibre la barre et le ton', () => {
        expect(budgetBarWidth(budget({ percentUsed: 150 }))).toBe(100);
        expect(budgetBarWidth(budget({ isCurrent: false, percentUsed: 80 }))).toBe(0);
        expect(budgetProgressTone(budget({ percentUsed: 20, remainingAmount: 320 }))).toBe('ok');
        expect(budgetProgressTone(budget({ percentUsed: 80, remainingAmount: 80 }))).toBe('warn');
        expect(budgetProgressTone(budget({ percentUsed: 110, remainingAmount: -40 }))).toBe('over');
        expect(budgetProgressTone(budget({ isActive: false, percentUsed: 90 }))).toBe('idle');
    });

    it('distingue à venir / en cours / terminé', () => {
        expect(budgetScheduleStatus(budget({ isCurrent: true }), '2026-07-18')).toBe('current');
        expect(budgetScheduleStatus(budget({ isCurrent: false, startDate: '2026-08-01' }), '2026-07-18')).toBe('upcoming');
        expect(budgetScheduleStatus(budget({ isCurrent: false, startDate: '2026-01-01', endDate: '2026-06-30' }), '2026-07-18')).toBe(
            'ended'
        );
    });
});
