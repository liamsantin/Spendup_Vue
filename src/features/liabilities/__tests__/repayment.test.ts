import { beforeEach, describe, expect, it } from 'vitest';
import { resetDemoDb } from '@/features/demo/db';
import { handleDemoRequest } from '@/features/demo/handle';
import { REPAYMENT_SIMULATOR_PATH, simulateRepayment, type RepaymentResult } from '@/features/liabilities/repayment';
import { idsFromPath } from '@/layouts/shell/composables/useShellNav';
import DemoRoutes from '@/router/DemoRoutes';

const BASE = '/api/liabilities/repayment-simulation';
const run = (principal: number, annualRatePercent: number, monthlyPayment: number) =>
    simulateRepayment({ principal, annualRatePercent, monthlyPayment });

beforeEach(() => resetDemoDb());

describe('calcul local du remboursement', () => {
    it('1 000 à 0 % avec 300 par mois : 4 mensualités, dernière de 100, aucun intérêt', () => {
        expect(run(1000, 0, 300)).toMatchObject({ status: 'repaid', months: 4, totalPaid: 1000, totalInterest: 0, lastPayment: 100 });
    });

    it('10 000 à 12 % avec 100 par mois : non amortissable, mensualité minimale 100,01', () => {
        const result = run(10000, 12, 100);
        expect(result).toMatchObject({ status: 'neverRepaid', firstMonthInterest: 100, minimumPayment: 100.01, months: null });
    });

    it('10 000 à 5 % avec 856,08 par mois : 12 mensualités et environ 273 d’intérêts', () => {
        const result = run(10000, 5, 856.08);
        expect(result.months).toBe(12);
        expect(result.totalInterest).toBeGreaterThan(270);
        expect(result.totalInterest).toBeLessThan(276);
    });

    it('annonce plus de 100 ans comme trop long', () => {
        expect(run(1_000_000, 1, 833.34).status).toBe('tooLong');
    });
});

describe('démo', () => {
    it('donne le même résultat que le calcul local', () => {
        const result = handleDemoRequest('POST', BASE, {
            principal: 10000,
            annualRatePercent: 5,
            monthlyPayment: 856.08
        }) as RepaymentResult;
        expect(result).toEqual(run(10000, 5, 856.08));
    });

    it('refuse un capital nul, une mensualité négative et un taux hors limites', () => {
        for (const body of [
            { principal: 0, annualRatePercent: 3, monthlyPayment: 100 },
            { principal: 1000, annualRatePercent: 3, monthlyPayment: -5 },
            { principal: 1000, annualRatePercent: 101, monthlyPayment: 100 }
        ]) {
            expect(() => handleDemoRequest('POST', BASE, body)).toThrow();
        }
    });
});

describe('navigation', () => {
    it('range la page dans la section Outils, en démo aussi', () => {
        expect(idsFromPath(REPAYMENT_SIMULATOR_PATH)).toEqual({ openId: 'tools', activeId: 'repayment' });
        expect(idsFromPath('/demo/planning/simulateur-remboursement').activeId).toBe('repayment');
    });

    it('ouvre la page dans la démo', () => {
        const page = (DemoRoutes.children ?? []).find((child) => child.path === 'planning/simulateur-remboursement');
        expect(page?.name).toBe('DemoAppRepaymentSimulator');
    });
});
