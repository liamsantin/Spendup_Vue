import { describe, expect, it } from 'vitest';
import {
    buildConfirmDuePayload,
    buildCreateExpensePayload,
    buildCreateIncomePayload,
    emptyRecurringForm,
    type RecurringTemplateFormFields
} from '@/features/recurring-payments/payload';
import type { Account } from '@/features/accounts/types';

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

function expenseFields(partial: Partial<RecurringTemplateFormFields> = {}): RecurringTemplateFormFields {
    return {
        ...emptyRecurringForm('expense', 'acc-1'),
        name: 'Loyer',
        plannedAmount: '1500',
        startDate: '2026-08-01',
        ...partial
    };
}

describe('recurring payload', () => {
    const ctx = { accounts: [account()] };

    it('construit une charge mensuelle', () => {
        const result = buildCreateExpensePayload(expenseFields(), ctx);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload).toMatchObject({
                name: 'Loyer',
                expenseType: 'loyer',
                frequency: 'mensuel',
                plannedAmount: 1500,
                isActive: true,
                accountPublicId: 'acc-1',
                paymentMethodPublicId: null
            });
        }
    });

    it('refuse mensuel vs mensuelle côté revenu', () => {
        const fields = { ...emptyRecurringForm('income', 'acc-1'), name: 'Salaire', plannedAmount: '5000', startDate: '2026-08-01' };
        fields.incomeFrequency = 'mensuelle';
        const ok = buildCreateIncomePayload(fields, ctx);
        expect(ok.ok).toBe(true);
    });

    it('refuse paymentDay hors 1–28', () => {
        const fields = {
            ...emptyRecurringForm('income', 'acc-1'),
            name: 'Salaire',
            plannedAmount: '5000',
            startDate: '2026-08-01',
            incomeFrequency: 'mensuelle' as const,
            paymentDay: '31'
        };
        const result = buildCreateIncomePayload(fields, ctx);
        expect(result).toMatchObject({ ok: false, code: 'paymentDayInvalid' });
    });

    it('ignore paymentDay si hebdomadaire', () => {
        const fields = {
            ...emptyRecurringForm('income', 'acc-1'),
            name: 'Freelance',
            plannedAmount: '800',
            startDate: '2026-08-01',
            incomeFrequency: 'hebdomadaire' as const,
            paymentDay: '31'
        };
        const result = buildCreateIncomePayload(fields, ctx);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.payload.paymentDay).toBeNull();
    });

    it('refuse un confirm dans le futur', () => {
        const result = buildConfirmDuePayload(
            { paymentDate: '2099-01-01', amount: '10', paymentMethodPublicId: '', notes: '' },
            new Date('2026-09-11T10:00:00')
        );
        expect(result).toMatchObject({ ok: false, code: 'paymentDateFuture' });
    });
});
