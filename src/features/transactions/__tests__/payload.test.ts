import { describe, expect, it } from 'vitest';
import type { Account } from '@/features/accounts/types';
import {
    buildCreateTransactionPayload,
    buildUpdateTransactionPayload,
    isTransactionFormDirty,
    type TransactionFormFields
} from '@/features/transactions/payload';

function account(partial: Partial<Account> = {}): Account {
    return {
        publicId: 'acc-1',
        name: 'Courant',
        type: 'courant',
        currency: 'CHF',
        initialBalance: 0,
        currentBalance: 0,
        iban: null,
        accountNumber: null,
        color: null,
        isPrimary: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: null,
        isOwned: true,
        myRole: 'owner',
        hiddenFields: [],
        ...partial
    };
}

function fields(partial: Partial<TransactionFormFields> = {}): TransactionFormFields {
    return {
        type: 'depense',
        accountPublicId: 'acc-1',
        counterpartyAccountPublicId: '',
        label: 'Courses',
        amount: '42.50',
        operationDate: '2026-09-07',
        valueDate: null,
        paymentMethodPublicId: '',
        categoryPublicId: '',
        tierPublicId: '',
        ...partial
    };
}

const now = new Date('2026-09-07T12:00:00.000Z');
const accounts = [account(), account({ publicId: 'acc-2', name: 'Épargne', isPrimary: false })];

describe('transaction payload', () => {
    it('trim le libellé, arrondit le montant et omet les optionnels à la création', () => {
        const result = buildCreateTransactionPayload(fields({ label: '  Courses  ', amount: '42.5' }), { accounts, now });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload).toEqual({
                type: 'depense',
                accountPublicId: 'acc-1',
                label: 'Courses',
                amount: 42.5,
                operationDate: '2026-09-07'
            });
        }
    });

    it('refuse un libellé vide ou trop long, un montant ≤ 0 et une date future', () => {
        expect(buildCreateTransactionPayload(fields({ label: '   ' }), { accounts, now })).toMatchObject({
            ok: false,
            code: 'labelRequired'
        });
        expect(buildCreateTransactionPayload(fields({ label: 'x'.repeat(256) }), { accounts, now })).toMatchObject({
            ok: false,
            code: 'labelTooLong'
        });
        expect(buildCreateTransactionPayload(fields({ amount: '0' }), { accounts, now })).toMatchObject({
            ok: false,
            code: 'amountNotPositive'
        });
        expect(buildCreateTransactionPayload(fields({ operationDate: '2026-09-08' }), { accounts, now })).toMatchObject({
            ok: false,
            code: 'operationDateFuture'
        });
        expect(buildCreateTransactionPayload(fields({ valueDate: '2026-09-06' }), { accounts, now })).toMatchObject({
            ok: false,
            code: 'valueDateBeforeOperation'
        });
    });

    it('exige un compte cible différent, actif et même devise pour un transfert', () => {
        expect(buildCreateTransactionPayload(fields({ type: 'transfert' }), { accounts, now })).toMatchObject({
            ok: false,
            code: 'counterpartyRequired'
        });
        expect(
            buildCreateTransactionPayload(fields({ type: 'transfert', counterpartyAccountPublicId: 'acc-1' }), { accounts, now })
        ).toMatchObject({ ok: false, code: 'counterpartySame' });
        expect(
            buildCreateTransactionPayload(fields({ type: 'depense', counterpartyAccountPublicId: 'acc-2' }), { accounts, now })
        ).toMatchObject({ ok: false, code: 'counterpartyNotAllowed' });

        const eur = account({ publicId: 'acc-eur', currency: 'EUR', isPrimary: false });
        expect(
            buildCreateTransactionPayload(fields({ type: 'transfert', counterpartyAccountPublicId: 'acc-eur' }), {
                accounts: [...accounts, eur],
                now
            })
        ).toMatchObject({ ok: false, code: 'currencyMismatch' });

        const archived = account({ publicId: 'acc-2', isActive: false, isPrimary: false });
        expect(
            buildCreateTransactionPayload(fields({ type: 'transfert', counterpartyAccountPublicId: 'acc-2' }), {
                accounts: [account(), archived],
                now
            })
        ).toMatchObject({ ok: false, code: 'accountArchived' });

        const created = buildCreateTransactionPayload(fields({ type: 'transfert', counterpartyAccountPublicId: 'acc-2' }), {
            accounts,
            now
        });
        expect(created.ok).toBe(true);
        if (created.ok) {
            expect(created.payload.counterpartyAccountPublicId).toBe('acc-2');
        }
    });

    it('PUT envoie null pour vider valueDate et paymentMethodPublicId', () => {
        const result = buildUpdateTransactionPayload(
            fields({ valueDate: null, paymentMethodPublicId: '', label: 'Courses bio', amount: '25' }),
            { accounts, now }
        );
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload).toEqual({
                label: 'Courses bio',
                amount: 25,
                operationDate: '2026-09-07',
                valueDate: null,
                paymentMethodPublicId: null,
                categoryPublicId: null,
                tierPublicId: null
            });
        }
    });

    it('détecte le dirty d’édition', () => {
        const current = {
            label: 'Courses',
            amount: 42.5,
            operationDate: '2026-09-07',
            valueDate: null as string | null,
            paymentMethodPublicId: null as string | null,
            categoryPublicId: null as string | null
        };
        expect(isTransactionFormDirty(current, fields())).toBe(false);
        expect(isTransactionFormDirty(current, fields({ label: 'Courses bio' }))).toBe(true);
        expect(isTransactionFormDirty(current, fields({ amount: '25' }))).toBe(true);
    });
});
