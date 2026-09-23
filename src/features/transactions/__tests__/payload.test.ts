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
        institutionTierPublicId: null,
        institutionName: null,
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
        recurrencePublicId: '',
        savingsGoalPublicId: '',
        tagPublicIds: [],
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
            expect(result.payload).not.toHaveProperty('filePublicIds');
            expect(result.payload).not.toHaveProperty('files');
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
                tierPublicId: null,
                recurringExpensePublicId: null,
                recurringIncomePublicId: null,
                savingsGoalPublicId: null,
                tagPublicIds: []
            });
            expect(result.payload).not.toHaveProperty('files');
            expect(result.payload).not.toHaveProperty('filePublicIds');
        }
    });

    it('POST / PUT envoient le template de récurrence selon le type', () => {
        const created = buildCreateTransactionPayload(fields({ recurrencePublicId: 're-1' }), { accounts, now });
        expect(created.ok).toBe(true);
        if (created.ok) {
            expect(created.payload.recurringExpensePublicId).toBe('re-1');
            expect(created.payload).not.toHaveProperty('recurringIncomePublicId');
        }

        const income = buildCreateTransactionPayload(fields({ type: 'revenu', recurrencePublicId: 'ri-1' }), { accounts, now });
        expect(income.ok).toBe(true);
        if (income.ok) {
            expect(income.payload.recurringIncomePublicId).toBe('ri-1');
            expect(income.payload).not.toHaveProperty('recurringExpensePublicId');
        }

        const updated = buildUpdateTransactionPayload(fields({ recurrencePublicId: 're-2' }), { accounts, now });
        expect(updated.ok).toBe(true);
        if (updated.ok) {
            expect(updated.payload.recurringExpensePublicId).toBe('re-2');
            expect(updated.payload.recurringIncomePublicId).toBeNull();
        }
    });

    it('détecte le dirty d’édition', () => {
        const current = {
            type: 'depense' as const,
            label: 'Courses',
            amount: 42.5,
            operationDate: '2026-09-07',
            valueDate: null as string | null,
            paymentMethodPublicId: null as string | null,
            categoryPublicId: null as string | null,
            recurringExpensePublicId: null as string | null,
            recurringIncomePublicId: null as string | null
        };
        expect(isTransactionFormDirty(current, fields())).toBe(false);
        expect(isTransactionFormDirty(current, fields({ label: 'Courses bio' }))).toBe(true);
        expect(isTransactionFormDirty(current, fields({ amount: '25' }))).toBe(true);
    });

    it('POST omet savingsGoalPublicId si vide, PUT l’envoie toujours (null détache)', () => {
        const created = buildCreateTransactionPayload(fields(), { accounts, now });
        expect(created.ok).toBe(true);
        if (created.ok) expect(created.payload).not.toHaveProperty('savingsGoalPublicId');

        const linked = buildCreateTransactionPayload(fields({ savingsGoalPublicId: 'g-1', type: 'depense' }), {
            accounts,
            now,
            savingsGoals: [{ publicId: 'g-1', accountPublicId: 'acc-1', currency: 'CHF' }]
        });
        expect(linked.ok).toBe(true);
        if (linked.ok) expect(linked.payload.savingsGoalPublicId).toBe('g-1');

        const updated = buildUpdateTransactionPayload(fields(), { accounts, now });
        expect(updated.ok).toBe(true);
        if (updated.ok) expect(updated.payload.savingsGoalPublicId).toBeNull();
    });

    it('refuse un lien vers un objectif sans compte ou hors mouvement', () => {
        expect(
            buildCreateTransactionPayload(fields({ savingsGoalPublicId: 'g-1' }), {
                accounts,
                now,
                savingsGoals: [{ publicId: 'g-1', accountPublicId: null, currency: 'CHF' }]
            })
        ).toMatchObject({ ok: false, code: 'savingsGoalNoAccount' });

        expect(
            buildCreateTransactionPayload(fields({ savingsGoalPublicId: 'g-1' }), {
                accounts,
                now,
                savingsGoals: [{ publicId: 'g-1', accountPublicId: 'acc-2', currency: 'CHF' }]
            })
        ).toMatchObject({ ok: false, code: 'savingsGoalAccountMismatch' });
    });

    it('POST omet tagPublicIds si vide, PUT l’envoie toujours ([] détache tes tags)', () => {
        const created = buildCreateTransactionPayload(fields(), { accounts, now });
        expect(created.ok).toBe(true);
        if (created.ok) expect(created.payload).not.toHaveProperty('tagPublicIds');

        const withTags = buildCreateTransactionPayload(fields({ tagPublicIds: ['t-1', 't-1', 't-2'] }), { accounts, now });
        expect(withTags.ok).toBe(true);
        if (withTags.ok) expect(withTags.payload.tagPublicIds).toEqual(['t-1', 't-2']);

        const updated = buildUpdateTransactionPayload(fields(), { accounts, now });
        expect(updated.ok).toBe(true);
        if (updated.ok) expect(updated.payload.tagPublicIds).toEqual([]);

        const updatedKeep = buildUpdateTransactionPayload(fields({ tagPublicIds: ['t-1'] }), { accounts, now });
        expect(updatedKeep.ok).toBe(true);
        if (updatedKeep.ok) expect(updatedKeep.payload.tagPublicIds).toEqual(['t-1']);
    });
});
