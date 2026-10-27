import { describe, expect, it } from 'vitest';
import {
    buildCreateLiabilityPayload,
    buildSetRemainingAmountPayload,
    buildUpdateLiabilityPayload,
    emptyLiabilityFormFields,
    isLiabilityFormDirty,
    liabilityToFormFields,
    parseInterestRate,
    type LiabilityFormFields
} from '@/features/liabilities/payload';
import type { Liability } from '@/features/liabilities/types';

function fields(partial: Partial<LiabilityFormFields> = {}): LiabilityFormFields {
    return {
        ...emptyLiabilityFormFields({ currency: 'CHF' }),
        name: 'Hypothèque',
        type: 'hypotheque',
        initialAmount: '500000',
        ...partial
    };
}

const existing: Liability = {
    publicId: 'l-1',
    name: 'Hypothèque',
    type: 'hypotheque',
    lenderTierPublicId: 't-1',
    lenderTierName: 'UBS',
    assetPublicId: null,
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

describe('liabilities payload', () => {
    it('construit une création minimale (restant null = initial)', () => {
        expect(buildCreateLiabilityPayload(fields())).toEqual({
            ok: true,
            payload: {
                name: 'Hypothèque',
                type: 'hypotheque',
                initialAmount: 500000,
                remainingAmount: null,
                currency: 'CHF',
                interestRate: null,
                startDate: null,
                plannedEndDate: null,
                lenderTierPublicId: null,
                assetPublicId: null
            }
        });
    });

    it('refuse les champs invalides', () => {
        expect(buildCreateLiabilityPayload(fields({ name: ' ' }))).toMatchObject({ ok: false, code: 'nameRequired', field: 'name' });
        expect(buildCreateLiabilityPayload(fields({ name: 'x'.repeat(151) }))).toMatchObject({ code: 'nameTooLong' });
        expect(buildCreateLiabilityPayload(fields({ type: '' }))).toMatchObject({ code: 'typeInvalid' });
        expect(buildCreateLiabilityPayload(fields({ initialAmount: '0' }))).toMatchObject({ code: 'initialAmountNotPositive' });
        expect(buildCreateLiabilityPayload(fields({ initialAmount: 'abc' }))).toMatchObject({ code: 'initialAmountInvalid' });
        expect(buildCreateLiabilityPayload(fields({ remainingAmount: '600000' }))).toMatchObject({ code: 'remainingAmountOutOfRange' });
        expect(buildCreateLiabilityPayload(fields({ remainingAmount: '-1' }))).toMatchObject({ code: 'remainingAmountOutOfRange' });
        expect(buildCreateLiabilityPayload(fields({ interestRate: '101' }))).toMatchObject({ code: 'interestRateOutOfRange' });
        expect(buildCreateLiabilityPayload(fields({ interestRate: '-1' }))).toMatchObject({ code: 'interestRateInvalid' });
        expect(buildCreateLiabilityPayload(fields({ startDate: '2026-02-30' }))).toMatchObject({ code: 'startDateInvalid' });
        expect(buildCreateLiabilityPayload(fields({ startDate: '2026-05-01', plannedEndDate: '2026-04-30' }))).toMatchObject({
            code: 'plannedEndDateBeforeStart'
        });
        expect(buildCreateLiabilityPayload(fields({ currency: 'JPY' as never }))).toMatchObject({ code: 'currencyInvalid' });
    });

    it('accepte un restant à zéro et un taux à trois décimales', () => {
        const built = buildCreateLiabilityPayload(fields({ remainingAmount: '0', interestRate: '1,125' }));
        expect(built).toMatchObject({ ok: true, payload: { remainingAmount: 0, interestRate: 1.125 } });
        expect(parseInterestRate('abc')).toBeNull();
    });

    it('PUT : devise figée, restant obligatoire, annulation', () => {
        const form = liabilityToFormFields(existing);
        expect(buildUpdateLiabilityPayload(form)).toMatchObject({ ok: false, code: 'currencyLocked' });
        expect(buildUpdateLiabilityPayload({ ...form, currency: 'EUR' }, { lockedCurrency: 'CHF' })).toMatchObject({
            code: 'currencyLocked'
        });

        const canceled = buildUpdateLiabilityPayload({ ...form, remainingAmount: '', cancel: true }, { lockedCurrency: 'CHF' });
        expect(canceled).toMatchObject({ ok: true, payload: { remainingAmount: 500000, currency: 'CHF', status: 'annule' } });

        const kept = buildUpdateLiabilityPayload(form, { lockedCurrency: 'CHF' });
        expect(kept).toMatchObject({ ok: true, payload: { remainingAmount: 450000, status: null, lenderTierPublicId: 't-1' } });
    });

    it('geste rapide du restant borné 0–initial', () => {
        expect(buildSetRemainingAmountPayload({ remainingAmount: '' }, { initialAmount: 100 })).toMatchObject({
            code: 'remainingAmountInvalid'
        });
        expect(buildSetRemainingAmountPayload({ remainingAmount: '101' }, { initialAmount: 100 })).toMatchObject({
            code: 'remainingAmountOutOfRange'
        });
        expect(buildSetRemainingAmountPayload({ remainingAmount: '25.5' }, { initialAmount: 100 })).toEqual({
            ok: true,
            payload: { remainingAmount: 25.5 }
        });
    });

    it('détecte les modifications', () => {
        const form = liabilityToFormFields(existing);
        expect(isLiabilityFormDirty(existing, form)).toBe(false);
        expect(isLiabilityFormDirty(existing, { ...form, interestRate: '1.250' })).toBe(false);
        expect(isLiabilityFormDirty(existing, { ...form, name: 'Autre' })).toBe(true);
        expect(isLiabilityFormDirty(existing, { ...form, cancel: true })).toBe(true);
        expect(isLiabilityFormDirty(existing, { ...form, assetPublicId: 'a-9' })).toBe(true);
    });
});
