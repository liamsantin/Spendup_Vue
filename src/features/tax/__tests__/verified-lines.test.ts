import { describe, expect, it } from 'vitest';
import { readForm } from '@/features/tax/reader/engine';
import type { FormProfile, PageTokens, Token } from '@/features/tax/reader/types';

/** Petit formulaire inventé : trois lignes de revenu et un total imprimé (code 190). */
const profile: FormProfile = {
    id: 'test-2025',
    label: 'Test 2025',
    canton: 'XX',
    year: 2025,
    detect: [],
    layout: { codePattern: '^(\\d{3})(C?)$', persons: { kind: 'suffix', suffix: 'C' }, minusIsNegative: true },
    lines: [
        { code: '100', section: 'income', label: 'Salaire', target: 'income.employed' },
        { code: '110', section: 'income', label: 'Rentes', target: 'income.other' },
        { code: '120', section: 'income', label: 'Loyers', target: 'income.property' }
    ],
    totals: [{ code: '190', label: 'Total des revenus', person: '1', plus: ['100', '110', '120'] }]
};

function page(amounts: Record<string, string>): PageTokens[] {
    const tokens: Token[] = [];
    Object.entries(amounts).forEach(([code, amount], index) => {
        const y = 700 - index * 20;
        tokens.push({ text: code, x: 50, w: 18, y });
        tokens.push({ text: amount, x: 120, w: 36, y });
    });
    return [{ page: 1, tokens }];
}

const checks = (pages: PageTokens[]) => Object.fromEntries(readForm(pages, profile).suggestions.map((item) => [item.code, item.check]));

describe('lignes vérifiées par un total imprimé', () => {
    it('marque « vérifiée » chaque ligne quand le total imprimé recoupe', () => {
        const report = readForm(page({ '100': '1’000', '110': '2’000', '120': '3’000', '190': '6’000' }), profile);
        expect(report.totals[0].status).toBe('ok');
        expect(report.lines.map((line) => line.check)).toEqual(['verified', 'verified', 'verified']);
        expect(checks(page({ '100': '1’000', '110': '2’000', '120': '3’000', '190': '6’000' }))).toEqual({
            'income.employed': 'verified',
            'income.other': 'verified',
            'income.property': 'verified'
        });
    });

    it('marque « à vérifier » chaque ligne quand le total imprimé est en écart', () => {
        const pages = page({ '100': '1’000', '110': '2’000', '120': '3’000', '190': '7’000' });
        expect(readForm(pages, profile).totals[0].status).toBe('mismatch');
        expect(Object.values(checks(pages))).toEqual(['toCheck', 'toCheck', 'toCheck']);
    });

    it('marque « à vérifier » quand le total n’est pas lu : rien ne prouve la lecture', () => {
        const pages = page({ '100': '1’000', '110': '2’000', '120': '3’000', '190': 'n/a' });
        expect(readForm(pages, profile).totals[0].status).toBe('missing');
        expect(Object.values(checks(pages))).toEqual(['toCheck', 'toCheck', 'toCheck']);
    });
});
