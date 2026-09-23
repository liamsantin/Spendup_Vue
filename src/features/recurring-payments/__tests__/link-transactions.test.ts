import { describe, expect, it } from 'vitest';
import type { Account } from '@/features/accounts/types';
import { isTransactionLinkableToRecurrence, isTransactionLinkedToRecurrence } from '@/features/recurring-payments/link-transactions';
import type { Transaction } from '@/features/transactions/types';

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

function tx(partial: Partial<Transaction> = {}): Transaction {
    return {
        publicId: 'tx-1',
        type: 'depense',
        status: 'validee',
        source: 'manuelle',
        recurringExpensePublicId: null,
        recurringIncomePublicId: null,
        duePublicId: null,
        duePlannedAmount: null,
        label: 'Courses',
        amount: 42,
        currency: 'CHF',
        operationDate: '2026-09-07',
        valueDate: null,
        paymentMethodPublicId: null,
        categoryPublicId: null,
        tierPublicId: null,
        createdByUserPublicId: 'u-1',
        createdByDisplayName: 'Moi',
        createdByPhotoUrl: null,
        createdAt: '2026-09-07T10:00:00Z',
        updatedAt: null,
        movements: [{ accountPublicId: 'acc-1', amount: -42, sens: 'debit' }],
        files: [],
        savingsGoalPublicId: null,
        tagPublicIds: [],
        ...partial
    };
}

const accounts = [account()];

describe('recurring link transactions', () => {
    it('détecte une TX déjà liée à une récurrence', () => {
        expect(isTransactionLinkedToRecurrence(tx())).toBe(false);
        expect(isTransactionLinkedToRecurrence(tx({ source: 'recurrence', recurringExpensePublicId: 're-1', duePublicId: 'd-1' }))).toBe(
            true
        );
        expect(isTransactionLinkedToRecurrence(tx({ duePublicId: 'd-1' }))).toBe(true);
    });

    it('accepte une dépense manuelle sur le bon compte', () => {
        expect(isTransactionLinkableToRecurrence(tx(), 'expense', 'acc-1', accounts)).toBe(true);
    });

    it('refuse type / compte / source / lien existant', () => {
        expect(isTransactionLinkableToRecurrence(tx({ type: 'revenu' }), 'expense', 'acc-1', accounts)).toBe(false);
        expect(isTransactionLinkableToRecurrence(tx({ type: 'depense' }), 'income', 'acc-1', accounts)).toBe(false);
        expect(
            isTransactionLinkableToRecurrence(
                tx({ movements: [{ accountPublicId: 'acc-2', amount: -42, sens: 'debit' }] }),
                'expense',
                'acc-1',
                accounts
            )
        ).toBe(false);
        expect(
            isTransactionLinkableToRecurrence(tx({ source: 'recurrence', recurringExpensePublicId: 're-1' }), 'expense', 'acc-1', accounts)
        ).toBe(false);
        expect(isTransactionLinkableToRecurrence(tx({ amount: null }), 'expense', 'acc-1', accounts)).toBe(false);
    });
});
