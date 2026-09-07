import { describe, expect, it } from 'vitest';
import {
    formatOperationDate,
    involvedAccountPublicIds,
    isOperationDateInFutureUtc,
    isValidYmd,
    movementForAccount,
    resolveTransactionAmountDisplay,
    signedAmountForSens,
    sortTransactions,
    sourceAccountPublicId,
    targetAccountPublicId,
    todayUtcYmd
} from '@/features/transactions/format';
import type { Transaction } from '@/features/transactions/types';

function tx(partial: Partial<Transaction> = {}): Transaction {
    return {
        publicId: 'tx-1',
        type: 'depense',
        status: 'validee',
        source: 'manuelle',
        label: 'Courses',
        amount: 42.5,
        currency: 'CHF',
        operationDate: '2026-09-07',
        valueDate: null,
        paymentMethodPublicId: null,
        createdByUserPublicId: 'u-1',
        createdByDisplayName: 'Liam',
        createdByPhotoUrl: null,
        createdAt: '2026-09-07T11:03:44.1234567Z',
        updatedAt: null,
        movements: [{ accountPublicId: 'acc-1', amount: 42.5, sens: 'debit' }],
        ...partial
    };
}

describe('transactions format', () => {
    it('valide les dates calendaires et compare en UTC', () => {
        const now = new Date('2026-09-07T23:30:00.000Z');
        expect(todayUtcYmd(now)).toBe('2026-09-07');
        expect(isValidYmd('2026-09-07')).toBe(true);
        expect(isValidYmd('2026-13-01')).toBe(false);
        expect(isOperationDateInFutureUtc('2026-09-07', now)).toBe(false);
        expect(isOperationDateInFutureUtc('2026-09-08', now)).toBe(true);
    });

    it('formate une date sans dérive de fuseau', () => {
        expect(formatOperationDate('2026-09-07', 'fr-CH')).toMatch(/7/);
    });

    it('prend le mouvement du compte filtré, pas movements[0]', () => {
        const transfer = tx({
            type: 'transfert',
            movements: [
                { accountPublicId: 'acc-src', amount: 10, sens: 'debit' },
                { accountPublicId: 'acc-dst', amount: 10, sens: 'credit' }
            ]
        });
        expect(movementForAccount(transfer, 'acc-dst')?.sens).toBe('credit');
        expect(sourceAccountPublicId(transfer)).toBe('acc-src');
        expect(targetAccountPublicId(transfer)).toBe('acc-dst');
        expect(involvedAccountPublicIds(transfer)).toEqual(['acc-src', 'acc-dst']);
    });

    it('affiche un placeholder si le montant est masqué', () => {
        expect(resolveTransactionAmountDisplay(null, 'CHF').hidden).toBe(true);
        expect(resolveTransactionAmountDisplay(null, 'CHF').text).toBe('—');
        expect(resolveTransactionAmountDisplay(12.5, 'CHF', 'fr-CH').hidden).toBe(false);
        expect(signedAmountForSens(12.5, 'debit')).toBe(-12.5);
        expect(signedAmountForSens(12.5, 'credit')).toBe(12.5);
        expect(signedAmountForSens(null, 'debit')).toBeNull();
    });

    it('trie par date d’opération desc puis saisie récente', () => {
        const a = tx({ publicId: 'a', operationDate: '2026-09-01', createdAt: '2026-09-01T10:00:00Z' });
        const b = tx({ publicId: 'b', operationDate: '2026-09-02', createdAt: '2026-09-02T10:00:00Z' });
        const c = tx({ publicId: 'c', operationDate: '2026-09-02', createdAt: '2026-09-02T12:00:00Z' });
        expect(sortTransactions([a, b, c]).map((item) => item.publicId)).toEqual(['c', 'b', 'a']);
    });
});
