import { beforeEach, describe, expect, it } from 'vitest';
import { handleDemoRequest } from '@/features/demo/handle';
import { resetDemoDb } from '@/features/demo/db';
import type { TaxReminder, TaxReturn } from '@/features/tax/types';

describe('rappels du dossier en mode démo', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('signale les natures à confirmer et les pièces manquantes, puis une pièce rangée retire le rappel', () => {
        const created = handleDemoRequest('POST', '/api/tax-returns', { year: 2026, canton: 'VD' }) as { declaration: TaxReturn };
        const id = created.declaration.publicId;
        const before = (handleDemoRequest('GET', `/api/tax-returns/${id}/reminders`) as { items: TaxReminder[] }).items;

        expect(before.find((item) => item.code === 'unconfirmedNatures')?.count).toBeGreaterThan(0);
        const missing = before.filter((item) => item.code === 'missingDocument').map((item) => item.line);
        expect(missing).toEqual(expect.arrayContaining(['deduction.donations', 'deduction.healthGross', 'deduction.pillar3a']));

        handleDemoRequest('POST', `/api/tax-returns/${id}/documents`, { filePublicId: 'FILEDEN', lineCode: 'deduction.healthGross' });
        const after = (handleDemoRequest('GET', `/api/tax-returns/${id}/reminders`) as { items: TaxReminder[] }).items;
        expect(after.some((item) => item.line === 'deduction.healthGross')).toBe(false);
    });
});
