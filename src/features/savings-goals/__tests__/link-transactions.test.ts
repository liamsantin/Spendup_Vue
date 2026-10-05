import { describe, expect, it } from 'vitest';
import {
    isTransactionLinkableToSavingsGoal,
    isTransactionUnlinkableFromSavingsGoal,
    isSavingsGoalCompatibleWithTransactionForm,
    transactionTouchesSavingsGoalAccount
} from '@/features/savings-goals/link-transactions';
import type { SavingsGoal } from '@/features/savings-goals/types';
import type { Transaction } from '@/features/transactions/types';

function goal(partial: Partial<SavingsGoal> = {}): SavingsGoal {
    return {
        publicId: 'g-1',
        name: 'Vacances',
        targetAmount: 2000,
        openingAmount: 150,
        contributedAmount: 400,
        currentAmount: 550,
        remainingAmount: 1450,
        percentReached: 27.5,
        currency: 'CHF',
        targetDate: '2026-12-01',
        projectedDate: null,
        status: 'active',
        isOverdue: false,
        accountPublicId: 'acc-2',
        contributions: [],
        createdAt: '2026-09-23T18:00:00Z',
        updatedAt: null,
        ...partial
    };
}

function tx(partial: Partial<Transaction> = {}): Transaction {
    return {
        publicId: 'tx-1',
        type: 'transfert',
        status: 'validee',
        source: 'manuelle',
        recurringExpensePublicId: null,
        recurringIncomePublicId: null,
        duePublicId: null,
        duePlannedAmount: null,
        label: 'Versement',
        amount: 400,
        currency: 'CHF',
        operationDate: '2026-09-01',
        valueDate: null,
        paymentMethodPublicId: null,
        categoryPublicId: null,
        tierPublicId: null,
        createdByUserPublicId: 'u-1',
        createdByDisplayName: 'Liam',
        createdByPhotoUrl: null,
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: null,
        movements: [
            { accountPublicId: 'acc-1', amount: 400, sens: 'debit' },
            { accountPublicId: 'acc-2', amount: 400, sens: 'credit' }
        ],
        files: [],
        savingsGoalPublicId: null,
        tagPublicIds: [],
        ...partial
    };
}

const owner = [
    { publicId: 'acc-1', myRole: 'owner' as const, isActive: true },
    { publicId: 'acc-2', myRole: 'owner' as const, isActive: true }
];

describe('savings-goals link-transactions', () => {
    it('reconnaît un transfert qui crédite le compte de l’objectif', () => {
        expect(transactionTouchesSavingsGoalAccount(tx(), 'acc-2')).toBe(true);
        expect(isTransactionLinkableToSavingsGoal(tx(), goal(), owner)).toBe(true);
    });

    it('refuse sans compte sur l’objectif, une autre devise, ou déjà liée', () => {
        expect(isTransactionLinkableToSavingsGoal(tx(), goal({ accountPublicId: null }), owner)).toBe(false);
        expect(isTransactionLinkableToSavingsGoal(tx({ currency: 'EUR' }), goal(), owner)).toBe(false);
        expect(isTransactionLinkableToSavingsGoal(tx({ savingsGoalPublicId: 'g-other' }), goal(), owner)).toBe(false);
    });

    it('accepte une écriture rapprochée et refuse un statut hors comptage', () => {
        expect(isTransactionLinkableToSavingsGoal(tx({ status: 'rapprochee' }), goal(), owner)).toBe(true);
        expect(
            isTransactionLinkableToSavingsGoal(
                tx({ status: 'validee', movements: [{ accountPublicId: 'acc-9', amount: 10, sens: 'credit' }] }),
                goal(),
                owner
            )
        ).toBe(false);
    });

    it('détache seulement les TX déjà rattachées à cet objectif', () => {
        expect(isTransactionUnlinkableFromSavingsGoal(tx({ savingsGoalPublicId: 'g-1' }), goal(), owner)).toBe(true);
        expect(isTransactionUnlinkableFromSavingsGoal(tx(), goal(), owner)).toBe(false);
    });

    it('filtre le sélecteur du formulaire : le compte de l’objectif doit être impliqué', () => {
        const accounts = [
            { publicId: 'acc-1', currency: 'CHF' as const },
            { publicId: 'acc-2', currency: 'CHF' as const }
        ];
        expect(
            isSavingsGoalCompatibleWithTransactionForm(
                goal(),
                { type: 'transfert', accountPublicId: 'acc-1', counterpartyAccountPublicId: 'acc-2' },
                accounts
            )
        ).toBe(true);
        expect(
            isSavingsGoalCompatibleWithTransactionForm(
                goal(),
                { type: 'depense', accountPublicId: 'acc-1', counterpartyAccountPublicId: '' },
                accounts
            )
        ).toBe(false);
        expect(
            isSavingsGoalCompatibleWithTransactionForm(
                goal(),
                { type: 'depense', accountPublicId: 'acc-2', counterpartyAccountPublicId: '' },
                accounts
            )
        ).toBe(true);
    });
});
