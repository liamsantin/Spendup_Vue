import { describe, expect, it } from 'vitest';
import { formatTaxDate } from '@/features/tax/format';

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
