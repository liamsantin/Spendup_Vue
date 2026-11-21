import { beforeEach, describe, expect, it } from 'vitest';
import type { MonthInsights } from '@/features/dashboard/insights';
import { summarizeFlows, topCategoryTotals, topExpenseCategories } from '@/features/dashboard/format';
import { handleDemoRequest } from '@/features/demo/handle';
import { resetDemoDb } from '@/features/demo/db';
import type { Transaction } from '@/features/transactions/types';
import type { Category } from '@/features/categories/types';
import { groupExpensesByKind } from '@/features/dashboard/month-page';
import DemoRoutes from '@/router/DemoRoutes';

describe('GET /api/insights/month en démo', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('donne les mêmes revenus et sorties que le calcul actuel du tableau de bord', () => {
        const listed = handleDemoRequest('GET', '/api/transactions?from=2026-11-01&to=2026-11-30&page=1&pageSize=200') as {
            items: Transaction[];
        };
        const expected = summarizeFlows(listed.items, 'CHF');

        const result = handleDemoRequest('GET', '/api/insights/month?month=2026-11&currency=CHF') as MonthInsights;

        expect(result.month).toBe('2026-11');
        expect(result.from).toBe('2026-11-01');
        expect(result.to).toBe('2026-11-30');
        expect(result.actual.income).toBeCloseTo(expected.income, 2);
        expect(result.actual.expense).toBeCloseTo(expected.expense, 2);
        expect(result.actual.balance).toBeCloseTo(expected.net, 2);
        expect(result.actual.byKind.map((row) => row.kind)).toEqual(['obligatoire', 'plaisir', 'epargne', 'nonClasse']);
        const byKindTotal = result.actual.byKind.reduce((sum, row) => sum + row.amount, 0);
        expect(byKindTotal).toBeCloseTo(result.actual.expense, 2);
    });

    it('donne aussi la même période partielle et le même top des catégories que l’ancien calcul', () => {
        const listed = handleDemoRequest('GET', '/api/transactions?from=2026-11-01&to=2026-11-15&page=1&pageSize=200') as {
            items: Transaction[];
        };
        const result = handleDemoRequest('GET', '/api/insights/month?month=2026-11&currency=CHF&to=2026-11-15') as MonthInsights;

        expect(result.to).toBe('2026-11-15');
        expect(result.actual.expense).toBeCloseTo(summarizeFlows(listed.items, 'CHF').expense, 2);
        expect(topCategoryTotals(result.expenseByCategory)).toEqual(topExpenseCategories(listed.items, 'CHF'));
        expect(() => handleDemoRequest('GET', '/api/insights/month?month=2026-11&to=2026-12-01')).toThrow();
    });

    it('range une dépense selon le type de sa catégorie, hérité de la racine', () => {
        const created = handleDemoRequest('POST', '/api/categories', {
            name: 'Jeux',
            type: 'depense',
            parentPublicId: 'CATFUN1'
        }) as { publicId: string; spendingKind: string | null };
        expect(created.spendingKind).toBeNull();
        const before = handleDemoRequest('GET', '/api/insights/month?month=2026-11') as MonthInsights;

        handleDemoRequest('POST', '/api/transactions', {
            type: 'depense',
            accountPublicId: 'ACCCOUR',
            label: 'Jeu',
            amount: 30,
            operationDate: '2026-11-05',
            categoryPublicId: created.publicId
        });
        const after = handleDemoRequest('GET', '/api/insights/month?month=2026-11') as MonthInsights;

        const plaisir = (r: MonthInsights) => r.actual.byKind.find((row) => row.kind === 'plaisir')?.amount ?? 0;
        expect(plaisir(after) - plaisir(before)).toBeCloseTo(30, 2);
    });

    it('garde, remplace ou efface le type de dépense d’une catégorie', () => {
        const updated = handleDemoRequest('PUT', '/api/categories/CATFUN1', {
            name: 'Sorties',
            type: 'depense',
            color: '#F59E0B',
            icone: 'music',
            parentPublicId: null
        }) as { spendingKind: string | null };
        expect(updated.spendingKind).toBe('plaisir');

        const cleared = handleDemoRequest('PUT', '/api/categories/CATFUN1', {
            name: 'Sorties',
            type: 'depense',
            color: '#F59E0B',
            icone: 'music',
            parentPublicId: null,
            spendingKind: ''
        }) as { spendingKind: string | null };
        expect(cleared.spendingKind).toBeNull();
    });
});

describe('page « Mon mois » en démo', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('répartit les catégories sous leur type avec les mêmes totaux que l’API', () => {
        const listed = handleDemoRequest('GET', '/api/categories') as { items: (Category & { children?: Category[] })[] };
        const categories = listed.items.flatMap((root) => [root, ...(root.children ?? [])]);
        const find = (id: string) => categories.find((cat) => cat.publicId === id) ?? null;
        const result = handleDemoRequest('GET', '/api/insights/month?month=2026-11&currency=CHF') as MonthInsights;

        const groups = groupExpensesByKind(result, find);

        expect(groups.length).toBeGreaterThan(1);
        for (const group of groups) {
            expect(group.categories.reduce((sum, row) => sum + row.amount, 0)).toBeCloseTo(group.amount, 2);
        }
    });

    it('ouvre la page dans la démo', () => {
        const page = (DemoRoutes.children ?? []).find((child) => child.path === 'finances/mois');
        expect(page?.name).toBe('DemoAppMonth');
        expect(String(page?.component)).not.toContain('DemoLockedPage');
    });
});
