import { beforeEach, describe, expect, it } from 'vitest';
import { handleDemoRequest } from '@/features/demo/handle';
import { resetDemoDb } from '@/features/demo/db';
import type { TaxPillar3a, TaxReturn } from '@/features/tax/types';

describe('3e pilier a de l’année en mode démo', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('additionne les versements de l’année à nature confirmée, sans plafond tant que le profil n’est pas relu', () => {
        const created = handleDemoRequest('POST', '/api/tax-returns', { year: 2026, canton: 'VD' }) as { declaration: TaxReturn };
        const result = handleDemoRequest('GET', `/api/tax-returns/${created.declaration.publicId}/pillar3a`) as TaxPillar3a;
        expect(result.year).toBe(2026);
        expect(result.paid).toBe(2000);
        expect(result.contributions).toHaveLength(1);
        expect(result.limitsAvailable).toBe(false);
        expect(result.limits).toEqual([]);
    });
});
