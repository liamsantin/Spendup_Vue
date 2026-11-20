import { describe, expect, it } from 'vitest';
import {
    buildCreateSharedDebtPayload,
    buildSettlePayload,
    buildUpdateSharedDebtPayload,
    emptySharedDebtFormFields,
    emptySharedDebtSettleFields,
    isSharedDebtFormDirty,
    sharedDebtToFormFields,
    type SharedDebtFormFields
} from '@/features/shared-debts/payload';
import type { SharedDebt } from '@/features/shared-debts/types';

const debt: SharedDebt = {
    publicId: 'd-1',
    role: 'creditor',
    counterpart: { publicId: 'u-2', username: 'marc', firstName: null, name: null, profilePicture: null },
    label: 'Coop',
    amount: 45,
    repaidAmount: 0,
    remainingAmount: 45,
    currency: 'CHF',
    status: 'aRembourser',
    dueDate: null,
    settledAt: null,
    transactionPublicId: null,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: null
};

function fields(partial: Partial<SharedDebtFormFields> = {}): SharedDebtFormFields {
    return { ...emptySharedDebtFormFields({ currency: 'CHF' }), debtorUserPublicId: 'u-2', label: 'Coop', amount: '45', ...partial };
}

describe('buildCreateSharedDebtPayload', () => {
    it('construit le payload sans transaction', () => {
        expect(buildCreateSharedDebtPayload(fields({ dueDate: '2026-11-30' }))).toEqual({
            ok: true,
            payload: {
                debtorUserPublicId: 'u-2',
                amount: 45,
                label: 'Coop',
                transactionPublicId: null,
                currency: 'CHF',
                dueDate: '2026-11-30'
            }
        });
    });

    it('exige un ami', () => {
        expect(buildCreateSharedDebtPayload(fields({ debtorUserPublicId: '  ' }))).toMatchObject({ ok: false, code: 'friendRequired' });
    });

    it('exige un libellé sans transaction, pas avec', () => {
        expect(buildCreateSharedDebtPayload(fields({ label: ' ' }))).toMatchObject({ ok: false, code: 'labelRequired', field: 'label' });
        const linked = buildCreateSharedDebtPayload(fields({ label: '', transactionPublicId: 'tx-1', currency: 'CHF' }), {
            transactionCurrency: 'EUR'
        });
        expect(linked).toEqual({
            ok: true,
            payload: expect.objectContaining({ label: null, transactionPublicId: 'tx-1', currency: 'EUR' })
        });
    });

    it('refuse un libellé trop long', () => {
        expect(buildCreateSharedDebtPayload(fields({ label: 'x'.repeat(151) }))).toMatchObject({ ok: false, code: 'labelTooLong' });
    });

    it('refuse un montant invalide ou nul', () => {
        expect(buildCreateSharedDebtPayload(fields({ amount: 'abc' }))).toMatchObject({ ok: false, code: 'amountInvalid' });
        expect(buildCreateSharedDebtPayload(fields({ amount: '0' }))).toMatchObject({ ok: false, code: 'amountNotPositive' });
    });

    it('refuse une échéance invalide', () => {
        expect(buildCreateSharedDebtPayload(fields({ dueDate: '2026-02-30' }))).toMatchObject({ ok: false, code: 'dueDateInvalid' });
    });

    it('devise vide = devise des settings (null)', () => {
        const built = buildCreateSharedDebtPayload(fields({ currency: '' }));
        expect(built.ok && built.payload.currency).toBeNull();
    });
});

describe('buildUpdateSharedDebtPayload', () => {
    it('ne garde que libellé, montant, échéance', () => {
        expect(buildUpdateSharedDebtPayload(fields({ amount: '50' }))).toEqual({
            ok: true,
            payload: { label: 'Coop', amount: 50, dueDate: null }
        });
    });

    it('exige toujours un libellé', () => {
        expect(buildUpdateSharedDebtPayload(fields({ label: '', transactionPublicId: 'tx-1' }))).toMatchObject({
            ok: false,
            code: 'labelRequired'
        });
    });
});

describe('buildSettlePayload', () => {
    const context = { remainingAmount: 45, today: '2026-10-27' };

    it('montant et date vides = tout le restant', () => {
        expect(buildSettlePayload({ amount: '', date: null }, context)).toEqual({ ok: true, payload: {} });
    });

    it('accepte un remboursement partiel daté', () => {
        expect(buildSettlePayload({ amount: '20', date: '2026-10-27' }, context)).toEqual({
            ok: true,
            payload: { amount: 20, date: '2026-10-27' }
        });
    });

    it('refuse un montant au-dessus du restant ou non positif', () => {
        expect(buildSettlePayload({ amount: '45.10', date: null }, context)).toMatchObject({
            ok: false,
            code: 'settleAmountAboveRemaining'
        });
        expect(buildSettlePayload({ amount: '-1', date: null }, context)).toMatchObject({ ok: false, code: 'settleAmountNotPositive' });
    });

    it('refuse une date future', () => {
        expect(buildSettlePayload({ amount: '', date: '2026-10-28' }, context)).toMatchObject({
            ok: false,
            code: 'settleDateFuture',
            field: 'date'
        });
    });

    it('préremplit le restant et la date du jour', () => {
        expect(emptySharedDebtSettleFields({ remainingAmount: 12.5 }, '2026-10-27')).toEqual({ amount: '12.5', date: '2026-10-27' });
    });
});

describe('isSharedDebtFormDirty', () => {
    it('détecte un changement de libellé, montant ou échéance', () => {
        const base = sharedDebtToFormFields(debt);
        expect(isSharedDebtFormDirty(debt, base)).toBe(false);
        expect(isSharedDebtFormDirty(debt, { ...base, label: 'Migros' })).toBe(true);
        expect(isSharedDebtFormDirty(debt, { ...base, amount: '46' })).toBe(true);
        expect(isSharedDebtFormDirty(debt, { ...base, dueDate: '2026-12-01' })).toBe(true);
    });
});
