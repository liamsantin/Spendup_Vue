import { describe, expect, it } from 'vitest';
import { formatTaxDate, parseTaxAmount } from '@/features/tax/format';

describe('formatTaxDate', () => {
    it('garde le jour d’une date seule, quel que soit le fuseau', () => {
        expect(formatTaxDate('2026-03-30', 'fr-CH')).toBe(
            new Intl.DateTimeFormat('fr-CH', { dateStyle: 'medium' }).format(new Date(2026, 2, 30, 12))
        );
    });

    it('lit une date-heure ISO et laisse passer une valeur vide ou illisible', () => {
        expect(formatTaxDate('2026-03-30T08:00:00Z', 'fr-CH')).not.toBe('');
        expect(formatTaxDate(null)).toBe('');
        expect(formatTaxDate('pas une date')).toBe('pas une date');
    });
});

describe('parseTaxAmount', () => {
    it('lit les séparateurs de milliers suisses et la virgule décimale', () => {
        expect(parseTaxAmount("1'200.50")).toBe(1200.5);
        expect(parseTaxAmount('1’200,50')).toBe(1200.5);
        expect(parseTaxAmount(' 12 000 ')).toBe(12000);
        expect(parseTaxAmount('0')).toBe(0);
    });

    it('distingue une case vide d’un montant illisible', () => {
        expect(parseTaxAmount('  ')).toBeNull();
        expect(parseTaxAmount('abc')).toBeNaN();
        expect(parseTaxAmount('12.3.4')).toBeNaN();
    });
});
