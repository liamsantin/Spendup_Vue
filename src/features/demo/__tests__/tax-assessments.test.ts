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
