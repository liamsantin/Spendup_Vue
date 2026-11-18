import { beforeEach, describe, expect, it } from 'vitest';
import { resetDemoDb } from '@/features/demo/db';
import { handleDemoRequest } from '@/features/demo/handle';
import type { TaxInstallmentCandidate, TaxInstallments, TaxReminder } from '@/features/tax/types';

const BASE = '/api/tax-returns/TAX2026/installments';

function list() {
    return handleDemoRequest('GET', BASE) as TaxInstallments;
}

describe('tranches d’impôt en mode démo', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('montre un acompte déjà rapproché, deux tranches à venir et leurs totaux', () => {
        const data = list();
        expect(data.items.map((item) => `${item.competence}-${item.sequence}`)).toEqual(['cantonal-1', 'cantonal-2', 'federal-1']);
        expect(data.items[0]).toMatchObject({ status: 'paid', paidAmount: 650 });
        expect(data.items[0].transactions).toHaveLength(1);
        expect(data.planned).toBe(1600);
        expect(data.paid).toBe(650);
        expect(data.remaining).toBe(950);
    });

    it('ajoute, numérote par ressort, marque payée à la main et supprime', () => {
        const created = handleDemoRequest('POST', BASE, { competence: 'federal', dueDate: '2027-03-31', amount: 120 }) as TaxInstallments;
        const added = created.items.find((item) => item.competence === 'federal' && item.sequence === 2)!;
        expect(added.amount).toBe(120);

        const paid = handleDemoRequest('PUT', `${BASE}/${added.publicId}`, { paidAmount: 120, paidAt: '2027-03-01' }) as TaxInstallments;
        expect(paid.items.find((item) => item.publicId === added.publicId)).toMatchObject({ status: 'paid', paidAt: '2027-03-01' });

        const cleared = handleDemoRequest('PUT', `${BASE}/${added.publicId}`, { clearPayment: true }) as TaxInstallments;
        expect(cleared.items.find((item) => item.publicId === added.publicId)?.status).not.toBe('paid');

        const removed = handleDemoRequest('DELETE', `${BASE}/${added.publicId}`) as TaxInstallments;
        expect(removed.items.some((item) => item.publicId === added.publicId)).toBe(false);
    });

    it('refuse un ressort invalide et un montant nul', () => {
        expect(() => handleDemoRequest('POST', BASE, { competence: 'both', dueDate: '2027-01-01', amount: 10 })).toThrow();
        expect(() => handleDemoRequest('POST', BASE, { competence: 'cantonal', dueDate: '2027-01-01', amount: 0 })).toThrow();
    });

    it('propose les paiements confirmés non rapprochés, puis les rapproche et les libère', () => {
        expect(handleDemoRequest('GET', `${BASE}/candidates`) as TaxInstallmentCandidate[]).toEqual([]);

        const detached = handleDemoRequest('DELETE', `${BASE}/TXI0001/transactions/TXN0017`) as TaxInstallments;
        expect(detached.items[0].paidAmount).toBe(0);
        const free = handleDemoRequest('GET', `${BASE}/candidates`) as TaxInstallmentCandidate[];
        expect(free.map((item) => item.transactionPublicId)).toEqual(['TXN0017']);

        const linked = handleDemoRequest('POST', `${BASE}/TXI0002/transactions`, { transactionPublicId: 'TXN0017' }) as TaxInstallments;
        expect(linked.items.find((item) => item.publicId === 'TXI0002')).toMatchObject({ status: 'paid', paidAmount: 650 });
        expect(() => handleDemoRequest('POST', `${BASE}/TXI0003/transactions`, { transactionPublicId: 'TXN0017' })).toThrow();
    });
    it('rappelle une tranche proche ou en retard, pas une payée ni une lointaine', () => {
        const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
        handleDemoRequest('POST', BASE, { competence: 'cantonal', dueDate: day(3), amount: 100 });
        handleDemoRequest('POST', BASE, { competence: 'federal', dueDate: day(-5), amount: 80 });
        handleDemoRequest('POST', BASE, { competence: 'federal', dueDate: day(40), amount: 60 });
        const reminders = (handleDemoRequest('GET', '/api/tax-returns/TAX2026/reminders') as { items: TaxReminder[] }).items;
        const deadlines = reminders.filter((item) => item.code === 'deadlineSoon' || item.code === 'deadlineOverdue');
        expect(deadlines.map((item) => [item.code, item.amount])).toEqual(
            expect.arrayContaining([
                ['deadlineSoon', 100],
                ['deadlineOverdue', 80]
            ])
        );
        expect(deadlines).toHaveLength(2);
    });
});
