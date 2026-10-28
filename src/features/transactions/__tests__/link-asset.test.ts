import { describe, expect, it } from 'vitest';
import type { Account } from '@/features/accounts/types';
import {
    isTransactionLinkableToAsset,
    isTransactionUnlinkableFromAsset,
    transactionFormFieldsWithAsset
} from '@/features/transactions/link-asset';
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
        bank: null,
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
        amount: 42.5,
        currency: 'EUR',
        operationDate: '2026-09-07',
        valueDate: null,
        paymentMethodPublicId: null,
        categoryPublicId: null,
        tierPublicId: null,
        createdByUserPublicId: 'u-1',
        createdByDisplayName: 'Liam',
        createdByPhotoUrl: null,
        createdAt: '2026-09-07T11:00:00Z',
        updatedAt: null,
        movements: [{ accountPublicId: 'acc-1', amount: 42.5, sens: 'debit' }],
        files: [],
        savingsGoalPublicId: null,
        assetPublicId: null,
        tagPublicIds: [],
        ...partial
    };
}

describe('lien transaction → actif', () => {
    const accounts = [account()];

    it('propose une écriture libre et éditable, même dans une autre devise', () => {
        expect(isTransactionLinkableToAsset(tx({ currency: 'EUR' }), accounts)).toBe(true);
        expect(isTransactionLinkableToAsset(tx({ assetPublicId: 'asset-1' }), accounts)).toBe(false);
        expect(isTransactionLinkableToAsset(tx({ amount: null }), accounts)).toBe(false);
        expect(isTransactionLinkableToAsset(tx(), [account({ myRole: 'viewer' })])).toBe(false);
    });

    it('ne propose le détachement que pour cet actif', () => {
        expect(isTransactionUnlinkableFromAsset(tx({ assetPublicId: 'asset-1' }), 'asset-1', accounts)).toBe(true);
        expect(isTransactionUnlinkableFromAsset(tx({ assetPublicId: 'asset-2' }), 'asset-1', accounts)).toBe(false);
        expect(isTransactionUnlinkableFromAsset(tx(), 'asset-1', accounts)).toBe(false);
        expect(isTransactionUnlinkableFromAsset(tx({ assetPublicId: 'asset-1', amount: null }), 'asset-1', accounts)).toBe(false);
    });

    it('reprend la transaction et pose l’actif, sans toucher le reste', () => {
        const fields = transactionFormFieldsWithAsset(tx({ categoryPublicId: 'cat-1' }), ' asset-1 ');
        expect(fields?.assetPublicId).toBe('asset-1');
        expect(fields?.categoryPublicId).toBe('cat-1');
        expect(fields?.label).toBe('Courses');
    });
});
