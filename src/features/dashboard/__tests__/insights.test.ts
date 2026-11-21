import { describe, expect, it } from 'vitest';
import { monthKey, shiftMonth, spendingSegments, type MonthFlows } from '@/features/dashboard/insights';

describe('mois du reste à dépenser', () => {
    it('formate et décale un mois, y compris par-dessus l’année', () => {
        expect(monthKey(new Date(2026, 0, 31))).toBe('2026-01');
        expect(shiftMonth('2026-01', -1)).toBe('2025-12');
        expect(shiftMonth('2026-12', 1)).toBe('2027-01');
        expect(shiftMonth('2026-07', 0)).toBe('2026-07');
    });

    it('ne garde dans la barre que les types non nuls, dans l’ordre de l’API', () => {
        const flows: MonthFlows = {
            income: 5000,
            expense: 3500,
            balance: 1500,
            savingsRate: 0.4,
            count: 4,
            byKind: [
                { kind: 'obligatoire', amount: 2000, share: 0.5714 },
                { kind: 'plaisir', amount: 1000, share: 0.2857 },
                { kind: 'epargne', amount: 500, share: 0.1429 },
                { kind: 'nonClasse', amount: 0, share: 0 }
            ]
        };
        expect(spendingSegments(flows).map((row) => row.kind)).toEqual(['obligatoire', 'plaisir', 'epargne']);
        expect(spendingSegments(null)).toEqual([]);
    });
});

describe('top des catégories depuis les totaux de l’API', () => {
    it('trie, garde les 5 premières et regroupe le reste sous « other »', async () => {
        const { topCategoryTotals } = await import('@/features/dashboard/format');
        const rows = [10, 60, 5, 20, 1, 4].map((amount, i) => ({ categoryPublicId: `C${i}`, amount }));
        const top = topCategoryTotals([...rows, { categoryPublicId: null, amount: 0 }]);

        expect(top.map((row) => row.categoryPublicId)).toEqual(['C1', 'C3', 'C0', 'C2', 'C5', 'other']);
        expect(top.at(-1)?.amount).toBe(1);
        expect(top.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1, 6);
        expect(topCategoryTotals([])).toEqual([]);
    });
});
