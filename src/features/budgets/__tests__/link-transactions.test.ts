import { describe, expect, it } from 'vitest';
import {
    budgetLinkedCategoryIds,
    isTransactionCountedInBudget,
    isTransactionLinkableToBudget
} from '@/features/budgets/link-transactions';
import type { Budget } from '@/features/budgets/types';
import type { Category } from '@/features/categories/types';
import type { Transaction } from '@/features/transactions/types';

function budget(partial: Partial<Budget> = {}): Budget {
    return {
        publicId: 'b-1',
        name: 'Alimentation',
        limitAmount: 400,
        currency: 'CHF',
        periode: 'mensuel',
        startDate: '2026-09-01',
        endDate: null,
        isActive: true,
        categoryPublicId: 'cat-food',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
        spentAmount: 80,
        remainingAmount: 320,
        percentUsed: 20,
        isCurrent: true,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: null,
        ...partial
    };
}

function category(partial: Partial<Category> = {}): Category {
    return {
        publicId: 'cat-food',
        name: 'Alimentation',
        type: 'depense',
        color: null,
        icone: null,
        parentPublicId: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: null,
        children: [],
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
        currency: 'CHF',
        operationDate: '2026-09-12',
        valueDate: null,
        paymentMethodPublicId: null,
        categoryPublicId: null,
        tierPublicId: null,
        createdByUserPublicId: 'u-1',
        createdByDisplayName: 'Liam',
        createdByPhotoUrl: null,
        createdAt: '2026-09-12T11:00:00Z',
        updatedAt: null,
        movements: [{ accountPublicId: 'acc-1', amount: 42.5, sens: 'debit' }],
        files: [],
        ...partial
    };
}

const owner = [{ publicId: 'acc-1', myRole: 'owner' as const, isActive: true }];

describe('budgets link-transactions', () => {
    it('inclut la catégorie et ses enfants', () => {
        const tree = [
            category({
                children: [category({ publicId: 'cat-market', name: 'Marché', parentPublicId: 'cat-food' })]
            })
        ];
        expect([...budgetLinkedCategoryIds(budget(), tree)!]).toEqual(['cat-food', 'cat-market']);
        expect(budgetLinkedCategoryIds(budget({ categoryPublicId: null }), tree)).toBeNull();
    });

    it('compte une dépense déjà classée dans le scope', () => {
        const ids = new Set(['cat-food', 'cat-market']);
        expect(isTransactionCountedInBudget(tx({ categoryPublicId: 'cat-market' }), budget(), ids)).toBe(true);
        expect(isTransactionCountedInBudget(tx({ categoryPublicId: 'cat-other' }), budget(), ids)).toBe(false);
        expect(isTransactionCountedInBudget(tx({ type: 'revenu' }), budget(), ids)).toBe(false);
        expect(isTransactionCountedInBudget(tx({ operationDate: '2026-08-31' }), budget(), ids)).toBe(false);
    });

    it('propose les dépenses de la fenêtre pas encore liées', () => {
        const ids = new Set(['cat-food']);
        expect(isTransactionLinkableToBudget(tx(), budget(), ids, owner)).toBe(true);
        expect(isTransactionLinkableToBudget(tx({ categoryPublicId: 'cat-food' }), budget(), ids, owner)).toBe(false);
        expect(isTransactionLinkableToBudget(tx({ amount: null }), budget(), ids, owner)).toBe(false);
        expect(isTransactionLinkableToBudget(tx(), budget({ categoryPublicId: null }), null, owner)).toBe(false);
    });
});
