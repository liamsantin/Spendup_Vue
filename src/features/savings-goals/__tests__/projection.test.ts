import { beforeEach, describe, expect, it } from 'vitest';
import { resetDemoDb } from '@/features/demo/db';
import { handleDemoRequest } from '@/features/demo/handle';
import { buildCreateSavingsGoalPayload, buildUpdateSavingsGoalPayload, emptySavingsGoalFormFields } from '@/features/savings-goals/payload';
import { computeSavingsProjection, type SavingsProjection } from '@/features/savings-goals/projection';

const BASE = '/api/savings-goals';

beforeEach(() => resetDemoDb());

describe('calcul local de la projection', () => {
    it('5 000 + 100 par mois à 0 % : 6 200 après 1 an, 17 000 après 10 ans, sans intérêt', () => {
        const points = computeSavingsProjection(5000, 100, 0, 10);
        expect(points).toHaveLength(10);
        expect(points[0]).toEqual({ year: 1, contributed: 6200, value: 6200, interest: 0 });
        expect(points[9]).toEqual({ year: 10, contributed: 17000, value: 17000, interest: 0 });
    });

    it('1 200 par an à 12 % : 1 268,25 après un an (capitalisation mensuelle)', () => {
        const [first] = computeSavingsProjection(0, 100, 12, 1);
        expect(first).toEqual({ year: 1, contributed: 1200, value: 1268.25, interest: 68.25 });
    });

    it('capital seul à 6 % : 1 061,68 après un an', () => {
        expect(computeSavingsProjection(1000, 0, 6, 1)[0]?.value).toBe(1061.68);
    });

    it('rendement négatif : intérêts négatifs', () => {
        const [first] = computeSavingsProjection(1000, 0, -12, 1);
        expect(first?.value).toBeLessThan(1000);
        expect(first?.interest).toBeLessThan(0);
    });

    it('aucun départ ni versement : tout reste à zéro', () => {
        expect(computeSavingsProjection(0, 0, 5, 3).every((p) => p.value === 0)).toBe(true);
    });
});

describe('démo', () => {
    it('donne la même projection que le calcul local, rendement de l’objectif compris', () => {
        const goal = (handleDemoRequest('GET', BASE) as { items: { publicId: string; currentAmount: number }[] }).items[0]!;
        const result = handleDemoRequest(
            'GET',
            `${BASE}/${goal.publicId}/projection?years=5&monthly=100&ratePercent=3`
        ) as SavingsProjection;
        expect(result.monthlyFromHistory).toBe(false);
        expect(result.annualRatePercent).toBe(3);
        expect(result.points).toEqual(computeSavingsProjection(goal.currentAmount, 100, 3, 5));
    });

    it('sans paramètre : 10 ans, versement du rythme récent, rendement 0 sans hypothèse', () => {
        const goal = (handleDemoRequest('GET', BASE) as { items: { publicId: string }[] }).items[0]!;
        const result = handleDemoRequest('GET', `${BASE}/${goal.publicId}/projection`) as SavingsProjection;
        expect(result.points).toHaveLength(10);
        expect(result.monthlyFromHistory).toBe(true);
        expect(result.annualRatePercent).toBe(0);
    });

    it('refuse un horizon, un versement ou un rendement hors limites', () => {
        const goal = (handleDemoRequest('GET', BASE) as { items: { publicId: string }[] }).items[0]!;
        for (const qs of ['years=0', 'years=11', 'monthly=-1', 'ratePercent=101', 'ratePercent=-101']) {
            expect(() => handleDemoRequest('GET', `${BASE}/${goal.publicId}/projection?${qs}`)).toThrow();
        }
    });
});

describe('rendement dans le formulaire', () => {
    const fields = (rate: string) => ({
        ...emptySavingsGoalFormFields({ currency: 'CHF' }),
        name: 'Voyage',
        targetAmount: '2000',
        expectedReturnRate: rate
    });

    it('vide = non renseigné, sinon nombre', () => {
        const empty = buildCreateSavingsGoalPayload(fields(''));
        const filled = buildCreateSavingsGoalPayload(fields('3,5'));
        expect(empty.ok && empty.payload.expectedReturnRate).toBeNull();
        expect(filled.ok && filled.payload.expectedReturnRate).toBe(3.5);
    });

    it('refuse un rendement hors de -100 à 100 ou illisible', () => {
        for (const rate of ['101', '-101', 'abc']) {
            const result = buildCreateSavingsGoalPayload(fields(rate));
            expect(result.ok).toBe(false);
        }
        const update = buildUpdateSavingsGoalPayload(fields('4'), { lockedCurrency: 'CHF' });
        expect(update.ok && update.payload.expectedReturnRate).toBe(4);
    });
});
