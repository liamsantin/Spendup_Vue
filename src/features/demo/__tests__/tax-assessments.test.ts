import { beforeEach, describe, expect, it } from 'vitest';
import { resetDemoDb } from '@/features/demo/db';
import { handleDemoRequest } from '@/features/demo/handle';
import type { TaxAssessments, TaxReturn } from '@/features/tax/types';

const BASE = '/api/tax-returns/TAX2026/assessments';

function filed() {
    handleDemoRequest('PUT', '/api/tax-returns/TAX2026', {
        canton: 'VD',
        couple: false,
        status: 'deposee',
        person1: { officialName: null, firstName: null, vn: null, municipality: null, job: null },
        person2: null
    });
}

const decision = (extra: Record<string, unknown> = {}) => ({
    competence: 'cantonal',
    kind: 'assessment',
    issuedAt: '2026-06-20',
    totalTax: 1200,
    interest: -20,
    ...extra
});

describe('décision de taxation en mode démo', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('refuse la décision tant que la déclaration n’est pas déposée', () => {
        expect(() => handleDemoRequest('POST', BASE, decision())).toThrow();
    });

    it('saisit la décision, passe à « taxée » et calcule acomptes et solde par défaut', () => {
        filed();
        const result = handleDemoRequest('POST', BASE, decision()) as TaxAssessments;
        expect(result.status).toBe('taxee');
        expect(result.items[0]).toMatchObject({ installmentsPaid: 650, balance: 530 });
    });

    it('relève le déclaré dans les écarts', () => {
        filed();
        const result = handleDemoRequest(
            'POST',
            BASE,
            decision({ deviations: [{ code: 'deduction.pillar3a', assessed: 6000 }] })
        ) as TaxAssessments;
        expect(result.items[0].deviations[0]).toMatchObject({ declared: 7258, assessed: 6000, difference: -1258 });
    });

    it('suit les transitions de statut et refuse de les poser à la main', () => {
        filed();
        handleDemoRequest('POST', BASE, decision());
        expect(() => handleDemoRequest('PUT', `${BASE}/status`, { status: 'taxee' })).toThrow();
        expect((handleDemoRequest('PUT', `${BASE}/status`, { status: 'contestee' }) as TaxAssessments).status).toBe('contestee');
        expect((handleDemoRequest('POST', BASE, decision({ kind: 'correction' })) as TaxAssessments).status).toBe('taxee');
        expect((handleDemoRequest('PUT', `${BASE}/status`, { status: 'soldee' }) as TaxAssessments).status).toBe('soldee');
        expect(() => handleDemoRequest('POST', '/api/tax-returns/TAX2026/cancel-filing')).toThrow();
    });

    it('remplace un document : montants et écarts, solde recalculé', () => {
        filed();
        const created = handleDemoRequest(
            'POST',
            BASE,
            decision({ deviations: [{ code: 'deduction.pillar3a', assessed: 6000 }] })
        ) as TaxAssessments;
        const id = created.items[0].publicId;
        const result = handleDemoRequest(
            'PUT',
            `${BASE}/${id}`,
            decision({ totalTax: 1000, interest: 0, deviations: [] })
        ) as TaxAssessments;
        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toMatchObject({ publicId: id, totalTax: 1000, balance: 350, deviations: [] });
    });

    it('suggère « soldé » quand un paiement rapproché couvre le solde, sans changer le statut', () => {
        filed();
        handleDemoRequest('DELETE', '/api/tax-returns/TAX2026/installments/TXI0001/transactions/TXN0017');
        const created = handleDemoRequest('POST', BASE, decision({ totalTax: 650, interest: 0, installmentsPaid: 0 })) as TaxAssessments;
        const id = created.items[0].publicId;
        expect(created.items[0].balance).toBe(650);
        expect(created.settleSuggested).toBe(false);

        const linked = handleDemoRequest('POST', `${BASE}/${id}/transactions`, { transactionPublicId: 'TXN0017' }) as TaxAssessments;
        expect(linked.items[0].paidAmount).toBe(650);
        expect(linked.settleSuggested).toBe(true);
        expect(linked.status).toBe('taxee');
        expect(handleDemoRequest('GET', '/api/tax-returns/TAX2026/installments/candidates')).toEqual([]);

        const unlinked = handleDemoRequest('DELETE', `${BASE}/${id}/transactions/TXN0017`) as TaxAssessments;
        expect(unlinked.settleSuggested).toBe(false);
    });

    it('revient à « déposée » quand la dernière décision est supprimée', () => {
        filed();
        const created = handleDemoRequest('POST', BASE, decision()) as TaxAssessments;
        const removed = handleDemoRequest('DELETE', `${BASE}/${created.items[0].publicId}`) as TaxAssessments;
        expect(removed.items).toEqual([]);
        expect(removed.status).toBe('deposee');
        const detail = handleDemoRequest('GET', '/api/tax-returns/TAX2026') as TaxReturn;
        expect(detail.status).toBe('deposee');
    });
});
