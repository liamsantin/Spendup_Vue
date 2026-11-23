import { beforeEach, describe, expect, it } from 'vitest';
import { resetDemoDb } from '@/features/demo/db';
import { handleDemoRequest } from '@/features/demo/handle';
import {
    computeRetirement,
    monthsToRetirement,
    referenceAge,
    retirementInputIssue,
    type RetirementLegal
} from '@/features/retirement/calculator';
import { RETIREMENT_PATH, type RetirementInput, type RetirementProfile, type RetirementResult } from '@/features/retirement/types';
import { idsFromPath } from '@/layouts/shell/composables/useShellNav';
import DemoRoutes from '@/router/DemoRoutes';

const BASE = '/api/retirement';
/** Même date que les tests de l’API : 18 juillet 2026. */
const TODAY = new Date(2026, 6, 18);
const LEGAL: RetirementLegal = { year: 2026, avsPensionMin: 1260, avsPensionMax: 2520, lppMinConversionRatePercent: 6.8 };

function input(partial: Partial<RetirementInput> = {}): RetirementInput {
    return {
        birthYear: 1970,
        gender: 'male',
        avsMonthlyPension: 2000,
        lppAnnualPension: 0,
        lppCapital: 0,
        lppConversionRatePercent: 0,
        pillar3aCapital: 0,
        pillar3aSpreadYears: 20,
        monthlyExpensesOverride: null,
        expectedReturnPercent: 0,
        ...partial
    };
}

const run = (partial: Partial<RetirementInput>, average: { amount: number; monthsUsed: number } | null = null): RetirementResult =>
    computeRetirement(input(partial), LEGAL, 'CHF', average, TODAY);

beforeEach(() => resetDemoDb());

describe('âge de référence', () => {
    it.each([
        ['male', 1962, 65, 0],
        ['female', 1960, 64, 0],
        ['female', 1961, 64, 3],
        ['female', 1962, 64, 6],
        ['female', 1963, 64, 9],
        ['female', 1964, 65, 0]
    ] as const)('%s né en %i : %i ans + %i mois', (gender, year, years, months) => {
        expect(referenceAge(gender, year)).toEqual({ years, extraMonths: months });
    });

    it('compte 102 mois pour un homme né en 1970 en juillet 2026, et 0 une fois l’âge atteint', () => {
        expect(monthsToRetirement(input(), TODAY)).toBe(102);
        expect(monthsToRetirement(input({ birthYear: 1955 }), TODAY)).toBe(0);
    });
});

describe('calcul', () => {
    it('additionne AVS × 13 / 12, LPP et 3a réparti, sans écart quand les rentes couvrent les dépenses', () => {
        const result = run({ lppAnnualPension: 24000, pillar3aCapital: 120000, monthlyExpensesOverride: 4000 });

        expect(result.avsMonthly).toBe(2166.67);
        expect(result.lppMonthly).toBe(2000);
        expect(result.pillar3aMonthly).toBe(500);
        expect(result.totalMonthly).toBe(4666.67);
        expect(result.gap).toBe(-666.67);
        expect(result.coverageRate).toBe(1.1667);
        expect(result.savings).toBeNull();
        expect(result.warnings).toEqual([]);
    });

    it('calcule le capital manquant et l’épargne mensuelle à 0 % sur 102 mois', () => {
        const result = run({ monthlyExpensesOverride: 6000 });

        expect(result.gap).toBe(3833.33);
        expect(result.savings).toEqual({ requiredCapital: 919999.2, monthsToRetirement: 102, returnPercent: 0, monthlySavings: 9019.6 });
    });

    it('baisse l’épargne mensuelle quand un rendement est supposé', () => {
        const flat = run({ monthlyExpensesOverride: 6000 });
        const growing = run({ monthlyExpensesOverride: 6000, expectedReturnPercent: 4 });

        expect(growing.savings?.monthlySavings ?? 0).toBeLessThan(flat.savings?.monthlySavings ?? 0);
        expect(growing.savings?.requiredCapital).toBe(flat.savings?.requiredCapital);
    });

    it('déduit la rente LPP du capital et du taux de conversion', () => {
        const result = run({ avsMonthlyPension: 0, lppCapital: 500000, lppConversionRatePercent: 6.8, monthlyExpensesOverride: 3000 });

        expect(result.lppMonthly).toBe(2833.33);
        expect(result.warnings).not.toContain('lppRateBelowMinimum');
        expect(run({ lppCapital: 500000, lppConversionRatePercent: 5 }).warnings).toContain('lppRateBelowMinimum');
    });

    it('ne propose plus d’épargne mensuelle une fois l’âge de référence atteint', () => {
        const result = run({ birthYear: 1955, monthlyExpensesOverride: 4000 });

        expect(result.alreadyRetired).toBe(true);
        expect(result.savings?.monthlySavings).toBeNull();
        expect(result.savings?.requiredCapital).toBeGreaterThan(0);
    });

    it.each([
        [3000, 'avsAboveMax'],
        [1000, 'avsBelowMin']
    ] as const)('signale une rente AVS de %i hors des bornes de l’année', (pension, warning) => {
        expect(run({ avsMonthlyPension: pension, monthlyExpensesOverride: 3000 }).warnings).toContain(warning);
        expect(run({ avsMonthlyPension: 2000, monthlyExpensesOverride: 3000 }).warnings).toEqual([]);
    });

    it('utilise la moyenne constatée sans dépenses saisies, et le signale quand il n’y en a aucune', () => {
        const average = run({}, { amount: 1500, monthsUsed: 2 });
        expect(average.expensesSource).toBe('average');
        expect(average.monthlyExpenses).toBe(1500);
        expect(average.expensesMonthsUsed).toBe(2);

        const none = run({});
        expect(none.expensesSource).toBe('none');
        expect(none.warnings).toContain('noExpenses');
        expect(none.coverageRate).toBeNull();
    });
});

describe('validation', () => {
    it('refuse les valeurs hors limites, comme l’API', () => {
        for (const partial of [
            { birthYear: 1850 },
            { birthYear: 2020 },
            { avsMonthlyPension: -1 },
            { lppCapital: 500000 },
            { pillar3aSpreadYears: 0 },
            { expectedReturnPercent: 25 }
        ]) {
            expect(retirementInputIssue(input(partial), TODAY)).not.toBeNull();
        }
        expect(retirementInputIssue(input(), TODAY)).toBeNull();
    });
});

describe('démo', () => {
    it('estime sans enregistrer, avec les bornes de l’année servies par les paramètres légaux', () => {
        const result = handleDemoRequest('POST', `${BASE}/simulate`, input({ monthlyExpensesOverride: 6000 })) as RetirementResult;

        expect(result.legalYear).toBe(2026);
        expect(result.avsPensionMax).toBe(2520);
        expect(result.gap).toBeGreaterThan(0);
        expect((handleDemoRequest('GET', `${BASE}/profile`) as RetirementProfile).input).toBeNull();
    });

    it('refuse une saisie invalide', () => {
        expect(() => handleDemoRequest('POST', `${BASE}/simulate`, input({ birthYear: 1850 }))).toThrow();
        expect(() => handleDemoRequest('PUT', `${BASE}/profile`, input({ gender: 'x' as never }))).toThrow();
    });

    it('enregistre un seul profil, le remplace puis le supprime', () => {
        handleDemoRequest('PUT', `${BASE}/profile`, input({ pillar3aCapital: 50000, pillar3aSpreadYears: null }));
        handleDemoRequest('PUT', `${BASE}/profile`, input({ avsMonthlyPension: 2100, pillar3aCapital: 60000, pillar3aSpreadYears: 25 }));

        const saved = handleDemoRequest('GET', `${BASE}/profile`) as RetirementProfile;
        expect(saved.input?.avsMonthlyPension).toBe(2100);
        expect(saved.input?.pillar3aSpreadYears).toBe(25);
        expect(saved.updatedAt).not.toBeNull();

        handleDemoRequest('DELETE', `${BASE}/profile`);
        expect((handleDemoRequest('GET', `${BASE}/profile`) as RetirementProfile).input).toBeNull();
    });
});

describe('navigation', () => {
    it('range la page dans la section Outils, en démo aussi', () => {
        expect(idsFromPath(RETIREMENT_PATH)).toEqual({ openId: 'tools', activeId: 'retirement' });
        expect(idsFromPath('/demo/planning/retraite').activeId).toBe('retirement');
    });

    it('verrouille la page dans la démo', () => {
        const page = (DemoRoutes.children ?? []).find((child) => child.path === 'planning/retraite');
        expect(page?.name).toBe('DemoAppRetirement');
        expect(String(page?.component)).toContain('DemoLockedPage');
    });
});
