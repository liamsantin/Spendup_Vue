import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { AppError } from '@/utils/errors/app-error';
import type { Account } from '@/features/accounts/types';
import type { PaymentMethod } from '@/features/payment-methods/types';
import type { PaymentMethodFormFields } from '@/features/payment-methods/payload';

const api = vi.hoisted(() => ({
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
}));

const accountsList: Account[] = [];
const subscribeToAccountChanged = vi.fn();

vi.mock('@/features/payment-methods/api', () => ({
    paymentMethodsApi: {
        list: (...args: unknown[]) => api.list(...args),
        get: (...args: unknown[]) => api.get(...args),
        create: (...args: unknown[]) => api.create(...args),
        update: (...args: unknown[]) => api.update(...args),
        remove: (...args: unknown[]) => api.remove(...args)
    }
}));

vi.mock('@/features/accounts/stores/accounts-store', () => ({
    useAccountsStore: () => ({
        accounts: accountsList
    })
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({
        subscribeToAccountChanged
    })
}));

import { usePaymentMethodsStore } from '@/features/payment-methods/stores/payment-methods-store';

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

const visa: PaymentMethod = {
    publicId: 'pm-1',
    accountPublicId: 'acc-1',
    type: 'carte',
    label: 'Visa perso',
    reference: null,
    lastFourDigits: '4242',
    expirationDate: '2029-12-01',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null
};

function form(partial: Partial<PaymentMethodFormFields> = {}): PaymentMethodFormFields {
    return {
        accountPublicId: 'acc-1',
        type: 'carte',
        label: 'Visa perso',
        reference: '',
        lastFourDigits: '4242',
        expirationDate: '2029-12-01',
        isActive: true,
        ...partial
    };
}

describe('usePaymentMethodsStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        subscribeToAccountChanged.mockReset().mockReturnValue(() => undefined);
        accountsList.length = 0;
        accountsList.push(ownedAccount);
    });

    it('charge la liste globale et la liste filtrée', async () => {
        api.list.mockResolvedValue({ items: [visa], page: 1, pageSize: 50, totalCount: 1 });
        const store = usePaymentMethodsStore();
        await store.loadList();
        expect(api.list).toHaveBeenCalledWith({ accountPublicId: undefined, page: 1, pageSize: 50 });
        expect(store.items).toHaveLength(1);

        api.list.mockResolvedValue({ items: [visa], page: 1, pageSize: 50, totalCount: 1 });
        await store.loadList({ accountPublicId: 'acc-1', force: true });
        expect(api.list).toHaveBeenLastCalledWith({ accountPublicId: 'acc-1', page: 1, pageSize: 50 });
    });

    it('crée, met à jour et supprime', async () => {
        api.list.mockResolvedValue({ items: [], page: 1, pageSize: 50, totalCount: 0 });
        api.create.mockResolvedValue(visa);
        api.update.mockResolvedValue({ ...visa, label: 'Visa gold' });
        api.remove.mockResolvedValue(undefined);

        const store = usePaymentMethodsStore();
        await store.loadList({ accountPublicId: 'acc-1' });
        const created = await store.createPaymentMethod(form());
        expect(created.publicId).toBe('pm-1');
        expect(store.items).toHaveLength(1);

        await store.updatePaymentMethod('pm-1', form({ label: 'Visa gold' }));
        expect(store.items[0]?.label).toBe('Visa gold');

        await store.deletePaymentMethod('pm-1', 'acc-1');
        expect(store.items).toHaveLength(0);
        expect(api.remove).toHaveBeenCalledWith('pm-1');
    });

    it('refuse un doublon de libellé côté client', async () => {
        api.list.mockResolvedValue({ items: [visa], page: 1, pageSize: 50, totalCount: 1 });
        const store = usePaymentMethodsStore();
        await store.loadList({ accountPublicId: 'acc-1' });
        await expect(store.createPaymentMethod(form({ label: 'VISA PERSO' }))).rejects.toMatchObject({
            status: 400,
            code: 'labelDuplicate'
        });
        expect(api.create).not.toHaveBeenCalled();
    });

    it('refuse l’écriture si le compte est absent du store', async () => {
        accountsList.length = 0;
        const store = usePaymentMethodsStore();
        await expect(store.createPaymentMethod(form({ label: 'Visa perso' }))).rejects.toMatchObject({
            status: 403,
            code: 'payment_method_forbidden'
        });
        expect(api.create).not.toHaveBeenCalled();
    });

    it('propage le message 400 serveur', async () => {
        api.list.mockResolvedValue({ items: [], page: 1, pageSize: 50, totalCount: 0 });
        api.create.mockRejectedValue(new AppError('Compte archivé, restaurer d’abord.', 400));
        const store = usePaymentMethodsStore();
        await store.loadList({ accountPublicId: 'acc-1' });
        await expect(store.createPaymentMethod(form({ label: 'Autre' }))).rejects.toMatchObject({ status: 400 });
        expect(store.error).toBe('Compte archivé, restaurer d’abord.');
    });

    it('gère le 404 en vidant l’item', async () => {
        api.list.mockResolvedValue({ items: [visa], page: 1, pageSize: 50, totalCount: 1 });
        api.remove.mockRejectedValue(new AppError('Not found', 404));
        const store = usePaymentMethodsStore();
        await store.loadList({ accountPublicId: 'acc-1' });
        await expect(store.deletePaymentMethod('pm-1', 'acc-1')).rejects.toMatchObject({ status: 404 });
        expect(store.items).toHaveLength(0);
        expect(store.error).toBe('Moyen de paiement introuvable.');
    });

    it('après create sur un compte, charge vraiment la liste globale (pas de TTL à vide)', async () => {
        api.list.mockResolvedValue({ items: [], page: 1, pageSize: 50, totalCount: 0 });
        api.create.mockResolvedValue(visa);
        const store = usePaymentMethodsStore();
        await store.loadList({ accountPublicId: 'acc-1' });

        await store.createPaymentMethod(form({ label: 'Visa perso' }));
        api.list.mockClear();
        api.list.mockResolvedValue({ items: [visa], page: 1, pageSize: 50, totalCount: 1 });

        await store.loadList();
        expect(api.list).toHaveBeenCalledWith({ accountPublicId: undefined, page: 1, pageSize: 50 });
        expect(store.items).toHaveLength(1);
        expect(store.activeAccountPublicId).toBeNull();
    });

    it('refetch sur paymentMethodCreated et purge sur revoked (liste globale)', async () => {
        api.list.mockResolvedValue({ items: [visa], page: 1, pageSize: 50, totalCount: 1 });
        let listener: ((payload: { change: string; accountPublicId: string }) => void) | undefined;
        subscribeToAccountChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = usePaymentMethodsStore();
        await store.bootstrap();
        expect(subscribeToAccountChanged).toHaveBeenCalled();
        api.list.mockClear();
        api.list.mockResolvedValue({ items: [visa, { ...visa, publicId: 'pm-2', label: 'Twint' }], page: 1, pageSize: 50, totalCount: 2 });

        listener?.({ change: 'paymentMethodCreated', accountPublicId: 'acc-1' });
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
        });

        api.list.mockClear();
        api.list.mockResolvedValue({ items: [], page: 1, pageSize: 50, totalCount: 0 });
        listener?.({ change: 'revoked', accountPublicId: 'acc-1' });
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalledWith({ accountPublicId: undefined, page: 1, pageSize: 50 });
        });
        expect(store.items.every((item) => item.accountPublicId !== 'acc-1')).toBe(true);
    });

    it('revoked sur un autre compte ne bascule pas la liste active', async () => {
        const acc2Method: PaymentMethod = { ...visa, publicId: 'pm-2', accountPublicId: 'acc-2', label: 'Twint' };
        let listener: ((payload: { change: string; accountPublicId: string }) => void) | undefined;
        subscribeToAccountChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });

        api.list.mockResolvedValue({ items: [acc2Method], page: 1, pageSize: 50, totalCount: 1 });
        const store = usePaymentMethodsStore();
        await store.bootstrap('acc-2');
        expect(store.activeAccountPublicId).toBe('acc-2');

        api.list.mockClear();
        listener?.({ change: 'revoked', accountPublicId: 'acc-1' });
        await Promise.resolve();
        expect(api.list).not.toHaveBeenCalled();
        expect(store.activeAccountPublicId).toBe('acc-2');
        expect(store.items).toEqual([acc2Method]);
    });

    it('refetch d’un autre compte n’écrase pas totalCount / hasMore de la liste globale', async () => {
        const acc2Method: PaymentMethod = { ...visa, publicId: 'pm-2', accountPublicId: 'acc-2', label: 'Twint' };
        let listener: ((payload: { change: string; accountPublicId: string }) => void) | undefined;
        subscribeToAccountChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });

        const page1 = [visa, acc2Method];
        api.list.mockResolvedValue({ items: page1, page: 1, pageSize: 50, totalCount: 200 });
        const store = usePaymentMethodsStore();
        await store.bootstrap();
        expect(store.hasMore).toBe(true);

        api.list.mockResolvedValue({ items: [acc2Method], page: 1, pageSize: 50, totalCount: 1 });
        await store.loadList({ accountPublicId: 'acc-2', force: true });
        expect(store.activeAccountPublicId).toBe('acc-2');

        api.list.mockClear();
        api.list.mockResolvedValue({
            items: [visa, { ...visa, publicId: 'pm-3', label: 'Nouvelle carte' }],
            page: 1,
            pageSize: 50,
            totalCount: 12
        });
        listener?.({ change: 'paymentMethodCreated', accountPublicId: 'acc-1' });
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalledWith({ accountPublicId: 'acc-1', page: 1, pageSize: 50 });
        });
        expect(store.activeAccountPublicId).toBe('acc-2');
        expect(store.items).toEqual([acc2Method]);

        api.list.mockClear();
        api.list.mockResolvedValue({ items: page1, page: 1, pageSize: 50, totalCount: 201 });
        await store.loadList();
        expect(api.list).toHaveBeenCalledWith({ accountPublicId: undefined, page: 1, pageSize: 50 });
        expect(store.totalCount).toBe(201);
        expect(store.hasMore).toBe(true);
        expect(store.items).toHaveLength(2);
    });

    it('onAuthenticatedSession branche le realtime sans charger', () => {
        const store = usePaymentMethodsStore();
        store.onAuthenticatedSession();
        expect(subscribeToAccountChanged).toHaveBeenCalled();
        expect(api.list).not.toHaveBeenCalled();
    });
});
