import { describe, expect, it } from 'vitest';
import { BUDGETS_PATHS, budgetDetailPath, budgetLinkedTransactionsQuery, budgetPublicIdFromPath } from '@/features/budgets/paths';

describe('budgets paths', () => {
    it('construit le détail et relit le publicId', () => {
        expect(BUDGETS_PATHS.list).toBe('/app/planning/budgets');
        expect(budgetDetailPath('guid-1')).toBe('/app/planning/budgets/guid-1');
        expect(budgetPublicIdFromPath('/app/planning/budgets')).toBeNull();
        expect(budgetPublicIdFromPath('/app/planning/budgets/guid-1')).toBe('guid-1');
        expect(budgetPublicIdFromPath('/app/planning/budgets/guid-1?x=1')).toBe('guid-1');
    });

    it('filtre les transactions liées à la fenêtre courante', () => {
        expect(
            budgetLinkedTransactionsQuery({
                publicId: 'b-1',
                periodStart: '2026-09-01',
                periodEnd: '2026-09-30',
                categoryPublicId: 'cat-1'
            })
        ).toEqual({
            budget: 'b-1',
            type: 'depense',
            from: '2026-09-01',
            to: '2026-09-30',
            category: 'cat-1'
        });
        expect(
            budgetLinkedTransactionsQuery({
                publicId: 'b-2',
                periodStart: '2026-01-01',
                periodEnd: '2026-12-31',
                categoryPublicId: null
            })
        ).toEqual({
            budget: 'b-2',
            type: 'depense',
            from: '2026-01-01',
            to: '2026-12-31'
        });
    });
});
