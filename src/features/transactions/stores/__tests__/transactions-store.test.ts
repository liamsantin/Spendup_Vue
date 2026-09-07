import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { AppError } from '@/utils/errors/app-error';
import type { Account } from '@/features/accounts/types';
import type { Transaction } from '@/features/transactions/types';
import type { TransactionFormFields } from '@/features/transactions/payload';

const api = vi.hoisted(() => ({
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
}));

const accountsApi = vi.hoisted(() => ({
    loadAccounts: vi.fn().mockResolvedValue(undefined),
    loadAccountDetail: vi.fn().mockResolvedValue(undefined),
    selectedAccount: null as Account | null
}));

const accountsList: Account[] = [];
const subscribeToAccountChanged = vi.fn();

vi.mock('@/features/transactions/api', () => ({
    transactionsApi: {
        list: (...args: unknown[]) => api.list(...args),
        get: (...args: unknown[]) => api.get(...args),
        create: (...args: unknown[]) => api.create(...args),
        update: (...args: unknown[]) => api.update(...args),
        remove: (...args: unknown[]) => api.remove(...args)
    }
}));

vi.mock('@/features/accounts/stores/accounts-store', () => ({
    useAccountsStore: () => ({
        accounts: accountsList,
        selectedAccount: accountsApi.selectedAccount,
        loadAccounts: (...args: unknown[]) => accountsApi.loadAccounts(...args),
        loadAccountDetail: (...args: unknown[]) => accountsApi.loadAccountDetail(...args)
    })
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({
        subscribeToAccountChanged
    })
}));

import { useTransactionsStore } from '@/features/transactions/stores/transactions-store';

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
    isPrimary: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
    isOwned: true,
    myRole: 'owner',
    hiddenFields: []
};

const savings: Account = {
    ...ownedAccount,
    publicId: 'acc-2',
    name: 'Épargne',
    type: 'epargne',
    isPrimary: false
};

const expense: Transaction = {
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
    createdAt: '2026-09-07T11:03:44Z',
    updatedAt: null,
    movements: [{ accountPublicId: 'acc-1', amount: 42.5, sens: 'debit' }]
};

function form(partial: Partial<TransactionFormFields> = {}): TransactionFormFields {
    return {
        type: 'depense',
        accountPublicId: 'acc-1',
        counterpartyAccountPublicId: '',
        label: 'Courses',
        amount: '42.50',
        operationDate: '2026-09-07',
        valueDate: null,
        paymentMethodPublicId: '',
        ...partial
    };
}

describe('useTransactionsStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        accountsApi.loadAccounts.mockReset().mockResolvedValue(undefined);
        accountsApi.loadAccountDetail.mockReset().mockResolvedValue(undefined);
        accountsApi.selectedAccount = null;
        subscribeToAccountChanged.mockReset().mockReturnValue(() => undefined);
        accountsList.length = 0;
        accountsList.push(ownedAccount, savings);
    });

    it('charge la liste globale et la liste filtrée', async () => {
        api.list.mockResolvedValue({ items: [expense], page: 1, pageSize: 50, totalCount: 1 });
        const store = useTransactionsStore();
        await store.loadList();
        expect(api.list).toHaveBeenCalledWith({
            accountPublicId: undefined,
            from: undefined,
            to: undefined,
            page: 1,
            pageSize: 50
        });
        expect(store.items).toHaveLength(1);

        api.list.mockResolvedValue({ items: [expense], page: 1, pageSize: 50, totalCount: 1 });
        await store.loadList({ accountPublicId: 'acc-1', from: '2026-09-01', to: '2026-09-30', force: true });
        expect(api.list).toHaveBeenLastCalledWith({
            accountPublicId: 'acc-1',
            from: '2026-09-01',
            to: '2026-09-30',
            page: 1,
            pageSize: 50
        });
    });

    it('crée, met à jour et supprime puis rafraîchit les soldes', async () => {
        api.list.mockResolvedValue({ items: [], page: 1, pageSize: 50, totalCount: 0 });
        api.create.mockResolvedValue(expense);
        api.update.mockResolvedValue({ ...expense, label: 'Courses bio', amount: 25 });
        api.remove.mockResolvedValue(undefined);

        const store = useTransactionsStore();
        await store.loadList({ accountPublicId: 'acc-1' });
        const created = await store.createTransaction(form());
        expect(created.publicId).toBe('tx-1');
        expect(store.items).toHaveLength(1);
        expect(accountsApi.loadAccounts).toHaveBeenCalledWith(true);

        await store.updateTransaction('tx-1', form({ label: 'Courses bio', amount: '25' }));
        expect(store.items[0]?.label).toBe('Courses bio');

        await store.deleteTransaction('tx-1');
        expect(store.items).toHaveLength(0);
        expect(api.remove).toHaveBeenCalledWith('tx-1');
    });

    it('refuse l’écriture viewer / compte archivé', async () => {
        accountsList.length = 0;
        accountsList.push({ ...ownedAccount, myRole: 'viewer' });
        const store = useTransactionsStore();
        await expect(store.createTransaction(form())).rejects.toMatchObject({ status: 403 });

        accountsList.length = 0;
        accountsList.push({ ...ownedAccount, isActive: false });
        await expect(store.createTransaction(form())).rejects.toMatchObject({ status: 403 });
    });

    it('normalise un 404 en message neutre', async () => {
        api.update.mockRejectedValue(new AppError('Transaction introuvable.', 404));
        const store = useTransactionsStore();
        await expect(store.updateTransaction('tx-missing', form())).rejects.toMatchObject({ status: 404 });
        expect(store.error).toBe('Cette transaction n’est plus disponible.');
    });

    it('refetch sur transactionCreated et déduplique un transfert (deux events)', async () => {
        api.list.mockResolvedValue({ items: [expense], page: 1, pageSize: 50, totalCount: 1 });
        let listener: ((payload: { change: string; accountPublicId: string }) => void) | undefined;
        subscribeToAccountChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = useTransactionsStore();
        await store.bootstrap();
        expect(subscribeToAccountChanged).toHaveBeenCalled();
        api.list.mockClear();
        accountsApi.loadAccounts.mockClear();
        api.list.mockResolvedValue({ items: [expense], page: 1, pageSize: 50, totalCount: 1 });

        listener?.({ change: 'transactionCreated', accountPublicId: 'acc-1' });
        listener?.({ change: 'transactionCreated', accountPublicId: 'acc-2' });
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalledTimes(1);
        });
        expect(accountsApi.loadAccounts).toHaveBeenCalledWith(true);
    });

    it('onAuthenticatedSession branche le realtime sans charger', () => {
        const store = useTransactionsStore();
        store.onAuthenticatedSession();
        expect(subscribeToAccountChanged).toHaveBeenCalled();
        expect(api.list).not.toHaveBeenCalled();
    });
});
