import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { AppError } from '@/utils/errors/app-error';
import type { SharedDebt, SharedDebtsListResult } from '@/features/shared-debts/types';
import { emptySharedDebtFormFields, type SharedDebtFormFields } from '@/features/shared-debts/payload';

const api = vi.hoisted(() => ({
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    settle: vi.fn(),
    cancel: vi.fn(),
    remove: vi.fn()
}));

const transactions = vi.hoisted(() => ({ list: vi.fn() }));

const subscribeToSharedDebtChanged = vi.fn();

vi.mock('@/features/shared-debts/api', () => ({
    sharedDebtsApi: {
        list: (...args: unknown[]) => api.list(...args),
        get: (...args: unknown[]) => api.get(...args),
        create: (...args: unknown[]) => api.create(...args),
        update: (...args: unknown[]) => api.update(...args),
        settle: (...args: unknown[]) => api.settle(...args),
        cancel: (...args: unknown[]) => api.cancel(...args),
        remove: (...args: unknown[]) => api.remove(...args)
    }
}));

vi.mock('@/features/transactions', () => ({
    transactionsApi: {
        list: (...args: unknown[]) => transactions.list(...args)
    }
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({
        subscribeToSharedDebtChanged
    })
}));

import { useSharedDebtsStore } from '@/features/shared-debts/stores/shared-debts-store';

const ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '99999999-9999-4999-8999-999999999999';

const coop: SharedDebt = {
    publicId: ID,
    role: 'creditor',
    counterpart: { publicId: 'u-2', username: 'marc', firstName: null, name: null, profilePicture: null },
    label: 'Coop',
    amount: 45,
    repaidAmount: 0,
    remainingAmount: 45,
    currency: 'CHF',
    status: 'aRembourser',
    dueDate: null,
    settledAt: null,
    transactionPublicId: null,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: null
};

function form(partial: Partial<SharedDebtFormFields> = {}): SharedDebtFormFields {
    return { ...emptySharedDebtFormFields({ currency: 'CHF' }), debtorUserPublicId: 'u-2', label: 'Coop', amount: '45', ...partial };
}

function page(items: SharedDebt[], totals: Partial<SharedDebtsListResult> = {}): SharedDebtsListResult {
    return { items, totalCount: items.length, totalOwedToMe: 0, totalIOwe: 0, currency: 'CHF', ...totals };
}

type Listener = (payload: { change: string; sharedDebtPublicId: string }) => void;

function captureListener(): { current?: Listener } {
    const ref: { current?: Listener } = {};
    subscribeToSharedDebtChanged.mockImplementation((fn: Listener) => {
        ref.current = fn;
        return () => undefined;
    });
    return ref;
}

describe('useSharedDebtsStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        transactions.list.mockReset();
        subscribeToSharedDebtChanged.mockReset().mockReturnValue(() => undefined);
    });

    it('charge la liste créancier par défaut avec les totaux', async () => {
        api.list.mockResolvedValue(page([coop], { totalOwedToMe: 45, totalIOwe: 12 }));
        const store = useSharedDebtsStore();
        await store.loadList();
        expect(api.list).toHaveBeenCalledWith({ role: 'creditor', status: undefined });
        expect(store.items.map((item) => item.label)).toEqual(['Coop']);
        expect(store.totalOwedToMe).toBe(45);
        expect(store.totalIOwe).toBe(12);
        expect(store.totalsCurrency).toBe('CHF');

        api.list.mockResolvedValue(page([]));
        await store.loadList({ role: 'debtor', status: 'remboursee' });
        expect(api.list).toHaveBeenLastCalledWith({ role: 'debtor', status: 'remboursee' });
        expect(store.activeQuery).toEqual({ role: 'debtor', status: 'remboursee' });
        expect(store.items).toHaveLength(0);
    });

    it('crée, modifie, rembourse, annule et supprime', async () => {
        // « serveur » mutable : chaque mutation déclenche un refetch des totaux qui doit voir l’état à jour
        let server: SharedDebt[] = [];
        function respond(debt: SharedDebt | null) {
            server = debt ? [debt] : [];
            return Promise.resolve(debt ?? undefined);
        }
        api.list.mockImplementation(() => Promise.resolve(page(server)));
        api.create.mockImplementation(() => respond(coop));
        api.update.mockImplementation(() => respond({ ...coop, amount: 50, remainingAmount: 50 }));
        api.settle.mockImplementation(() =>
            respond({ ...coop, amount: 50, repaidAmount: 20, remainingAmount: 30, status: 'partiellementRemboursee' })
        );
        api.cancel.mockImplementation(() => respond({ ...coop, status: 'canceled' }));
        api.remove.mockImplementation(() => respond(null));

        const store = useSharedDebtsStore();
        await store.loadList();
        await store.createSharedDebt(form());
        expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ debtorUserPublicId: 'u-2', amount: 45, label: 'Coop' }));
        expect(store.items).toHaveLength(1);

        await store.updateSharedDebt(ID, form({ amount: '50' }));
        expect(api.update).toHaveBeenCalledWith(ID, { label: 'Coop', amount: 50, dueDate: null });
        expect(store.items[0]?.amount).toBe(50);

        await store.settleSharedDebt(ID, { amount: '20', date: '2026-10-27' }, { remainingAmount: 50, today: '2026-10-27' });
        expect(api.settle).toHaveBeenCalledWith(ID, { amount: 20, date: '2026-10-27' });
        expect(store.items[0]?.remainingAmount).toBe(30);

        await store.cancelSharedDebt(ID);
        expect(store.findByPublicId(ID)?.status).toBe('canceled');

        const deleted: string[] = [];
        store.subscribeToDeleted((id) => deleted.push(id));
        await store.deleteSharedDebt(ID);
        expect(store.items).toHaveLength(0);
        expect(deleted).toEqual([ID]);
    });

    it('rejette un formulaire invalide sans appel API', async () => {
        const store = useSharedDebtsStore();
        await expect(store.createSharedDebt(form({ debtorUserPublicId: '' }))).rejects.toMatchObject({ status: 400 });
        expect(api.create).not.toHaveBeenCalled();
        expect(store.error).toBeTruthy();
    });

    it('normalise un 404 en message neutre et retire la dette', async () => {
        api.list.mockResolvedValue(page([coop]));
        api.cancel.mockRejectedValue(new AppError('Not found', 404));
        const store = useSharedDebtsStore();
        await store.loadList();
        await expect(store.cancelSharedDebt(ID)).rejects.toMatchObject({ status: 404 });
        expect(store.error).toBe('Dette introuvable.');
        expect(store.items).toHaveLength(0);
    });

    it('affiche tel quel le message d’un 400', async () => {
        api.settle.mockRejectedValue(new AppError('Seul le créancier peut modifier cette dette.', 400));
        const store = useSharedDebtsStore();
        await expect(
            store.settleSharedDebt(ID, { amount: '', date: null }, { remainingAmount: 45, today: '2026-10-27' })
        ).rejects.toMatchObject({
            status: 400
        });
        expect(store.error).toBe('Seul le créancier peut modifier cette dette.');
    });

    it('ignore un sharedDebtChanged correspondant à une mutation locale', async () => {
        api.list.mockResolvedValue(page([]));
        api.create.mockResolvedValue(coop);
        const listener = captureListener();

        const store = useSharedDebtsStore();
        await store.bootstrap();
        await store.createSharedDebt(form());
        // laisse passer le refetch des totaux déclenché par la mutation
        await vi.waitFor(() => expect(store.loading).toBe(false));
        api.list.mockClear();
        listener.current?.({ change: 'sharedDebtCreated', sharedDebtPublicId: ID });
        await Promise.resolve();
        await Promise.resolve();
        expect(api.list).not.toHaveBeenCalled();
    });

    it('refetch sur un événement externe (dette créée par un ami)', async () => {
        api.list.mockResolvedValue(page([]));
        const listener = captureListener();
        const store = useSharedDebtsStore();
        await store.bootstrap();
        api.list.mockClear();
        listener.current?.({ change: 'sharedDebtCreated', sharedDebtPublicId: OTHER_ID });
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
        });
    });

    it('retire localement une dette supprimée par l’autre partie', async () => {
        api.list.mockResolvedValue(page([coop]));
        const listener = captureListener();
        const store = useSharedDebtsStore();
        await store.bootstrap();
        const deleted: string[] = [];
        store.subscribeToDeleted((id) => deleted.push(id));
        api.list.mockResolvedValue(page([]));
        listener.current?.({ change: 'sharedDebtDeleted', sharedDebtPublicId: ID });
        expect(store.findByPublicId(ID)).toBeNull();
        expect(deleted).toEqual([ID]);
    });

    it('charge les dépenses candidates (dépenses seulement)', async () => {
        transactions.list.mockResolvedValue({
            items: [
                { publicId: 't-1', type: 'depense', label: 'Coop', amount: 45, currency: 'CHF' },
                { publicId: 't-2', type: 'revenu', label: 'Salaire', amount: 5000, currency: 'CHF' }
            ]
        });
        const store = useSharedDebtsStore();
        const items = await store.loadExpenseCandidates('coop');
        expect(transactions.list).toHaveBeenCalledWith({ search: 'coop', pageSize: 100 });
        expect(items.map((item) => item.publicId)).toEqual(['t-1']);
        expect(store.expenseCandidates).toHaveLength(1);
    });

    it('onAuthenticatedSession branche le realtime sans charger', () => {
        const store = useSharedDebtsStore();
        store.onAuthenticatedSession();
        expect(subscribeToSharedDebtChanged).toHaveBeenCalledTimes(1);
        expect(api.list).not.toHaveBeenCalled();
    });

    it('reset vide tout et coupe le realtime', async () => {
        const unsubscribe = vi.fn();
        subscribeToSharedDebtChanged.mockReturnValue(unsubscribe);
        api.list.mockResolvedValue(page([coop], { totalOwedToMe: 45 }));
        const store = useSharedDebtsStore();
        await store.bootstrap();
        store.reset();
        expect(store.items).toHaveLength(0);
        expect(store.totalOwedToMe).toBe(0);
        expect(store.initialized).toBe(false);
        expect(store.findByPublicId(ID)).toBeNull();
        expect(unsubscribe).toHaveBeenCalled();
    });
});
