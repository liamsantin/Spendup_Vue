import { describe, expect, it } from 'vitest';
import { createDemoDb, slideDemoDb } from '@/features/demo/db';
import { demoMonthShift, demoTaxYear, shiftDemoDates, shiftTaxYear, shiftYmd } from '@/features/demo/sliding';

describe('démo glissante (V6.7)', () => {
    it('décalage en mois entiers, jamais négatif, nul dans les tests sans date', () => {
        expect(demoMonthShift()).toBe(0);
        expect(demoMonthShift(new Date(2026, 10, 30))).toBe(0);
        expect(demoMonthShift(new Date(2026, 11, 1))).toBe(1);
        expect(demoMonthShift(new Date(2027, 1, 10))).toBe(3);
        expect(demoMonthShift(new Date(2026, 5, 1))).toBe(0);
    });

    it('décale une date en gardant le jour, ramené à la fin du mois', () => {
        expect(shiftYmd('2026-11-12', 1)).toBe('2026-12-12');
        expect(shiftYmd('2026-11-30', 3)).toBe('2027-02-28');
        expect(shiftYmd('2026-11-14T09:00:00.000Z', 2)).toBe('2027-01-14T09:00:00.000Z');
        expect(shiftYmd('pas une date', 2)).toBe('pas une date');
    });

    it('une date passée ne tombe pas dans le futur ; une date future garde son écart', () => {
        const now = new Date(2026, 11, 3);
        const shifted = shiftDemoDates({ past: '2026-11-12', early: '2026-11-02', future: '2027-06-01', label: 'Migros', n: 4 }, 1, now);
        expect(shifted).toEqual({ past: '2026-12-03', early: '2026-12-02', future: '2027-07-01', label: 'Migros', n: 4 });
    });

    it('année fiscale : celle qui contient le plus d’opérations, la plus récente à égalité', () => {
        expect(demoTaxYear(['2026-12-01', '2027-01-05', '2027-02-01'])).toBe(2027);
        expect(demoTaxYear(['2026-12-01', '2027-01-05'])).toBe(2027);
        expect(demoTaxYear([])).toBe(2026);
        expect(shiftTaxYear({ year: 2026, dueDate: '2026-03-31', detail: 'Certificat de salaire 2026', amount: 2026 }, 2027)).toEqual({
            year: 2027,
            dueDate: '2027-03-31',
            detail: 'Certificat de salaire 2027',
            amount: 2026
        });
    });

    it('base glissée en février 2027 : le mois courant a des opérations, budgets et impôts suivent', () => {
        const now = new Date(2027, 1, 10);
        const db = slideDemoDb(createDemoDb(), now);
        try {
            const dates = db.transactions.map((tx) => tx.operationDate);
            expect(dates.every((date) => date <= '2027-02-10')).toBe(true);
            expect(dates.filter((date) => date.startsWith('2027-02')).length).toBeGreaterThan(3);

            const tax = db.taxReturns[0];
            expect(tax.year).toBe(demoTaxYear(dates));
            expect((tax.installments ?? []).every((item) => item.dueDate.startsWith(String(tax.year)))).toBe(true);
            const payment = db.transactions.find((tx) => tx.taxNature === 'taxPayment');
            expect(payment?.label).toBe(`Acompte impôts ${tax.year}`);
            expect(payment && payment.operationDate <= '2027-02-10').toBe(true);

            // Les échéances récurrentes sont déjà relatives à la date du jour : elles ne sont pas décalées.
            expect(db.recurringExpenses).toEqual(createDemoDb().recurringExpenses);
        } finally {
            slideDemoDb(createDemoDb());
        }
    });
});
