import { beforeEach, describe, expect, it } from 'vitest';
import { handleDemoRequest } from '@/features/demo/handle';
import { resetDemoDb } from '@/features/demo/db';
import type { TaxDocumentCandidate, TaxReturn } from '@/features/tax/types';

describe('pièces des opérations proposées au dossier (démo)', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('propose la facture du dentiste sur la ligne frais médicaux, puis ne la propose plus une fois rangée', () => {
        const created = handleDemoRequest('POST', '/api/tax-returns', { year: 2026, canton: 'VD' }) as { declaration: TaxReturn };
        const id = created.declaration.publicId;
        const before = handleDemoRequest('GET', `/api/tax-returns/${id}/document-candidates`) as { items: TaxDocumentCandidate[] };
        expect(before.items).toHaveLength(1);
        expect(before.items[0]).toMatchObject({ line: 'deduction.healthGross', category: 'fraisMedicaux', sourceKind: 'transaction' });

        handleDemoRequest('POST', `/api/tax-returns/${id}/documents`, {
            filePublicId: before.items[0]?.filePublicId,
            lineCode: before.items[0]?.line
        });
        const after = handleDemoRequest('GET', `/api/tax-returns/${id}/document-candidates`) as { items: TaxDocumentCandidate[] };
        expect(after.items).toEqual([]);
    });
});
