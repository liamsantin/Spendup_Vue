import { describe, expect, it } from 'vitest';
import { GUIDED_TOTAL_CODES, buildGuidedItems, guidedLines, parseGuidedAmount } from '@/features/tax/guided-totals';
import type { TaxLine } from '@/features/tax/types';

const line = (code: string, splitsCompetence = false): TaxLine => ({ code, label: code, splitsCompetence, values: [] });

describe('saisie guidée des totaux', () => {
    it('propose au plus huit lignes, dans l’ordre de la déclaration', () => {
        expect(GUIDED_TOTAL_CODES.length).toBeLessThanOrEqual(8);
        const lines = guidedLines([line('liability.debts'), line('income.other'), line('income.employed'), line('gift.amount')]);
        expect(lines.map((item) => item.code)).toEqual(['income.employed', 'income.other', 'liability.debts']);
    });

    it('lit les montants suisses, refuse le négatif et l’illisible', () => {
        expect(parseGuidedAmount("72'000.50")).toBe(72000.5);
        expect(parseGuidedAmount('1 234,5')).toBe(1234.5);
        expect(parseGuidedAmount('  ')).toBeNull();
        expect(parseGuidedAmount('0')).toBe(0);
        expect(parseGuidedAmount('-5')).toBeUndefined();
        expect(parseGuidedAmount('abc')).toBeUndefined();
    });

    it('écrit une ligne dédoublée des deux côtés et ignore les champs vides', () => {
        const items = buildGuidedItems(
            [line('income.employed'), line('deduction.pillar3a', true), line('income.other')],
            { 'income.employed': '72000', 'deduction.pillar3a': '7258', 'income.other': '' },
            '2'
        );
        expect(items).toEqual([
            { code: 'income.employed', person: '2', competence: null, amount: 72000 },
            { code: 'deduction.pillar3a', person: '2', competence: 'cantonal', amount: 7258 },
            { code: 'deduction.pillar3a', person: '2', competence: 'federal', amount: 7258 }
        ]);
    });
});
