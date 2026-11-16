import { beforeEach, describe, expect, it } from 'vitest';
import { handleDemoRequest } from '@/features/demo/handle';
import { resetDemoDb } from '@/features/demo/db';
import type { TaxReturn, TaxReturnListResult, TaxSuggestionList } from '@/features/tax/types';

describe('démo : impôts', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('sert une déclaration 2025 entamée avec ses sous-totaux', () => {
        const list = handleDemoRequest('GET', '/api/tax-returns') as TaxReturnListResult;
        expect(list.items.map((item) => item.year)).toEqual([2025]);
        expect(list.items[0].filledCount).toBeGreaterThan(0);

        const tax = handleDemoRequest('GET', '/api/tax-returns/TAX2025') as TaxReturn;
        const cantonal = tax.subtotals.find((item) => item.competence === 'cantonal');
        expect(cantonal?.income).toBe(74400);
        expect(cantonal?.deductions).toBe(9058);
        expect(cantonal?.netIncome).toBe(65342);
        expect(tax.gaps).not.toContain('income.employed');
    });

    it('crée une déclaration, refuse un doublon d’année et un canton inconnu', () => {
        const created = handleDemoRequest('POST', '/api/tax-returns', { year: 2024, canton: 'ge' }) as { declaration: TaxReturn };
        expect(created.declaration.canton).toBe('GE');
        expect(() => handleDemoRequest('POST', '/api/tax-returns', { year: 2024, canton: 'VD' })).toThrow();
        expect(() => handleDemoRequest('POST', '/api/tax-returns', { year: 2023, canton: 'XX' })).toThrow();
    });

    it('exige un ressort pour une ligne dédoublée et refuse la personne 2 hors couple', () => {
        const base = '/api/tax-returns/TAX2025/amounts';
        expect(() =>
            handleDemoRequest('PUT', `${base}/deduction.donations`, { person: '1', competence: 'cantonal', amount: 100 })
        ).toThrow();
        expect(() => handleDemoRequest('PUT', `${base}/deduction.health`, { person: '1', competence: null, amount: 100 })).toThrow();
        expect(() => handleDemoRequest('PUT', `${base}/income.other`, { person: '2', competence: null, amount: 100 })).toThrow();

        const tax = handleDemoRequest('PUT', `${base}/deduction.donations`, { person: '1', competence: null, amount: 250 }) as TaxReturn;
        expect(tax.subtotals.find((item) => item.competence === 'federal')?.deductions).toBe(9308);

        const cleared = handleDemoRequest('PUT', `${base}/deduction.donations`, {
            person: '1',
            competence: null,
            amount: null
        }) as TaxReturn;
        expect(cleared.gaps).toContain('deduction.donations');
    });

    it('propose des montants depuis le foyer et les inscrit comme acceptés', () => {
        const list = handleDemoRequest('GET', '/api/tax-returns/TAX2025/suggestions') as TaxSuggestionList;
        expect(list.items.some((item) => item.code === 'income.employed')).toBe(false);
        const allowances = list.items.find((item) => item.code === 'income.allowances');
        expect(allowances?.amount).toBe(3864);
        expect(allowances?.source).toBe('recurringIncome');
        expect(allowances?.sources?.map((item) => item.publicId)).toEqual(['RINALL1']);

        const tax = handleDemoRequest('POST', '/api/tax-returns/TAX2025/suggestions/accept', allowances) as TaxReturn;
        const value = tax.sections.flatMap((s) => s.lines).find((l) => l.code === 'income.allowances')?.values[0];
        expect(value?.origin).toBe('propositionAcceptee');
        const after = handleDemoRequest('GET', '/api/tax-returns/TAX2025/suggestions') as TaxSuggestionList;
        expect(after.items.some((item) => item.code === 'income.allowances')).toBe(false);
    });

    it('reporte le total d’une fiche immeuble sur deux lignes', () => {
        handleDemoRequest('POST', '/api/tax-returns/TAX2025/entries', {
            kind: 'property',
            person: '1',
            title: 'Appartement Lausanne',
            detail: null,
            amount: 640000,
            secondaryAmount: 0
        });
        const tax = handleDemoRequest('POST', '/api/tax-returns/TAX2025/entries/report', { kind: 'property', person: '1' }) as TaxReturn;
        const lines = tax.sections.flatMap((s) => s.lines);
        expect(lines.find((l) => l.code === 'asset.property')?.values[0].amount).toBe(640000);
        expect(lines.find((l) => l.code === 'income.property')?.values[0].amount).toBe(0);
    });

    it('supprime une déclaration et sert un PDF', () => {
        const pdf = handleDemoRequest('GET', '/api/tax-returns/TAX2025/pdf') as Blob;
        expect(pdf.type).toBe('application/pdf');
        expect(pdf.size).toBeGreaterThan(200);
        handleDemoRequest('DELETE', '/api/tax-returns/TAX2025');
        expect((handleDemoRequest('GET', '/api/tax-returns') as TaxReturnListResult).totalCount).toBe(0);
    });
});
