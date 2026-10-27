import { describe, expect, it } from 'vitest';
import {
    buildCreatePersonalLoanPayload,
    buildUpdatePersonalLoanPayload,
    emptyPersonalLoanFormFields,
    isPersonalLoanFormDirty,
    personalLoanToFormFields,
    type PersonalLoanFormFields
} from '@/features/personal-loans/payload';
import type { PersonalLoan } from '@/features/personal-loans/types';

function fields(partial: Partial<PersonalLoanFormFields> = {}): PersonalLoanFormFields {
    return {
        ...emptyPersonalLoanFormFields({ currency: 'CHF', startDate: '2026-01-15' }),
        counterpartTierPublicId: 't-1',
        label: 'Voiture de Marc',
        initialAmount: '500',
        ...partial
    };
}

const existing: PersonalLoan = {
    publicId: 'p-1',
    direction: 'pret',
    counterpartTierPublicId: 't-1',
    counterpartName: 'Marc',
    label: 'Voiture de Marc',
    initialAmount: 500,
    remainingAmount: 250,
    repaidAmount: 250,
    percentRepaid: 50,
    currency: 'CHF',
    startDate: '2026-01-15',
    plannedEndDate: '2026-06-30',
    status: 'active',
    isOverdue: false,
    notes: null,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: null
};

describe('personal-loans payload', () => {
    it('construit une création (restant null = initial)', () => {
        expect(buildCreatePersonalLoanPayload(fields())).toEqual({
            ok: true,
            payload: {
                direction: 'pret',
                counterpartTierPublicId: 't-1',
                initialAmount: 500,
                startDate: '2026-01-15',
                label: 'Voiture de Marc',
                remainingAmount: null,
                plannedEndDate: null,
                currency: 'CHF',
                notes: null
            }
        });
    });

    it('refuse les champs invalides', () => {
        expect(buildCreatePersonalLoanPayload(fields({ direction: '' }))).toMatchObject({ code: 'directionInvalid' });
        expect(buildCreatePersonalLoanPayload(fields({ counterpartTierPublicId: ' ' }))).toMatchObject({
            code: 'counterpartRequired',
            field: 'counterpartTierPublicId'
        });
        expect(buildCreatePersonalLoanPayload(fields({ label: 'x'.repeat(151) }))).toMatchObject({ code: 'labelTooLong' });
        expect(buildCreatePersonalLoanPayload(fields({ label: 'x'.repeat(150) }))).toMatchObject({ ok: true });
        expect(buildCreatePersonalLoanPayload(fields({ initialAmount: '0' }))).toMatchObject({ code: 'initialAmountNotPositive' });
        expect(buildCreatePersonalLoanPayload(fields({ remainingAmount: '501' }))).toMatchObject({ code: 'remainingAmountOutOfRange' });
        expect(buildCreatePersonalLoanPayload(fields({ remainingAmount: '-1' }))).toMatchObject({ code: 'remainingAmountOutOfRange' });
        expect(buildCreatePersonalLoanPayload(fields({ remainingAmount: '0' }))).toMatchObject({
            ok: true,
            payload: { remainingAmount: 0 }
        });
        expect(buildCreatePersonalLoanPayload(fields({ startDate: null }))).toMatchObject({ code: 'startDateRequired' });
        expect(buildCreatePersonalLoanPayload(fields({ plannedEndDate: '2026-01-01' }))).toMatchObject({
            code: 'plannedEndDateBeforeStart'
        });
        expect(buildCreatePersonalLoanPayload(fields({ currency: 'JPY' as never }))).toMatchObject({ code: 'currencyInvalid' });
    });

    it('PUT : devise figée, annulation, restant vide = initial', () => {
        const form = personalLoanToFormFields(existing);
        expect(buildUpdatePersonalLoanPayload(form)).toMatchObject({ code: 'currencyLocked' });
        expect(buildUpdatePersonalLoanPayload({ ...form, currency: 'EUR' }, { current: existing })).toMatchObject({
            code: 'currencyLocked'
        });
        expect(buildUpdatePersonalLoanPayload({ ...form, remainingAmount: '', cancel: true }, { current: existing })).toMatchObject({
            ok: true,
            payload: { remainingAmount: 500, status: 'annule', currency: 'CHF' }
        });
    });

    it('direction et contrepartie modifiables seulement si active', () => {
        const form = personalLoanToFormFields(existing);
        expect(
            buildUpdatePersonalLoanPayload({ ...form, direction: 'emprunt', counterpartTierPublicId: 't-2' }, { current: existing })
        ).toMatchObject({
            ok: true,
            payload: { direction: 'emprunt', counterpartTierPublicId: 't-2' }
        });

        const repaid = { ...existing, status: 'rembourse' as const, remainingAmount: 0 };
        expect(buildUpdatePersonalLoanPayload({ ...form, direction: 'emprunt' }, { current: repaid })).toMatchObject({
            code: 'directionLocked'
        });
        expect(buildUpdatePersonalLoanPayload({ ...form, counterpartTierPublicId: 't-2' }, { current: repaid })).toMatchObject({
            code: 'counterpartLocked'
        });
        expect(buildUpdatePersonalLoanPayload({ ...form, label: 'Autre' }, { current: repaid })).toMatchObject({ ok: true });
    });

    it('détecte les modifications', () => {
        const form = personalLoanToFormFields(existing);
        expect(isPersonalLoanFormDirty(existing, form)).toBe(false);
        expect(isPersonalLoanFormDirty(existing, { ...form, notes: 'rappel' })).toBe(true);
        expect(isPersonalLoanFormDirty(existing, { ...form, direction: 'emprunt' })).toBe(true);
        expect(isPersonalLoanFormDirty(existing, { ...form, remainingAmount: '250.00' })).toBe(false);
    });
});
