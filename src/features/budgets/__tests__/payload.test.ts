import { describe, expect, it } from 'vitest';
import { emptyBudgetFormFields, buildCreateBudgetPayload, buildUpdateBudgetPayload } from '@/features/budgets/payload';
import type { Budget } from '@/features/budgets/types';

function fields(partial: Partial<ReturnType<typeof emptyBudgetFormFields>> = {}) {
    return {
        ...emptyBudgetFormFields({ periode: 'mensuel', currency: 'CHF', startDate: '2026-07-01' }),
        name: 'Alimentation',
        limitAmount: '400',
        ...partial
    };
}

const existing: Budget = {
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
    spentAmount: 0,
    remainingAmount: 400,
    percentUsed: 0,
    isCurrent: true,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: null
};

describe('budgets payload', () => {
    it('construit un POST global mensuel', () => {
        const result = buildCreateBudgetPayload(fields());
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload).toMatchObject({
                name: 'Alimentation',
                limitAmount: 400,
                periode: 'mensuel',
                startDate: '2026-07-01',
                endDate: null,
                isActive: true,
                categoryPublicId: null,
                currency: 'CHF'
            });
        }
    });

    it('envoie currency null si omise', () => {
        const result = buildCreateBudgetPayload(fields({ currency: '' }));
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.payload.currency).toBeNull();
    });

    it('refuse une limite ≤ 0 et une fin avant le début', () => {
        expect(buildCreateBudgetPayload(fields({ limitAmount: '0' })).ok).toBe(false);
        expect(buildCreateBudgetPayload(fields({ endDate: '2026-06-01' })).ok).toBe(false);
    });

    it('refuse un doublon de scope', () => {
        const result = buildCreateBudgetPayload(fields(), { knownBudgets: [existing] });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.code).toBe('scopeDuplicate');
    });

    it('refuse de changer la devise en PUT', () => {
        const result = buildUpdateBudgetPayload(fields({ currency: 'EUR' }), { lockedCurrency: 'CHF' });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.code).toBe('currencyLocked');
    });

    it('construit un PUT complet avec devise figée', () => {
        const result = buildUpdateBudgetPayload(fields({ name: 'Courses', limitAmount: '450' }), {
            lockedCurrency: 'CHF',
            knownBudgets: [existing],
            excludePublicId: 'b-1'
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload).toMatchObject({
                name: 'Courses',
                limitAmount: 450,
                currency: 'CHF',
                isActive: true,
                categoryPublicId: null
            });
        }
    });
});
