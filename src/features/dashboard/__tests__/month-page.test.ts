import { describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import type { MonthInsights } from '@/features/dashboard/insights';
import {
    groupExpensesByKind,
    MONTH_PATH,
    monthPageLocation,
    monthTransactionsQuery,
    parseMonthQuery,
    resolveSpendingKind
} from '@/features/dashboard/month-page';

const insightsMock = vi.hoisted(() => ({ month: vi.fn() }));
vi.mock('@/features/dashboard/insights', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/features/dashboard/insights')>()),
    insightsApi: insightsMock
}));

const { useMonthInsights } = await import('@/features/dashboard/composables/useMonthInsights');

type Cat = {
    publicId: string;
    name: string;
    color: string | null;
    parentPublicId: string | null;
    spendingKind?: 'obligatoire' | 'plaisir' | 'epargne' | null;
};

const CATS: Cat[] = [
    { publicId: 'rent', name: 'Logement', color: '#111', parentPublicId: null, spendingKind: 'obligatoire' },
    { publicId: 'fun', name: 'Loisirs', color: null, parentPublicId: null, spendingKind: 'plaisir' },
    { publicId: 'games', name: 'Jeux', color: null, parentPublicId: 'fun', spendingKind: null },
    { publicId: 'misc', name: 'Divers', color: null, parentPublicId: null, spendingKind: null }
];
const find = (id: string) => CATS.find((cat) => cat.publicId === id) ?? null;

function insights(partial: Partial<MonthInsights> = {}): MonthInsights {
    const flows = { income: 0, expense: 0, balance: 0, savingsRate: null, count: 0, byKind: [] };
    return {
        month: '2026-07',
        from: '2026-07-01',
        to: '2026-07-31',
        currency: 'CHF',
        actual: flows,
        planned: flows,
        total: flows,
        savingsTransfers: 0,
        otherCurrencies: [],
        hiddenCount: 0,
        expenseByCategory: [],
        ...partial
    };
}

describe('page « Mon mois »', () => {
    it('lit le mois dans l’adresse et retombe sur le mois en cours', () => {
        const today = new Date(2026, 6, 18);
        expect(parseMonthQuery('2026-03', today)).toBe('2026-03');
        expect(parseMonthQuery(['2025-12'], today)).toBe('2025-12');
        expect(parseMonthQuery('2026-13', today)).toBe('2026-07');
        expect(parseMonthQuery('juillet', today)).toBe('2026-07');
        expect(parseMonthQuery(undefined, today)).toBe('2026-07');
    });

    it('garde une adresse sans paramètre pour le mois en cours', () => {
        const today = new Date(2026, 6, 18);
        expect(monthPageLocation('2026-07', today)).toEqual({ path: MONTH_PATH, query: {} });
        expect(monthPageLocation('2026-06', today)).toEqual({ path: MONTH_PATH, query: { m: '2026-06' } });
    });

    it('filtre les transactions sur les dépenses du mois et la catégorie', () => {
        const month = insights();
        expect(monthTransactionsQuery(month)).toEqual({ type: 'depense', from: '2026-07-01', to: '2026-07-31' });
        expect(monthTransactionsQuery(month, 'rent')).toEqual({ type: 'depense', from: '2026-07-01', to: '2026-07-31', category: 'rent' });
    });

    it('hérite le type de la racine, comme l’API', () => {
        expect(resolveSpendingKind('rent', find)).toBe('obligatoire');
        expect(resolveSpendingKind('games', find)).toBe('plaisir');
        expect(resolveSpendingKind('misc', find)).toBeNull();
        expect(resolveSpendingKind('inconnue', find)).toBeNull();
        expect(resolveSpendingKind(null, find)).toBeNull();
        const loop = (id: string) => ({ publicId: id, name: id, color: null, parentPublicId: id === 'a' ? 'b' : 'a', spendingKind: null });
        expect(resolveSpendingKind('a', loop)).toBeNull();
    });

    it('regroupe les catégories sous leur type, dans l’ordre de l’API', () => {
        const month = insights({
            actual: {
                income: 5000,
                expense: 2300,
                balance: 2700,
                savingsRate: 0.54,
                count: 5,
                byKind: [
                    { kind: 'obligatoire', amount: 1500, share: 0.6522 },
                    { kind: 'plaisir', amount: 700, share: 0.3043 },
                    { kind: 'epargne', amount: 0, share: 0 },
                    { kind: 'nonClasse', amount: 100, share: 0.0435 }
                ]
            },
            expenseByCategory: [
                { categoryPublicId: 'rent', amount: 1500 },
                { categoryPublicId: 'fun', amount: 400 },
                { categoryPublicId: 'games', amount: 300 },
                { categoryPublicId: 'misc', amount: 60 },
                { categoryPublicId: null, amount: 40 }
            ]
        });

        const groups = groupExpensesByKind(month, find);

        expect(groups.map((group) => group.kind)).toEqual(['obligatoire', 'plaisir', 'nonClasse']);
        expect(groups[1].categories.map((row) => row.name)).toEqual(['Loisirs', 'Jeux']);
        expect(groups[2].categories).toEqual([
            { categoryPublicId: 'misc', name: 'Divers', color: null, amount: 60 },
            { categoryPublicId: null, name: null, color: null, amount: 40 }
        ]);
        for (const group of groups) {
            expect(group.categories.reduce((sum, row) => sum + row.amount, 0)).toBe(group.amount);
        }
    });
});

describe('useMonthInsights', () => {
    it('recharge au changement de mois et ignore une réponse arrivée trop tard', async () => {
        let resolveSlow: (value: MonthInsights) => void = () => undefined;
        insightsMock.month.mockReset();
        insightsMock.month
            .mockImplementationOnce(
                () =>
                    new Promise<MonthInsights>((resolve) => {
                        resolveSlow = resolve;
                    })
            )
            .mockResolvedValueOnce(insights({ month: '2026-06' }));
        const month = ref('2026-07');

        const state = useMonthInsights(month, ref('CHF'));
        month.value = '2026-06';
        await nextTick();
        await vi.waitFor(() => expect(state.data.value?.month).toBe('2026-06'));
        resolveSlow(insights({ month: '2026-07' }));
        await Promise.resolve();

        expect(insightsMock.month).toHaveBeenNthCalledWith(1, '2026-07', 'CHF');
        expect(insightsMock.month).toHaveBeenNthCalledWith(2, '2026-06', 'CHF');
        expect(state.data.value?.month).toBe('2026-06');
        expect(state.loading.value).toBe(false);
    });

    it('signale un échec sans garder l’ancien résultat', async () => {
        insightsMock.month.mockReset();
        insightsMock.month.mockRejectedValueOnce(new Error('500'));

        const state = useMonthInsights(ref('2026-07'), ref(null));
        await vi.waitFor(() => expect(state.loading.value).toBe(false));

        expect(state.failed.value).toBe(true);
        expect(state.data.value).toBeNull();
    });
});
