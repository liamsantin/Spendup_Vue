import { beforeEach, describe, expect, it } from 'vitest';
import { resetDemoDb } from '@/features/demo/db';
import { handleDemoRequest } from '@/features/demo/handle';
import { REPAYMENT_SIMULATOR_PATH, repaymentYears, simulateRepayment, type RepaymentResult } from '@/features/liabilities/repayment';
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

describe('tableau d’amortissement', () => {
    it('une ligne par mois, sommes égales aux totaux, restant dû final nul', () => {
        const result = run(10000, 5, 856.08);
        const schedule = result.schedule ?? [];
        const sum = (key: 'payment' | 'interest' | 'principal') => Math.round(schedule.reduce((acc, row) => acc + row[key], 0) * 100) / 100;
        expect(schedule).toHaveLength(12);
        expect(schedule[0]).toMatchObject({ month: 1, interest: result.firstMonthInterest });
        expect(schedule[11].balance).toBe(0);
        expect(sum('principal')).toBe(10000);
        expect(sum('interest')).toBe(result.totalInterest);
        expect(sum('payment')).toBe(result.totalPaid);
    });

    it('pas de tableau sans remboursement possible', () => {
        expect(run(10000, 12, 100).schedule).toBeNull();
    });

    it('regroupe par année : 30 mois = 3 années, restant dû de fin d’année', () => {
        const schedule = run(30000, 0, 1000).schedule ?? [];
        const years = repaymentYears(schedule);
        expect(years.map((y) => y.year)).toEqual([1, 2, 3]);
        expect(years[0]).toMatchObject({ payment: 12000, interest: 0, principal: 12000, balance: 18000 });
        expect(years[2]).toMatchObject({ payment: 6000, balance: 0 });
    });

    it('la démo renvoie le tableau', () => {
        const result = handleDemoRequest('POST', BASE, { principal: 1000, annualRatePercent: 0, monthlyPayment: 300 }) as RepaymentResult;
        expect(result.schedule).toHaveLength(4);
    });
});

describe('navigation', () => {
    it('range la page dans la section Outils, en démo aussi', () => {
        expect(idsFromPath(REPAYMENT_SIMULATOR_PATH)).toEqual({ openId: 'tools', activeId: 'repayment' });
        expect(idsFromPath('/demo/planning/simulateur-remboursement').activeId).toBe('repayment');
    });

    it('verrouille la page dans la démo', () => {
        const page = (DemoRoutes.children ?? []).find((child) => child.path === 'planning/simulateur-remboursement');
        expect(page?.name).toBe('DemoAppRepaymentSimulator');
        expect(String(page?.component)).toContain('DemoLockedPage');
    });
});
