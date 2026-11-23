import { beforeEach, describe, expect, it } from 'vitest';
import { resetDemoDb } from '@/features/demo/db';
import { handleDemoRequest } from '@/features/demo/handle';
import { compareRows } from '@/features/insurance/compare';
import { LAMAL_COMPARISON_PATH, type LamalComparison, type LamalContext } from '@/features/insurance/lamal';
import { idsFromPath } from '@/layouts/shell/composables/useShellNav';
import DemoRoutes from '@/router/DemoRoutes';

const BASE = '/api/insurance/lamal-comparison';

const compare = (body: unknown) => handleDemoRequest('POST', BASE, body) as LamalComparison;

const LEGAL = { quotePartRate: 10, quotePartMax: 700 };

describe('calcul local du comparateur', () => {
    it('prime 400, franchise 300, frais 1 000 : 5 170 CHF, coût maximal 5 800 CHF', () => {
        const [option] = compareRows(LEGAL, [{ franchise: 300, premium: 400 }], 1000, 300);
        expect(option).toMatchObject({ expectedCost: 5170, expectedCostSharing: 70, maxCost: 5800, isCurrent: true, isCheapest: true });
    });

    it('ignore les lignes sans prime valide et mesure l’économie face à la franchise actuelle', () => {
        const options = compareRows(
            LEGAL,
            [
                { franchise: 300, premium: 400 },
                { franchise: 500, premium: null },
                { franchise: 1000, premium: Number.NaN },
                { franchise: 2500, premium: 300 }
            ],
            1000,
            300
        );
        expect(options.map((o) => o.franchise)).toEqual([300, 2500]);
        expect(options.find((o) => o.isCheapest)?.franchise).toBe(2500);
        expect(options.find((o) => o.franchise === 2500)?.savingVsCurrent).toBe(570);
    });

    it('n’a pas d’écart sans franchise actuelle comparable, et plafonne la quote-part', () => {
        const [option] = compareRows(LEGAL, [{ franchise: 300, premium: 400 }], 50000, null);
        expect(option.savingVsCurrent).toBeNull();
        expect(option.expectedCostSharing).toBe(700);
        expect(compareRows(LEGAL, [], 1000, null)).toEqual([]);
    });

    it('départage une égalité par le coût maximal le plus bas', () => {
        const options = compareRows(
            LEGAL,
            [
                { franchise: 500, premium: 300 },
                { franchise: 300, premium: 300 }
            ],
            0,
            null
        );
        expect(options.find((o) => o.isCheapest)?.franchise).toBe(300);
    });

    it('donne les mêmes résultats que la démo (et donc l’API)', () => {
        const quotes = [
            { franchise: 300, monthlyPremium: 400 },
            { franchise: 1500, monthlyPremium: 350 },
            { franchise: 2500, monthlyPremium: 300 }
        ];
        const remote = handleDemoRequest('POST', BASE, {
            expectedCosts: 1800,
            quotes,
            currentFranchise: 300,
            year: 2026
        }) as LamalComparison;
        const local = compareRows(
            LEGAL,
            quotes.map((q) => ({ franchise: q.franchise, premium: q.monthlyPremium })),
            1800,
            300
        );
        expect(local).toEqual(remote.options);
    });
});

describe('comparateur LAMal en démo', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('reprend l’assurance maladie de base et les franchises légales', () => {
        const context = handleDemoRequest('GET', `${BASE}/context`) as LamalContext;
        expect(context.franchises).toEqual([300, 500, 1000, 1500, 2000, 2500]);
        expect(context.quotePartMax).toBe(700);
        expect(context.currentFranchise).toBe(2500);
        expect(context.currentMonthlyPremium).toBe(445.2);
    });

    it('prime 400, franchise 300, frais 1 000 : 5 170 CHF', () => {
        const result = compare({
            expectedCosts: 1000,
            quotes: [{ franchise: 300, monthlyPremium: 400 }],
            currentFranchise: 300,
            year: 2026
        });
        expect(result.options[0]).toMatchObject({ expectedCost: 5170, expectedCostSharing: 70, maxCost: 5800, isCurrent: true });
    });

    it('recommande la franchise la moins chère et mesure l’économie', () => {
        const result = compare({
            expectedCosts: 1000,
            quotes: [
                { franchise: 300, monthlyPremium: 400 },
                { franchise: 2500, monthlyPremium: 300 }
            ],
            currentFranchise: 300,
            year: 2026
        });
        expect(result.recommendedFranchise).toBe(2500);
        expect(result.savingVsCurrent).toBe(570);
    });

    it('refuse une franchise inventée ou une prime nulle', () => {
        expect(() =>
            compare({ expectedCosts: 0, quotes: [{ franchise: 750, monthlyPremium: 400 }], currentFranchise: null, year: 2026 })
        ).toThrow();
        expect(() =>
            compare({ expectedCosts: 0, quotes: [{ franchise: 300, monthlyPremium: 0 }], currentFranchise: null, year: 2026 })
        ).toThrow();
    });
});

describe('comparateur LAMal : enfant', () => {
    beforeEach(() => resetDemoDb());

    it('franchises 0 à 600, quote-part plafonnée à 350, sans reprise de l’assurance de l’adulte', () => {
        const context = handleDemoRequest('GET', `${BASE}/context?child=true`) as LamalContext;
        expect(context.child).toBe(true);
        expect(context.franchises).toEqual([0, 100, 200, 300, 400, 500, 600]);
        expect(context.quotePartMax).toBe(350);
        expect(context.currentFranchise).toBeNull();

        const result = compare({
            expectedCosts: 1000,
            quotes: [{ franchise: 100, monthlyPremium: 100 }],
            currentFranchise: null,
            year: 2026,
            child: true
        });
        expect(result.options[0]).toMatchObject({ expectedCostSharing: 90, expectedCost: 1390, maxCost: 1650 });
        const [local] = compareRows({ quotePartRate: 10, quotePartMax: 350 }, [{ franchise: 100, premium: 100 }], 1000, null);
        expect(local).toMatchObject({ expectedCost: 1390, maxCost: 1650 });
    });

    it('refuse une franchise d’adulte pour un enfant et inversement', () => {
        expect(() =>
            compare({
                expectedCosts: 1000,
                quotes: [{ franchise: 1000, monthlyPremium: 100 }],
                currentFranchise: null,
                year: 2026,
                child: true
            })
        ).toThrow();
        expect(() =>
            compare({ expectedCosts: 1000, quotes: [{ franchise: 100, monthlyPremium: 100 }], currentFranchise: null, year: 2026 })
        ).toThrow();
    });
});

describe('comparaison LAMal enregistrée', () => {
    beforeEach(() => resetDemoDb());

    const request = (child: boolean, franchise: number) => ({
        expectedCosts: 900,
        quotes: [{ franchise, monthlyPremium: 310.005 }],
        currentFranchise: franchise,
        year: 2026,
        child
    });

    it('enregistre, remplace, relit par le contexte, par profil, puis supprime', () => {
        expect((handleDemoRequest('GET', `${BASE}/context?year=2026`) as LamalContext).saved).toBeNull();

        handleDemoRequest('PUT', `${BASE}/saved`, request(false, 300));
        handleDemoRequest('PUT', `${BASE}/saved`, request(false, 500));
        const saved = (handleDemoRequest('GET', `${BASE}/context?year=2026`) as LamalContext).saved;
        expect(saved).toMatchObject({ expectedCosts: 900, currentFranchise: 500, child: false });
        expect(saved?.quotes).toEqual([{ franchise: 500, monthlyPremium: 310.01 }]);

        handleDemoRequest('PUT', `${BASE}/saved`, request(true, 100));
        expect((handleDemoRequest('GET', `${BASE}/context?year=2026&child=true`) as LamalContext).saved?.child).toBe(true);

        handleDemoRequest('DELETE', `${BASE}/saved?year=2026`);
        expect((handleDemoRequest('GET', `${BASE}/context?year=2026`) as LamalContext).saved).toBeNull();
        expect((handleDemoRequest('GET', `${BASE}/context?year=2026&child=true`) as LamalContext).saved).not.toBeNull();
    });

    it('refuse une saisie invalide sans rien enregistrer', () => {
        expect(() => handleDemoRequest('PUT', `${BASE}/saved`, request(false, 123))).toThrow();
        expect((handleDemoRequest('GET', `${BASE}/context?year=2026`) as LamalContext).saved).toBeNull();
    });
});

describe('page Comparateur LAMal', () => {
    it('place l’entrée dans le menu Outils', () => {
        expect(idsFromPath(LAMAL_COMPARISON_PATH)).toEqual({ openId: 'tools', activeId: 'lamal' });
        expect(idsFromPath('/demo/planning/comparateur-lamal').activeId).toBe('lamal');
    });

    it('verrouille la page dans la démo', () => {
        const page = (DemoRoutes.children ?? []).find((child) => child.path === 'planning/comparateur-lamal');
        expect(page?.name).toBe('DemoAppLamalComparison');
        expect(String(page?.component)).toContain('DemoLockedPage');
    });
});
