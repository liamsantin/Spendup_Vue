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
    linkDue: vi.fn(),
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
    linkDue: vi.fn(),
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
    bank: null,
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
    tagPublicIds: [],
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

    it('refuse la suppression si le rôle du compte est viewer', async () => {
        expensesApi.create.mockResolvedValue(rent);
        const store = useRecurringPaymentsStore();
        const fields = emptyRecurringForm('expense', 'acc-1');
        fields.name = 'Loyer';
        fields.plannedAmount = '1500';
        fields.startDate = '2026-08-01';
        await store.createExpense(fields);
        accountsList[0] = { ...ownedAccount, myRole: 'viewer' };
        await expect(store.deleteExpense('re-1')).rejects.toMatchObject({ status: 403 });
        expect(expensesApi.remove).not.toHaveBeenCalled();
    });

    it('rouvre les dues liées après suppression de la transaction', async () => {
        const paidDue = {
            publicId: 'due-1',
            scheduledAt: '2026-09-11',
            plannedAmount: 1500,
            actualAmount: 1500,
            status: 'payee',
            transactionPublicId: 'tx-1',
            notes: null
        };
        const reopenedDue = { ...paidDue, actualAmount: null, status: 'prevue', transactionPublicId: null };
        expensesApi.listDues.mockResolvedValueOnce({ items: [paidDue], page: 1, pageSize: 50, totalCount: 1 });
        expensesApi.listDues.mockResolvedValueOnce({ items: [reopenedDue], page: 1, pageSize: 50, totalCount: 1 });
        expensesApi.get.mockResolvedValue(rent);
        const store = useRecurringPaymentsStore();
        await store.loadDues('expense', 're-1');
        expect(store.getDues('expense', 're-1')[0]?.transactionPublicId).toBe('tx-1');
        await store.syncDuesAfterTransactionRemoved({ transactionPublicId: 'tx-1', recurringExpensePublicId: 're-1' });
        expect(store.getDues('expense', 're-1')[0]?.transactionPublicId).toBeNull();
        expect(store.getDues('expense', 're-1')[0]?.status).toBe('prevue');
    });

    it('hydrate les dues depuis le GET détail', async () => {
        const due = {
            publicId: 'due-1',
            scheduledAt: '2026-09-11',
            plannedAmount: 1500,
            actualAmount: null,
            status: 'prevue',
            transactionPublicId: null,
            notes: null
        };
        expensesApi.get.mockResolvedValue({ ...rent, upcomingDues: [due] });
        const store = useRecurringPaymentsStore();
        await store.getExpense('re-1', true);
        expect(store.getDues('expense', 're-1')).toEqual([due]);
    });

    it('réinitialise loadingMore quand un rechargement de liste remplace un « charger plus »', async () => {
        const second: RecurringExpense = { ...rent, publicId: 're-2', name: 'Assurance' };
        expensesApi.list.mockResolvedValueOnce({ items: [rent], page: 1, pageSize: 1, totalCount: 2 });
        const store = useRecurringPaymentsStore();
        await store.loadExpenses();
        let resolveMore: (value: unknown) => void = () => undefined;
        expensesApi.list.mockReturnValueOnce(new Promise((resolve) => (resolveMore = resolve)));
        const more = store.loadMoreExpenses();
        expect(store.loadingMoreExpenses).toBe(true);
        expensesApi.list.mockResolvedValueOnce({ items: [rent], page: 1, pageSize: 1, totalCount: 2 });
        await store.loadExpenses({ force: true });
        expect(store.loadingMoreExpenses).toBe(false);
        resolveMore({ items: [second], page: 2, pageSize: 1, totalCount: 2 });
        await more;
        expect(store.loadingMoreExpenses).toBe(false);
        expect(store.expenses.map((item) => item.publicId)).toEqual(['re-1']);
    });

    it('applique les dues de chargements parallèles pour des modèles différents', async () => {
        const due = (publicId: string) => ({
            publicId,
            scheduledAt: '2026-09-11',
            plannedAmount: 1500,
            actualAmount: null,
            status: 'prevue',
            transactionPublicId: null,
            notes: null
        });
        const resolvers: Array<(value: unknown) => void> = [];
        expensesApi.listDues.mockImplementation(() => new Promise((resolve) => resolvers.push(resolve)));
        const store = useRecurringPaymentsStore();
        const first = store.loadDues('expense', 're-1');
        const second = store.loadDues('expense', 're-2');
        expect(store.loadingDues).toBe(true);
        resolvers[0]({ items: [due('due-1')], page: 1, pageSize: 50, totalCount: 1 });
        await first;
        expect(store.loadingDues).toBe(true);
        resolvers[1]({ items: [due('due-2')], page: 1, pageSize: 50, totalCount: 1 });
        await second;
        expect(store.loadingDues).toBe(false);
        expect(store.getDues('expense', 're-1').map((item) => item.publicId)).toEqual(['due-1']);
        expect(store.getDues('expense', 're-2').map((item) => item.publicId)).toEqual(['due-2']);
    });

    it('ignore une réponse de dues obsolète pour le même modèle', async () => {
        const due = (publicId: string) => ({
            publicId,
            scheduledAt: '2026-09-11',
            plannedAmount: 1500,
            actualAmount: null,
            status: 'prevue',
            transactionPublicId: null,
            notes: null
        });
        const resolvers: Array<(value: unknown) => void> = [];
        expensesApi.listDues.mockImplementation(() => new Promise((resolve) => resolvers.push(resolve)));
        const store = useRecurringPaymentsStore();
        const stale = store.loadDues('expense', 're-1');
        const fresh = store.loadDues('expense', 're-1');
        resolvers[1]({ items: [due('due-new')], page: 1, pageSize: 50, totalCount: 1 });
        await fresh;
        resolvers[0]({ items: [due('due-old')], page: 1, pageSize: 50, totalCount: 1 });
        await stale;
        expect(store.loadingDues).toBe(false);
        expect(store.getDues('expense', 're-1').map((item) => item.publicId)).toEqual(['due-new']);
    });

    it("retire un modèle de la liste de l'ancien compte après changement de compte", async () => {
        expensesApi.list.mockResolvedValueOnce({ items: [rent], page: 1, pageSize: 50, totalCount: 1 });
        const store = useRecurringPaymentsStore();
        await store.loadExpenses({ accountPublicId: 'acc-1' });
        expect(store.expenses).toHaveLength(1);
        expensesApi.get.mockResolvedValue({ ...rent, accountPublicId: 'acc-2' });
        await store.getExpense('re-1', true);
        expect(store.expenses).toHaveLength(0);
        expect(store.expenseTotalCount).toBe(0);
        expect(store.getDetail('expense', 're-1')?.accountPublicId).toBe('acc-2');
    });

    it("une liste filtrée par dates n'écrase pas la liste complète en cache", async () => {
        const second: RecurringExpense = { ...rent, publicId: 're-2', name: 'Assurance', nextDueDate: '2027-06-01' };
        expensesApi.list.mockResolvedValueOnce({ items: [rent, second], page: 1, pageSize: 50, totalCount: 2 });
        const store = useRecurringPaymentsStore();
        await store.loadExpenses();
        expensesApi.list.mockResolvedValueOnce({ items: [rent], page: 1, pageSize: 1, totalCount: 2 });
        await store.loadExpenses({ from: '2026-09-01', to: '2026-12-01', pageSize: 1, force: true });
        expect(store.expenses.map((item) => item.publicId)).toEqual(['re-1']);

        // « Charger plus » reprend les filtres de la liste active.
        expensesApi.list.mockResolvedValueOnce({ items: [], page: 2, pageSize: 1, totalCount: 2 });
        await store.loadMoreExpenses();
        expect(expensesApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ from: '2026-09-01', to: '2026-12-01', page: 2 }));

        // Retour à la liste complète dans le TTL : servie depuis le cache, sans le filtre de dates.
        await store.loadExpenses();
        expect(expensesApi.list).toHaveBeenCalledTimes(3);
        expect(store.expenses.map((item) => item.publicId).sort()).toEqual(['re-1', 're-2']);
    });

    it("n'ajoute pas un modèle créé à une liste filtrée et l'invalide", async () => {
        expensesApi.list.mockResolvedValueOnce({ items: [], page: 1, pageSize: 50, totalCount: 0 });
        const store = useRecurringPaymentsStore();
        await store.loadExpenses({ from: '2026-09-01', to: '2026-12-01' });
        expensesApi.create.mockResolvedValue(rent);
        const fields = emptyRecurringForm('expense', 'acc-1');
        fields.name = 'Loyer';
        fields.plannedAmount = '1500';
        fields.startDate = '2026-08-01';
        await store.createExpense(fields);
        expect(store.expenses).toHaveLength(0);
        expensesApi.list.mockResolvedValueOnce({ items: [rent], page: 1, pageSize: 50, totalCount: 1 });
        await store.loadExpenses({ from: '2026-09-01', to: '2026-12-01' });
        expect(expensesApi.list).toHaveBeenCalledTimes(2);
        expect(store.expenses).toHaveLength(1);
    });

    it('onAuthenticatedSession branche le realtime sans charger', () => {
        const store = useRecurringPaymentsStore();
        store.onAuthenticatedSession();
        expect(subscribeToRecurringExpenseChanged).toHaveBeenCalled();
        expect(subscribeToRecurringIncomeChanged).toHaveBeenCalled();
        expect(expensesApi.list).not.toHaveBeenCalled();
    });
});
