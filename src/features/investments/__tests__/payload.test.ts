import { describe, expect, it } from 'vitest';
import {
    buildCreateInstrumentPayload,
    buildSaveOperationPayload,
    buildSetPricePayload,
    buildUpdateInstrumentPayload,
    emptyInstrumentFormFields,
    emptyOperationFormFields,
    instrumentToFormFields,
    isInstrumentFormDirty,
    isOperationFormDirty,
    operationToFormFields,
    suggestedOperationTotal,
    type InstrumentFormFields,
    type OperationFormFields
} from '@/features/investments/payload';
import type { Instrument, InvestmentOperation } from '@/features/investments/types';

const TODAY = '2026-10-27';

const nestle: Instrument = {
    publicId: 'i-1',
    symbol: 'NESN',
    name: 'Nestlé',
    type: 'action',
    currency: 'CHF',
    isin: 'CH0038863350',
    lastPrice: 92.5,
    lastPriceDate: '2026-10-20',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: null
};

function instrumentFields(partial: Partial<InstrumentFormFields> = {}): InstrumentFormFields {
    return { ...emptyInstrumentFormFields({ currency: 'CHF', type: 'action' }), symbol: 'nesn', name: ' Nestlé ', ...partial };
}

function operationFields(partial: Partial<OperationFormFields> = {}): OperationFormFields {
    return {
        ...emptyOperationFormFields({ instrumentPublicId: 'i-1', type: 'achat', operationDate: '2026-10-20' }),
        quantity: '10',
        unitPrice: '112.5',
        ...partial
    };
}

const buy: InvestmentOperation = {
    publicId: 'op-1',
    accountPublicId: 'acc-1',
    instrument: nestle,
    type: 'achat',
    operationDate: '2026-10-20',
    quantity: 10,
    unitPrice: 112.5,
    totalAmount: 1125,
    currency: 'CHF',
    transactionPublicId: null,
    notes: null,
    createdAt: '2026-10-20T10:00:00Z',
    updatedAt: null
};

describe('instrument payload', () => {
    it('normalise symbole (majuscules), nom et ISIN', () => {
        const built = buildCreateInstrumentPayload(instrumentFields({ isin: 'ch 0038863350' }), { today: TODAY });
        expect(built).toEqual({
            ok: true,
            payload: {
                symbol: 'NESN',
                name: 'Nestlé',
                type: 'action',
                currency: 'CHF',
                isin: 'CH0038863350',
                lastPrice: null,
                lastPriceDate: null
            }
        });
    });

    it('valide les champs obligatoires et l’ISIN', () => {
        expect(buildCreateInstrumentPayload(instrumentFields({ symbol: ' ' }))).toMatchObject({ ok: false, code: 'symbolRequired' });
        expect(buildCreateInstrumentPayload(instrumentFields({ name: '' }))).toMatchObject({ ok: false, code: 'nameRequired' });
        expect(buildCreateInstrumentPayload(instrumentFields({ type: '' }))).toMatchObject({ ok: false, code: 'typeInvalid' });
        expect(buildCreateInstrumentPayload(instrumentFields({ currency: '' }))).toMatchObject({ ok: false, code: 'currencyInvalid' });
        expect(buildCreateInstrumentPayload(instrumentFields({ isin: 'CH0038863351' }))).toMatchObject({ ok: false, code: 'isinInvalid' });
        expect(buildCreateInstrumentPayload(instrumentFields({ symbol: 'X'.repeat(21) }))).toMatchObject({
            ok: false,
            code: 'symbolTooLong'
        });
    });

    it('accepte un cours initial et refuse une date future', () => {
        expect(
            buildCreateInstrumentPayload(instrumentFields({ lastPrice: '92,5', lastPriceDate: '2026-10-20' }), { today: TODAY })
        ).toMatchObject({
            ok: true,
            payload: { lastPrice: 92.5, lastPriceDate: '2026-10-20' }
        });
        expect(
            buildCreateInstrumentPayload(instrumentFields({ lastPrice: '92.5', lastPriceDate: '2026-10-28' }), { today: TODAY })
        ).toMatchObject({
            ok: false,
            code: 'priceDateFuture'
        });
        expect(buildCreateInstrumentPayload(instrumentFields({ lastPrice: 'abc' }))).toMatchObject({ ok: false, code: 'priceInvalid' });
    });

    it('PUT sans cours, dirty sur nom / ISIN', () => {
        const fields = instrumentToFormFields(nestle);
        expect(isInstrumentFormDirty(nestle, fields)).toBe(false);
        const built = buildUpdateInstrumentPayload({ ...fields, name: 'Nestlé SA' });
        expect(built).toEqual({
            ok: true,
            payload: { symbol: 'NESN', name: 'Nestlé SA', type: 'action', currency: 'CHF', isin: 'CH0038863350' }
        });
        expect(isInstrumentFormDirty(nestle, { ...fields, isin: '' })).toBe(true);
    });
});

describe('price payload', () => {
    it('exige un cours positif et une date non future', () => {
        expect(buildSetPricePayload({ price: '', date: null })).toMatchObject({ ok: false, code: 'priceRequired' });
        expect(buildSetPricePayload({ price: '-1', date: null })).toMatchObject({ ok: false, code: 'priceInvalid' });
        expect(buildSetPricePayload({ price: '95.25', date: '2026-10-28' }, { today: TODAY })).toMatchObject({
            ok: false,
            code: 'priceDateFuture'
        });
        expect(buildSetPricePayload({ price: '95.25', date: TODAY }, { today: TODAY })).toEqual({
            ok: true,
            payload: { price: 95.25, date: TODAY }
        });
        expect(buildSetPricePayload({ price: '95', date: null })).toEqual({ ok: true, payload: { price: 95, date: null } });
    });
});

describe('operation payload', () => {
    it('achat : quantité + prix, total omis = null', () => {
        expect(buildSaveOperationPayload(operationFields(), { today: TODAY })).toEqual({
            ok: true,
            payload: {
                instrumentPublicId: 'i-1',
                type: 'achat',
                operationDate: '2026-10-20',
                quantity: 10,
                unitPrice: 112.5,
                totalAmount: null,
                transactionPublicId: null,
                notes: null
            }
        });
    });

    it('vente : quantité > 0 et prix ≥ 0 obligatoires', () => {
        expect(buildSaveOperationPayload(operationFields({ type: 'vente', quantity: '0' }))).toMatchObject({
            ok: false,
            code: 'quantityNotPositive',
            field: 'quantity'
        });
        expect(buildSaveOperationPayload(operationFields({ type: 'vente', unitPrice: '' }))).toMatchObject({
            ok: false,
            code: 'unitPriceInvalid'
        });
        expect(buildSaveOperationPayload(operationFields({ type: 'vente', unitPrice: '0' }))).toMatchObject({ ok: true });
    });

    it('dividende / frais : sans quantité ni prix, total > 0 obligatoire', () => {
        expect(buildSaveOperationPayload(operationFields({ type: 'dividende' }))).toMatchObject({ ok: false, code: 'totalAmountInvalid' });
        expect(buildSaveOperationPayload(operationFields({ type: 'frais', totalAmount: '0' }))).toMatchObject({
            ok: false,
            code: 'totalAmountNotPositive'
        });
        expect(buildSaveOperationPayload(operationFields({ type: 'dividende', totalAmount: '42.10' }))).toMatchObject({
            ok: true,
            payload: { quantity: null, unitPrice: null, totalAmount: 42.1 }
        });
    });

    it('refuse instrument manquant, date future et transaction sur dépôt', () => {
        expect(buildSaveOperationPayload(operationFields({ instrumentPublicId: '' }))).toMatchObject({
            ok: false,
            code: 'instrumentRequired'
        });
        expect(buildSaveOperationPayload(operationFields({ operationDate: '2026-10-28' }), { today: TODAY })).toMatchObject({
            ok: false,
            code: 'operationDateFuture'
        });
        expect(buildSaveOperationPayload(operationFields({ type: 'depot', transactionPublicId: 'tx-1' }))).toMatchObject({
            ok: false,
            code: 'transactionNotAllowed'
        });
        expect(buildSaveOperationPayload(operationFields({ notes: 'x'.repeat(501) }))).toMatchObject({ ok: false, code: 'notesTooLong' });
    });

    it('total suggéré = quantité × prix et dirty numérique', () => {
        expect(suggestedOperationTotal({ quantity: '10', unitPrice: '112.5' })).toBe('1125.00');
        expect(suggestedOperationTotal({ quantity: '', unitPrice: '1' })).toBe('');
        const fields = operationToFormFields(buy);
        expect(isOperationFormDirty(buy, { ...fields, totalAmount: '1125.00' })).toBe(false);
        expect(isOperationFormDirty(buy, { ...fields, quantity: '11' })).toBe(true);
    });
});
