import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { AppError } from '@/utils/errors/app-error';
import type { Tier } from '@/features/tiers/types';
import { emptyTierFormFields, type TierFormFields } from '@/features/tiers/payload';

const api = vi.hoisted(() => ({
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
}));

const subscribeToTierChanged = vi.fn();

vi.mock('@/features/tiers/api', () => ({
    tiersApi: {
        list: (...args: unknown[]) => api.list(...args),
        get: (...args: unknown[]) => api.get(...args),
        create: (...args: unknown[]) => api.create(...args),
        update: (...args: unknown[]) => api.update(...args),
        remove: (...args: unknown[]) => api.remove(...args)
    }
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({
        subscribeToTierChanged
    })
}));

import { useTiersStore } from '@/features/tiers/stores/tiers-store';

const migros: Tier = {
    publicId: 'tier-1',
    name: 'Migros',
    nature: 'company',
    email: 'contact@migros.ch',
    phone: null,
    website: 'https://migros.ch/',
    notes: null,
    roles: ['fournisseur'],
    person: null,
    company: { legalName: null, vatNumber: null, companyRegistrationNumber: null },
    organization: null,
    createdAt: '2026-09-07T14:32:10Z',
    updatedAt: null
};

const ubs: Tier = {
    ...migros,
    publicId: 'tier-2',
    name: 'UBS',
    roles: ['banque']
};

function form(partial: Partial<TierFormFields> = {}): TierFormFields {
    return {
        ...emptyTierFormFields('company'),
        name: 'Migros',
        email: 'contact@migros.ch',
        website: 'migros.ch',
        roles: ['fournisseur'],
        ...partial
    };
}

function page(items: Tier[], totalCount = items.length) {
    return { items, page: 1, pageSize: 50, totalCount };
}

describe('useTiersStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        subscribeToTierChanged.mockReset().mockReturnValue(() => undefined);
    });

    it('charge la liste et applique nature / rôle / recherche', async () => {
        api.list.mockResolvedValue(page([migros, ubs]));
        const store = useTiersStore();
        await store.loadList();
        expect(api.list).toHaveBeenCalledWith({ nature: undefined, role: undefined, search: undefined, page: 1, pageSize: 50 });
        expect(store.items.map((item) => item.name)).toEqual(['Migros', 'UBS']);

        api.list.mockResolvedValue(page([ubs]));
        await store.loadList({ role: 'banque', search: '  ub ', force: true });
        expect(api.list).toHaveBeenLastCalledWith({ nature: undefined, role: 'banque', search: 'ub', page: 1, pageSize: 50 });
        expect(store.items).toHaveLength(1);
        expect(store.activeQuery).toEqual({ nature: null, role: 'banque', search: 'ub' });
    });

    it('crée, met à jour et supprime en mémorisant l’index', async () => {
        api.list.mockResolvedValue(page([]));
        api.create.mockResolvedValue(migros);
        api.update.mockResolvedValue({ ...migros, name: 'Migros SA' });
        api.remove.mockResolvedValue(undefined);

        const store = useTiersStore();
        await store.loadList();
        const created = await store.createTier(form());
        expect(created.publicId).toBe('tier-1');
        expect(api.create).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Migros', website: 'https://migros.ch/', person: null, organization: null })
        );
        expect(store.items).toHaveLength(1);
        expect(store.findByPublicId('tier-1')?.name).toBe('Migros');

        await store.updateTier('tier-1', form({ name: 'Migros SA' }));
        expect(store.items[0]?.name).toBe('Migros SA');

        const deleted: string[] = [];
        store.subscribeToDeleted((id) => deleted.push(id));
        await store.deleteTier('tier-1');
        expect(store.items).toHaveLength(0);
        expect(store.findByPublicId('tier-1')).toBeNull();
        expect(deleted).toEqual(['tier-1']);
    });

    it('refuse localement un doublon de nom (casse ignorée)', async () => {
        api.list.mockResolvedValue(page([migros]));
        const store = useTiersStore();
        await store.loadList();
        await expect(store.createTier(form({ name: 'migros' }))).rejects.toMatchObject({ status: 400, code: 'nameDuplicate' });
        expect(api.create).not.toHaveBeenCalled();
    });

    it('remonte le 400 serveur de suppression bloquée sans retirer le tier', async () => {
        api.list.mockResolvedValue(page([migros]));
        api.remove.mockRejectedValue(new AppError('Des transactions référencent ce tiers.', 400));
        const store = useTiersStore();
        await store.loadList();
        await expect(store.deleteTier('tier-1')).rejects.toMatchObject({ status: 400 });
        expect(store.items).toHaveLength(1);
        expect(store.error).toBe('Des transactions référencent ce tiers.');
    });

    it('normalise un 404 en message neutre', async () => {
        api.update.mockRejectedValue(new AppError('Not found', 404));
        const store = useTiersStore();
        await expect(store.updateTier('missing', form())).rejects.toMatchObject({ status: 404 });
        expect(store.error).toBe('Ce tiers n’est plus disponible.');
    });

    it('ignore un tierChanged correspondant à une mutation locale', async () => {
        api.list.mockResolvedValue(page([]));
        api.create.mockResolvedValue(migros);
        let listener: ((payload: { change: string; tierPublicId: string }) => void) | undefined;
        subscribeToTierChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = useTiersStore();
        await store.bootstrap();
        await store.createTier(form());
        api.list.mockClear();
        listener?.({ change: 'tierCreated', tierPublicId: 'tier-1' });
        await Promise.resolve();
        expect(api.list).not.toHaveBeenCalled();
    });

    it('refetch sur tierCreated d’un autre onglet et recharge le détail sur tierUpdated', async () => {
        api.list.mockResolvedValue(page([migros]));
        api.get.mockResolvedValue({ ...migros, name: 'Migros Genève' });
        let listener: ((payload: { change: string; tierPublicId: string }) => void) | undefined;
        subscribeToTierChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = useTiersStore();
        await store.bootstrap();
        api.list.mockClear();
        listener?.({ change: 'tierCreated', tierPublicId: 'tier-9' });
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
        });

        api.list.mockResolvedValue(page([{ ...migros, name: 'Migros Genève' }]));
        listener?.({ change: 'tierUpdated', tierPublicId: 'tier-1' });
        await vi.waitFor(() => {
            expect(api.get).toHaveBeenCalledWith('tier-1');
            expect(store.findByPublicId('tier-1')?.name).toBe('Migros Genève');
        });
    });

    it('tierDeleted retire le tier, prévient les abonnés et refetch', async () => {
        api.list.mockResolvedValue(page([migros, ubs]));
        let listener: ((payload: { change: string; tierPublicId: string }) => void) | undefined;
        subscribeToTierChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = useTiersStore();
        await store.bootstrap();
        const deleted: string[] = [];
        store.subscribeToDeleted((id) => deleted.push(id));
        api.list.mockClear();
        api.list.mockResolvedValue(page([ubs]));
        listener?.({ change: 'tierDeleted', tierPublicId: 'tier-1' });
        expect(store.items.map((item) => item.publicId)).toEqual(['tier-2']);
        expect(deleted).toEqual(['tier-1']);
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
        });
    });

    it('onAuthenticatedSession branche le realtime sans charger', () => {
        const store = useTiersStore();
        store.onAuthenticatedSession();
        expect(subscribeToTierChanged).toHaveBeenCalledTimes(1);
        expect(api.list).not.toHaveBeenCalled();
    });

    it('reset vide tout et coupe le realtime', async () => {
        const unsubscribe = vi.fn();
        subscribeToTierChanged.mockReturnValue(unsubscribe);
        api.list.mockResolvedValue(page([migros]));
        const store = useTiersStore();
        await store.bootstrap();
        store.reset();
        expect(store.items).toHaveLength(0);
        expect(store.initialized).toBe(false);
        expect(store.findByPublicId('tier-1')).toBeNull();
        expect(unsubscribe).toHaveBeenCalled();
    });
});
