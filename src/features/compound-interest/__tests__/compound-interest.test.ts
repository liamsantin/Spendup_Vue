import { beforeEach, describe, expect, it } from 'vitest';
import { compoundInputIssue, computeCompoundInterest } from '@/features/compound-interest/calculator';
import {
    COMPOUND_INTEREST_PATH,
    COMPOUND_MAX_SAVED,
    type CompoundCalculation,
    type CompoundInterestRequest,
    type CompoundInterestResult
} from '@/features/compound-interest/types';
import { resetDemoDb } from '@/features/demo/db';
import { handleDemoRequest } from '@/features/demo/handle';
import { idsFromPath } from '@/layouts/shell/composables/useShellNav';
import DemoRoutes from '@/router/DemoRoutes';

const BASE = '/api/compound-interest';

function input(partial: Partial<CompoundInterestRequest> = {}): CompoundInterestRequest {
    return {
        initialAmount: 0,
        contributionAmount: 0,
        annualRatePercent: 0,
        years: 1,
        contributionFrequency: 'monthly',
        contributionAtStart: false,
        contributionGrowthPercent: 0,
        compounding: 'monthly',
        annualFeePercent: 0,
        inflationPercent: 0,
        ...partial
    };
}

const run = (partial: Partial<CompoundInterestRequest>): CompoundInterestResult => {
    const result = computeCompoundInterest(input(partial));
    if (!result) throw new Error('résultat attendu');
    return result;
};

beforeEach(() => resetDemoDb());

describe('calcul local des intérêts composés', () => {
    it('10 000 à 5 % capitalisés chaque année sur 10 ans : 16 288,95', () => {
        const result = run({ initialAmount: 10000, annualRatePercent: 5, years: 10, compounding: 'yearly' });
        expect(result.finalValue).toBe(16288.95);
        expect(result.totalContributed).toBe(10000);
        expect(result.totalInterest).toBe(6288.95);
        expect(result.points).toHaveLength(10);
    });

    it('100 par mois à 12 % : 1 268,25 en fin de mois, 1 280,93 en début de mois', () => {
        expect(run({ contributionAmount: 100, annualRatePercent: 12 }).finalValue).toBe(1268.25);
        expect(run({ contributionAmount: 100, annualRatePercent: 12, contributionAtStart: true }).finalValue).toBe(1280.93);
    });

    it('capitalisation quotidienne : 1 000 à 10 % donne 1 105,16, contre 1 100 par an', () => {
        expect(run({ initialAmount: 1000, annualRatePercent: 10, compounding: 'daily' }).finalValue).toBe(1105.16);
        expect(run({ initialAmount: 1000, annualRatePercent: 10, compounding: 'yearly' }).finalValue).toBe(1100);
    });

    it('à 0 %, toutes les fréquences de versement donnent 1 200 par an', () => {
        expect(run({ contributionAmount: 100, contributionFrequency: 'monthly', years: 2 }).finalValue).toBe(2400);
        expect(run({ contributionAmount: 300, contributionFrequency: 'quarterly', years: 2 }).finalValue).toBe(2400);
        expect(run({ contributionAmount: 1200, contributionFrequency: 'yearly', years: 2 }).finalValue).toBe(2400);
    });

    it('hausse annuelle de 10 % des versements : 1 200 puis 1 320', () => {
        const result = run({ contributionAmount: 100, contributionGrowthPercent: 10, years: 2 });
        expect(result.points.map((p) => p.value)).toEqual([1200, 2520]);
    });

    it('frais : 6 % brut moins 1 % de frais donne 10 500 au lieu de 10 600, coût 100', () => {
        const result = run({ initialAmount: 10000, annualRatePercent: 6, compounding: 'yearly', annualFeePercent: 1 });
        expect(result.finalValue).toBe(10500);
        expect(result.feeCost).toBe(100);
    });

    it('inflation : 10 000 sans rendement avec 2 % donne 9 803,92 de valeur réelle', () => {
        const result = run({ initialAmount: 10000, inflationPercent: 2 });
        expect(result.finalValue).toBe(10000);
        expect(result.finalRealValue).toBe(9803.92);
    });

    it('rendement négatif : valeur sous le versé, intérêts négatifs', () => {
        const result = run({ initialAmount: 1000, annualRatePercent: -12 });
        expect(result.finalValue).toBeLessThan(1000);
        expect(result.totalInterest).toBeLessThan(0);
    });

    it('les intérêts de chaque année s’additionnent aux intérêts totaux', () => {
        const result = run({
            initialAmount: 5000,
            contributionAmount: 200,
            annualRatePercent: 6,
            years: 7,
            contributionGrowthPercent: 3,
            annualFeePercent: 0.5
        });
        const sum = result.points.reduce((total, p) => total + p.yearInterest, 0);
        expect(Math.abs(sum - result.totalInterest)).toBeLessThan(0.1);
    });

    it('compare le rendement saisi, -2 et +2 points, et omet ce qui sort des limites', () => {
        const middle = run({ initialAmount: 1000, annualRatePercent: 5, years: 5, compounding: 'yearly' });
        expect(middle.scenarios.map((s) => s.annualRatePercent)).toEqual([3, 5, 7]);
        expect(middle.scenarios[1]?.finalValue).toBe(middle.finalValue);
        expect(run({ initialAmount: 1000, annualRatePercent: 99 }).scenarios.map((s) => s.annualRatePercent)).toEqual([97, 99]);
    });

    it('refuse les valeurs hors limites et un résultat trop grand', () => {
        expect(compoundInputIssue(input())).toBe('empty');
        expect(compoundInputIssue(input({ initialAmount: -1 }))).toBe('amount');
        expect(compoundInputIssue(input({ initialAmount: 1, annualRatePercent: 101 }))).toBe('rate');
        expect(compoundInputIssue(input({ initialAmount: 1, years: 0 }))).toBe('years');
        expect(compoundInputIssue(input({ initialAmount: 1, years: 51 }))).toBe('years');
        expect(compoundInputIssue(input({ initialAmount: 1, annualFeePercent: 21 }))).toBe('fee');
        expect(compoundInputIssue(input({ initialAmount: 1, inflationPercent: 101 }))).toBe('inflation');
        expect(compoundInputIssue(input({ initialAmount: 1, contributionGrowthPercent: 101 }))).toBe('growth');
        expect(compoundInputIssue(input({ initialAmount: Number.NaN }))).toBe('amount');
        expect(
            computeCompoundInterest(input({ initialAmount: 1_000_000_000, annualRatePercent: 100, years: 50, compounding: 'daily' }))
        ).toBeNull();
    });
});

describe('démo : calcul', () => {
    it('donne le même résultat que le calcul local et complète les choix vides', () => {
        const result = handleDemoRequest('POST', `${BASE}/simulate`, {
            initialAmount: 1000,
            contributionAmount: 50,
            annualRatePercent: 4,
            years: 5
        }) as CompoundInterestResult;
        expect(result.input.contributionFrequency).toBe('monthly');
        expect(result.input.compounding).toBe('monthly');
        expect(result).toEqual(run({ initialAmount: 1000, contributionAmount: 50, annualRatePercent: 4, years: 5 }));
    });

    it('refuse des paramètres invalides', () => {
        for (const body of [
            { initialAmount: 0, contributionAmount: 0, annualRatePercent: 5, years: 5 },
            { initialAmount: 1000, annualRatePercent: 101, years: 5 },
            { initialAmount: 1000, annualRatePercent: 5, years: 0 },
            { initialAmount: 1000, annualRatePercent: 5, years: 5, contributionFrequency: 'weekly' },
            { initialAmount: 1000, annualRatePercent: 5, years: 5, compounding: 'hourly' },
            { initialAmount: 1000, annualRatePercent: 5, years: 5, annualFeePercent: 21 }
        ]) {
            expect(() => handleDemoRequest('POST', `${BASE}/simulate`, body)).toThrow();
        }
    });
});

describe('démo : calculs enregistrés', () => {
    const save = (name: string, partial: Partial<CompoundInterestRequest> = {}) =>
        handleDemoRequest('POST', `${BASE}/calculations`, {
            name,
            input: input({ initialAmount: 1000, contributionAmount: 100, annualRatePercent: 4, years: 20, ...partial })
        }) as CompoundCalculation;

    it('enregistre, relit, liste, modifie et supprime', () => {
        const created = save('  Retraite ');
        expect(created.name).toBe('Retraite');
        expect(created.currency).toBe('CHF');
        expect(created.finalValue).toBe(run({ initialAmount: 1000, contributionAmount: 100, annualRatePercent: 4, years: 20 }).finalValue);

        expect((handleDemoRequest('GET', `${BASE}/calculations/${created.publicId}`) as CompoundCalculation).name).toBe('Retraite');
        expect((handleDemoRequest('GET', `${BASE}/calculations`) as { totalCount: number }).totalCount).toBe(1);

        const updated = handleDemoRequest('PUT', `${BASE}/calculations/${created.publicId}`, {
            name: 'Retraite 2',
            input: input({ initialAmount: 2000, annualRatePercent: 5, years: 25, contributionFrequency: 'quarterly' })
        }) as CompoundCalculation;
        expect(updated.name).toBe('Retraite 2');
        expect(updated.input.years).toBe(25);
        expect(updated.updatedAt).not.toBeNull();

        handleDemoRequest('DELETE', `${BASE}/calculations/${created.publicId}`);
        expect((handleDemoRequest('GET', `${BASE}/calculations`) as { totalCount: number }).totalCount).toBe(0);
        expect(() => handleDemoRequest('GET', `${BASE}/calculations/${created.publicId}`)).toThrow();
    });

    it('refuse un nom vide, des paramètres invalides, et plus de 50 calculs', () => {
        expect(() => save('   ')).toThrow();
        expect(() => save('Ok', { years: 0 })).toThrow();
        expect((handleDemoRequest('GET', `${BASE}/calculations`) as { totalCount: number }).totalCount).toBe(0);
        for (let i = 0; i < COMPOUND_MAX_SAVED; i += 1) save(`Calcul ${i}`);
        expect(() => save('Un de trop')).toThrow();
    });
});

describe('navigation', () => {
    it('range la page dans la section Outils, en démo aussi', () => {
        expect(idsFromPath(COMPOUND_INTEREST_PATH)).toEqual({ openId: 'tools', activeId: 'compoundInterest' });
        expect(idsFromPath('/demo/planning/interets-composes').activeId).toBe('compoundInterest');
    });

    it('ouvre la page dans la démo', () => {
        const page = (DemoRoutes.children ?? []).find((child) => child.path === 'planning/interets-composes');
        expect(page?.name).toBe('DemoAppCompoundInterest');
    });
});
