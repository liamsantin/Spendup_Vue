import { describe, expect, it } from 'vitest';
import type { Account } from '@/features/accounts/types';
import { canViewTransactions, canWriteTransaction, canWriteTransactions, canWriteTransfer } from '@/features/transactions/rights';
import type { Transaction } from '@/features/transactions/types';

function account(partial: Partial<Account> = {}): Account {
    return {
        publicId: 'a1',
        name: 'Compte',
        type: 'courant',
        currency: 'CHF',
        initialBalance: 0,
        currentBalance: 0,
        iban: null,
        accountNumber: null,
        color: null,
        isPrimary: false,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: null,
        isOwned: true,
        myRole: 'owner',
        hiddenFields: [],
        ...partial
    };
}

function transaction(partial: Partial<Transaction> = {}): Transaction {
    return {
        publicId: 'tx-1',
        type: 'depense',
        status: 'validee',
        source: 'manuelle',
        label: 'Courses',
        amount: 10,
        currency: 'CHF',
        operationDate: '2026-09-07',
        valueDate: null,
        paymentMethodPublicId: null,
        createdByUserPublicId: 'u-1',
        createdByDisplayName: 'Liam',
        createdByPhotoUrl: null,
        createdAt: '2026-09-07T11:00:00Z',
        updatedAt: null,
        movements: [{ accountPublicId: 'a1', amount: 10, sens: 'debit' }],
        ...partial
    };
}

describe('transactions rights', () => {
    it('autorise la lecture pour viewer+', () => {
        expect(canViewTransactions(account({ myRole: 'owner' }))).toBe(true);
        expect(canViewTransactions(account({ myRole: 'editor' }))).toBe(true);
        expect(canViewTransactions(account({ myRole: 'viewer' }))).toBe(true);
    });

    it('autorise l’écriture editor+ sur compte actif seulement', () => {
        expect(canWriteTransactions(account({ myRole: 'owner' }))).toBe(true);
        expect(canWriteTransactions(account({ myRole: 'editor' }))).toBe(true);
        expect(canWriteTransactions(account({ myRole: 'viewer' }))).toBe(false);
        expect(canWriteTransactions(account({ myRole: 'owner', isActive: false }))).toBe(false);
        expect(canWriteTransactions(account({ myRole: 'editor', isActive: false }))).toBe(false);
    });

    it('exige editor+ sur les deux comptes d’un transfert', () => {
        const owner = account({ publicId: 'a1', myRole: 'owner' });
        const editor = account({ publicId: 'a2', myRole: 'editor' });
        const viewer = account({ publicId: 'a2', myRole: 'viewer' });
        expect(canWriteTransfer(owner, editor)).toBe(true);
        expect(canWriteTransfer(owner, viewer)).toBe(false);
        expect(canWriteTransfer(owner, account({ publicId: 'a2', isActive: false }))).toBe(false);
    });

    it('bloque l’écriture d’une transaction si un compte touché est archivé ou viewer', () => {
        const transfer = transaction({
            type: 'transfert',
            movements: [
                { accountPublicId: 'a1', amount: 10, sens: 'debit' },
                { accountPublicId: 'a2', amount: 10, sens: 'credit' }
            ]
        });
        expect(canWriteTransaction(transfer, [account(), account({ publicId: 'a2', myRole: 'editor' })])).toBe(true);
        expect(canWriteTransaction(transfer, [account(), account({ publicId: 'a2', myRole: 'viewer' })])).toBe(false);
        expect(canWriteTransaction(transfer, [account(), account({ publicId: 'a2', isActive: false })])).toBe(false);
    });
});
