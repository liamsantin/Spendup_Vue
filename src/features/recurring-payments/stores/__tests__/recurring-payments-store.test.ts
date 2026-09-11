import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import type { Account } from '@/features/accounts/types';
import type { RecurringExpense } from '@/features/recurring-payments/types';
import { emptyRecurringForm } from '@/features/recurring-payments/payload';

const expensesApi = vi.hoisted(() => ({
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    listDues: vi.fn(),
    confirmDue: vi.fn(),
    skipDue: vi.fn(),
    attachFile: vi.fn(),
    detachFile: vi.fn()
}));

const incomesApi = vi.hoisted(() => ({
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    listDues: vi.fn(),
    confirmDue: vi.fn(),
    skipDue: vi.fn()
}));

const accountsList: Account[] = [];
const subscribeToRecurringExpenseChanged = vi.fn();
const subscribeToRecurringIncomeChanged = vi.fn();
const subscribeToAccountChanged = vi.fn();

vi.mock('@/features/recurring-payments/api', () => ({
    recurringExpensesApi: expensesApi,
    recurringIncomesApi: incomesApi
}));

vi.mock('@/features/accounts/stores/accounts-store', () => ({
    useAccountsStore: () => ({
        accounts: accountsList,
        selectedAccount: null,
        loadAccounts: vi.fn().mockResolvedValue(undefined),
        loadAccountDetail: vi.fn().mockResolvedValue(undefined)
    })
}));

vi.mock('@/features/transactions/stores/transactions-store', () => ({
    useTransactionsStore: () => ({
        initialized: false,
        refetchActive: vi.fn()
    })
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({
        subscribeToRecurringExpenseChanged,
        subscribeToRecurringIncomeChanged,
        subscribeToAccountChanged
    })
}));

import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';

const ownedAccount: Account = {
    publicId: 'acc-1',
    name: 'Courant',
    type: 'courant',
    currency: 'CHF',
    initialBalance: 100,
    currentBalance: 100,
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
    hiddenFields: []
};

const rent: RecurringExpense = {
    publicId: 're-1',
    name: 'Loyer',
    expenseType: 'loyer',
    frequency: 'mensuel',
    plannedAmount: 1500,
    currency: 'CHF',
    startDate: '2026-08-01',
    endDate: null,
    nextDueDate: '2026-09-01',
    isActive: true,
    accountPublicId: 'acc-1',
    paymentMethodPublicId: null,
    categoryPublicId: null,
    tierPublicId: null,
    notes: null,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: null,
    upcomingDues: [],
    files: []
};

describe('useRecurringPaymentsStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(expensesApi).forEach((mock) => mock.mockReset());
        Object.values(incomesApi).forEach((mock) => mock.mockReset());
        subscribeToRecurringExpenseChanged.mockReset().mockReturnValue(() => undefined);
        subscribeToRecurringIncomeChanged.mockReset().mockReturnValue(() => undefined);
        subscribeToAccountChanged.mockReset().mockReturnValue(() => undefined);
        accountsList.length = 0;
        accountsList.push(ownedAccount);
    });

    it('charge les charges sans upcomingDues', async () => {
        expensesApi.list.mockResolvedValue({ items: [rent], page: 1, pageSize: 50, totalCount: 1 });
        const store = useRecurringPaymentsStore();
        await store.loadExpenses();
        expect(expensesApi.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 50 }));
        expect(store.expenses).toHaveLength(1);
        expect(store.expenses[0].upcomingDues).toEqual([]);
    });

    it('crée une charge', async () => {
        expensesApi.create.mockResolvedValue(rent);
        const store = useRecurringPaymentsStore();
        const fields = emptyRecurringForm('expense', 'acc-1');
        fields.name = 'Loyer';
        fields.plannedAmount = '1500';
        fields.startDate = '2026-08-01';
        const created = await store.createExpense(fields);
        expect(created.publicId).toBe('re-1');
        expect(store.expenses.some((item) => item.publicId === 're-1')).toBe(true);
    });

    it('onAuthenticatedSession branche le realtime sans charger', () => {
        const store = useRecurringPaymentsStore();
        store.onAuthenticatedSession();
        expect(subscribeToRecurringExpenseChanged).toHaveBeenCalled();
        expect(subscribeToRecurringIncomeChanged).toHaveBeenCalled();
        expect(expensesApi.list).not.toHaveBeenCalled();
    });
});
