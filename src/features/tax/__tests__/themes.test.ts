import { beforeEach, describe, expect, it } from 'vitest';
import { handleDemoRequest } from '@/features/demo/handle';
import { resetDemoDb } from '@/features/demo/db';
import type { TaxReturn, TaxThemes } from '@/features/tax/types';

describe('thèmes de déduction en mode démo', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('totalise les dépenses confirmées de l’année par thème et donne la pièce attendue', () => {
        handleDemoRequest('DELETE', '/api/tax-returns/TAX2026');
        const created = handleDemoRequest('POST', '/api/tax-returns', { year: 2026, canton: 'VD' }) as { declaration: TaxReturn };
        const themes = handleDemoRequest('GET', `/api/tax-returns/${created.declaration.publicId}/themes`) as TaxThemes;
        expect(themes.items).toHaveLength(7);
        const donation = themes.items.find((item) => item.nature === 'donation');
        expect(donation).toMatchObject({ line: 'deduction.donations', total: 100 });
        expect(donation?.documentExpected).toBeTruthy();
        expect(themes.items.find((item) => item.nature === 'childcare')?.total).toBe(0);
    });
});
