import { describe, expect, it } from 'vitest';
import { amountInFilterRange, parseAmountFilter, serializeAmountFilter } from '@/components/shared/dropdown-filter/amount-range';

describe('amount-range', () => {
    it('parse les montants positifs', () => {
        expect(parseAmountFilter('10,5')).toBe(10.5);
        expect(parseAmountFilter('')).toBeNull();
        expect(parseAmountFilter('-2')).toBeNull();
    });

    it('sérialise un montant valide', () => {
        expect(serializeAmountFilter('20')).toBe('20');
        expect(serializeAmountFilter('abc')).toBeUndefined();
    });

    it('filtre par intervalle sur la valeur absolue', () => {
        expect(amountInFilterRange(50, 10, 100)).toBe(true);
        expect(amountInFilterRange(-50, 10, 100)).toBe(true);
        expect(amountInFilterRange(5, 10, null)).toBe(false);
        expect(amountInFilterRange(120, null, 100)).toBe(false);
        expect(amountInFilterRange(null, 10, null)).toBe(false);
        expect(amountInFilterRange(8, null, null)).toBe(true);
    });
});
