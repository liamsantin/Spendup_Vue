import { describe, expect, it } from 'vitest';
import {
    emptyToNull,
    formatCalendarDate,
    isLiabilityCurrency,
    isLiabilityStatus,
    isLiabilityType,
    isValidYmd,
    liabilityBarWidth,
    matchesLiabilitySearch,
    normalizeListQuery,
    normalizeLiability,
    queryMatchesLiability
} from '@/features/liabilities/format';
import type { Liability } from '@/features/liabilities/types';

const mortgage: Liability = {
    publicId: 'l-1',
    name: 'Hypothèque',
    type: 'hypotheque',
    lenderTierPublicId: 't-1',
    lenderTierName: 'UBS',
    assetPublicId: 'a-1',
    initialAmount: 500000,
    remainingAmount: 450000,
    repaidAmount: 50000,
    percentRepaid: 10,
    currency: 'CHF',
    interestRate: 1.25,
    startDate: '2024-01-01',
    plannedEndDate: '2034-01-01',
    status: 'active',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: null
};

describe('liabilities format', () => {
    it('valide les petites valeurs', () => {
        expect(emptyToNull('  ')).toBeNull();
        expect(emptyToNull(' a ')).toBe('a');
        expect(isValidYmd('2026-02-29')).toBe(false);
        expect(isValidYmd('2024-02-29')).toBe(true);
        expect(formatCalendarDate(null)).toBe('');
        expect(isLiabilityType('carteCredit')).toBe(true);
        expect(isLiabilityType('leasing')).toBe(false);
        expect(isLiabilityStatus('annule')).toBe(true);
        expect(isLiabilityStatus('all')).toBe(false);
        expect(isLiabilityCurrency('GBP')).toBe(true);
        expect(isLiabilityCurrency('JPY')).toBe(false);
    });

    it('borne la jauge entre 0 et 100', () => {
        expect(liabilityBarWidth({ percentRepaid: 140 })).toBe(100);
        expect(liabilityBarWidth({ percentRepaid: -5 })).toBe(0);
        expect(liabilityBarWidth({ percentRepaid: 42.5 })).toBe(42.5);
    });

    it('cherche dans le nom et le prêteur', () => {
        expect(matchesLiabilitySearch(mortgage, 'hypo')).toBe(true);
        expect(matchesLiabilitySearch(mortgage, 'ubs')).toBe(true);
        expect(matchesLiabilitySearch(mortgage, 'leasing')).toBe(false);
    });

    it('filtre selon la query et la normalise', () => {
        expect(queryMatchesLiability({}, mortgage)).toBe(true);
        expect(queryMatchesLiability({ status: 'rembourse' }, mortgage)).toBe(false);
        expect(queryMatchesLiability({ type: 'hypotheque', status: 'active' }, mortgage)).toBe(true);
        expect(normalizeListQuery({ type: 'x' as never, status: 'active' })).toEqual({ type: null, status: 'active' });
    });

    it('complète une réponse partielle', () => {
        const raw = { ...mortgage, repaidAmount: undefined, percentRepaid: undefined, interestRate: undefined } as unknown as Liability;
        const normalized = normalizeLiability(raw);
        expect(normalized.repaidAmount).toBe(50000);
        expect(normalized.percentRepaid).toBe(10);
        expect(normalized.interestRate).toBeNull();
    });
});
