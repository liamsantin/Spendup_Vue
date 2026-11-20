import { describe, expect, it } from 'vitest';
import {
    isLoanDirection,
    isLoanStatus,
    matchesPersonalLoanSearch,
    normalizeListQuery,
    normalizePersonalLoan,
    personalLoanBarWidth,
    queryMatchesPersonalLoan
} from '@/features/personal-loans/format';
import type { PersonalLoan } from '@/features/personal-loans/types';

const loan: PersonalLoan = {
    publicId: 'p-1',
    direction: 'emprunt',
    counterpartTierPublicId: 't-1',
    counterpartName: 'Julie',
    label: 'Billets de concert',
    initialAmount: 200,
    remainingAmount: 150,
    repaidAmount: 50,
    percentRepaid: 25,
    currency: 'CHF',
    startDate: '2026-02-01',
    plannedEndDate: null,
    status: 'active',
    isOverdue: false,
    notes: 'payer en mars',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: null
};

describe('personal-loans format', () => {
    it('reconnaît les énumérations', () => {
        expect(isLoanDirection('pret')).toBe(true);
        expect(isLoanDirection('don')).toBe(false);
        expect(isLoanStatus('rembourse')).toBe(true);
        expect(isLoanStatus('all')).toBe(false);
        expect(normalizeListQuery({ status: 'annule', direction: 'x' as never })).toEqual({ status: 'annule', direction: null });
    });

    it('filtre et cherche', () => {
        expect(queryMatchesPersonalLoan({ direction: 'pret' }, loan)).toBe(false);
        expect(queryMatchesPersonalLoan({ direction: 'emprunt', status: 'active' }, loan)).toBe(true);
        expect(matchesPersonalLoanSearch(loan, 'julie')).toBe(true);
        expect(matchesPersonalLoanSearch(loan, 'concert')).toBe(true);
        expect(matchesPersonalLoanSearch(loan, 'mars')).toBe(true);
        expect(matchesPersonalLoanSearch(loan, 'voiture')).toBe(false);
    });

    it('borne la jauge et complète une réponse partielle', () => {
        expect(personalLoanBarWidth({ percentRepaid: 120 })).toBe(100);
        const raw = {
            ...loan,
            repaidAmount: undefined,
            percentRepaid: undefined,
            isOverdue: undefined,
            notes: undefined
        } as unknown as PersonalLoan;
        const normalized = normalizePersonalLoan(raw);
        expect(normalized.repaidAmount).toBe(50);
        expect(normalized.percentRepaid).toBe(25);
        expect(normalized.isOverdue).toBe(false);
        expect(normalized.notes).toBeNull();
    });
});
