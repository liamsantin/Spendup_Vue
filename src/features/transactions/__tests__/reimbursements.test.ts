import { beforeEach, describe, expect, it } from 'vitest';
import { handleDemoRequest } from '@/features/demo/handle';
import { resetDemoDb } from '@/features/demo/db';
import { suggestedLinkAmount, type ReimbursementCandidate, type TransactionReimbursements } from '@/features/transactions/reimbursements';
import type { TaxMedical } from '@/features/tax/types';

describe('remboursements de frais médicaux (démo)', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('propose la facture médicale, relie, calcule le net à charge puis délie', () => {
        const candidates = handleDemoRequest('GET', '/api/transactions/TXN0014/reimbursement-candidates') as {
            items: ReimbursementCandidate[];
        };
        expect(candidates.items.map((item) => item.publicId)).toContain('TXN0012');

        const linked = handleDemoRequest('POST', '/api/transactions/TXN0014/reimbursements', {
            invoicePublicId: 'TXN0012',
            amount: 120
        }) as TransactionReimbursements;
        expect(linked.allocated).toBe(120);
        expect(linked.remaining).toBe(0);

        const invoice = handleDemoRequest('GET', '/api/transactions/TXN0012/reimbursements') as TransactionReimbursements;
        expect(invoice.reimbursed).toBe(120);
        expect(invoice.net).toBe(60);

        const medical = handleDemoRequest('GET', '/api/tax-returns/TAX2026/medical') as TaxMedical;
        expect(medical).toMatchObject({ gross: 180, reimbursed: 120, net: 60 });

        const unlinked = handleDemoRequest('DELETE', '/api/transactions/TXN0014/reimbursements/TXN0012') as TransactionReimbursements;
        expect(unlinked.invoices).toEqual([]);
        expect((handleDemoRequest('GET', '/api/transactions/TXN0012/reimbursements') as TransactionReimbursements).net).toBe(180);
    });

    it('refuse un total relié supérieur au remboursement', () => {
        expect(() =>
            handleDemoRequest('POST', '/api/transactions/TXN0014/reimbursements', { invoicePublicId: 'TXN0012', amount: 150 })
        ).toThrow();
    });

    it('la part reliée proposée est le plus petit du reste du remboursement et de la facture', () => {
        expect(suggestedLinkAmount(120, { remaining: 180 })).toBe(120);
        expect(suggestedLinkAmount(300, { remaining: 180 })).toBe(180);
        expect(suggestedLinkAmount(0, { remaining: 180 })).toBe(0);
    });
});
