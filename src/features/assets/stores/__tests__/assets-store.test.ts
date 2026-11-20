import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { AppError } from '@/utils/errors/app-error';
import type { Asset } from '@/features/assets/types';
import { emptyAssetFormFields, type AssetFormFields } from '@/features/assets/payload';

const api = vi.hoisted(() => ({
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    listValuations: vi.fn(),
    saveValuation: vi.fn(),
    removeValuation: vi.fn(),
    listMileages: vi.fn(),
    saveMileage: vi.fn(),
    removeMileage: vi.fn(),
    listMaintenances: vi.fn(),
    createMaintenance: vi.fn(),
    updateMaintenance: vi.fn(),
    removeMaintenance: vi.fn()
}));

const subscribeToAssetChanged = vi.fn();
const subscribeToAccountChanged = vi.fn();

vi.mock('@/features/assets/api', () => ({
    assetsApi: Object.fromEntries(Object.entries(api).map(([name, mock]) => [name, (...args: unknown[]) => mock(...args)]))
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({
        subscribeToAssetChanged,
        subscribeToAccountChanged
    })
}));

import { useAssetsStore } from '@/features/assets/stores/assets-store';

const car: Asset = {
    publicId: 'a-1',
    name: 'Ma voiture',
    type: 'vehicule',
    estimatedValue: 12000,
    currency: 'CHF',
    acquisitionDate: '2021-03-15',
    acquisitionPrice: 24000,
    description: null,
    notes: null,
    isActive: true,
    lastValuationDate: '2026-10-26',
    isValueFromAccount: false,
    vehicle: {
        brand: 'Toyota',
        model: 'Yaris',
        vehicleType: 'voiture',
        fuel: 'hybride',
        firstRegistrationYear: 2021,
        plate: null,
        currentMileage: 42000
    },
    crypto: null,
    valuableItem: null,
    savingsAccount: null,
    other: null,
    realEstate: null,
    createdAt: '2026-10-26T10:00:00Z',
    updatedAt: null
};

const savings: Asset = {
    ...car,
    publicId: 'a-2',
    name: 'Épargne',
    type: 'compteEpargne',
    estimatedValue: 5000,
    isValueFromAccount: true,
    vehicle: null,
    savingsAccount: { savingsType: 'epargneClassique', accountPublicId: 'acc-1', interestRate: null, isBlocked: false, releaseDate: null }
};

function form(partial: Partial<AssetFormFields> = {}): AssetFormFields {
    const fields = emptyAssetFormFields({ type: 'vehicule', currency: 'CHF' });
    fields.name = 'Ma voiture';
    fields.estimatedValue = '12000';
    fields.vehicle = { ...fields.vehicle, brand: 'Toyota', model: 'Yaris', vehicleType: 'voiture' };
    return { ...fields, ...partial };
}

function page<T>(items: T[], totalCount = items.length) {
    return { items, totalCount };
}

type Listener<T> = ((payload: T) => void) | undefined;

describe('useAssetsStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        subscribeToAssetChanged.mockReset().mockReturnValue(() => undefined);
        subscribeToAccountChanged.mockReset().mockReturnValue(() => undefined);
    });

    it('charge la liste et applique les filtres', async () => {
        api.list.mockResolvedValue(page([car]));
        const store = useAssetsStore();
        await store.loadList();
        expect(api.list).toHaveBeenCalledWith({ type: undefined, active: undefined });
        expect(store.items.map((item) => item.name)).toEqual(['Ma voiture']);
        expect(store.hasItems).toBe(true);

        api.list.mockResolvedValue(page([]));
        await store.loadList({ type: 'crypto', active: false, force: true });
        expect(api.list).toHaveBeenLastCalledWith({ type: 'crypto', active: false });
        expect(store.activeQuery).toEqual({ type: 'crypto', active: false });
        expect(store.items).toHaveLength(0);
        expect(store.findByPublicId('a-1')?.name).toBe('Ma voiture');
    });

    it('crée, met à jour et supprime', async () => {
        api.list.mockResolvedValue(page([]));
        api.create.mockResolvedValue(car);
        api.update.mockResolvedValue({ ...car, isActive: false });
        api.remove.mockResolvedValue(undefined);

        const store = useAssetsStore();
        await store.loadList({ active: true });
        const created = await store.createAsset(form());
        expect(created.publicId).toBe('a-1');
        expect(store.items).toHaveLength(1);

        // Cédé : sort de la liste « actifs ».
        await store.updateAsset('a-1', { ...form(), sold: true });
        expect(api.update).toHaveBeenLastCalledWith('a-1', expect.objectContaining({ isActive: false, currency: 'CHF' }));
        expect(store.items).toHaveLength(0);

        const deleted: string[] = [];
        store.subscribeToDeleted((id) => deleted.push(id));
        await store.deleteAsset('a-1');
        expect(store.findByPublicId('a-1')).toBeNull();
        expect(deleted).toEqual(['a-1']);
    });

    it('refuse un formulaire invalide sans appeler l’API', async () => {
        const store = useAssetsStore();
        await expect(store.createAsset(form({ name: '' }))).rejects.toMatchObject({ status: 400, code: 'nameRequired' });
        expect(api.create).not.toHaveBeenCalled();
    });

    it('normalise un 404 en message neutre et retire l’actif', async () => {
        api.list.mockResolvedValue(page([car]));
        api.update.mockRejectedValue(new AppError('Not found', 404));
        const store = useAssetsStore();
        await store.loadList();
        await expect(store.updateAsset('a-1', form())).rejects.toMatchObject({ status: 404 });
        expect(store.error).toBe('Actif introuvable.');
        expect(store.items).toHaveLength(0);
    });

    it('enregistre une valorisation puis refetch l’actif', async () => {
        api.list.mockResolvedValue(page([car]));
        api.listValuations.mockResolvedValue(
            page([{ valuationDate: '2026-10-26', value: 12000, source: 'manuelle', createdAt: '', updatedAt: null }])
        );
        api.saveValuation.mockResolvedValue({
            valuationDate: '2026-10-27',
            value: 11500,
            source: 'manuelle',
            createdAt: '',
            updatedAt: null
        });
        api.get.mockResolvedValue({ ...car, estimatedValue: 11500, lastValuationDate: '2026-10-27' });

        const store = useAssetsStore();
        await store.loadList();
        await store.loadValuations('a-1');
        await store.saveValuation('a-1', { valuationDate: '2026-10-27', value: '11500' }, { today: '2026-10-27' });
        expect(store.valuationsFor('a-1').map((item) => item.valuationDate)).toEqual(['2026-10-27', '2026-10-26']);
        expect(api.get).toHaveBeenCalledWith('a-1');
        expect(store.items[0]?.estimatedValue).toBe(11500);
    });

    it('ignore un assetChanged correspondant à une mutation locale', async () => {
        api.list.mockResolvedValue(page([]));
        api.create.mockResolvedValue(car);
        let listener: Listener<{ change: string; assetPublicId: string }>;
        subscribeToAssetChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = useAssetsStore();
        await store.bootstrap();
        await store.createAsset(form());
        api.list.mockClear();
        listener?.({ change: 'assetCreated', assetPublicId: 'a-1' });
        await Promise.resolve();
        expect(api.list).not.toHaveBeenCalled();
    });

    it('refetch la liste sur assetCreated externe, le détail sur assetUpdated, retire sur assetDeleted', async () => {
        api.list.mockResolvedValue(page([car]));
        api.get.mockResolvedValue({ ...car, name: 'Voiture renommée' });
        let listener: Listener<{ change: string; assetPublicId: string }>;
        subscribeToAssetChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = useAssetsStore();
        await store.bootstrap();
        api.list.mockClear();

        listener?.({ change: 'assetCreated', assetPublicId: 'a-9' });
        await Promise.resolve();
        await Promise.resolve();
        expect(api.list).toHaveBeenCalledTimes(1);

        api.list.mockClear();
        listener?.({ change: 'assetUpdated', assetPublicId: 'a-1' });
        await vi.waitFor(() => expect(store.items[0]?.name).toBe('Voiture renommée'));
        expect(api.get).toHaveBeenCalledWith('a-1');
        expect(api.list).not.toHaveBeenCalled();

        const deleted: string[] = [];
        store.subscribeToDeleted((id) => deleted.push(id));
        listener?.({ change: 'assetDeleted', assetPublicId: 'a-1' });
        expect(store.findByPublicId('a-1')).toBeNull();
        expect(deleted).toEqual(['a-1']);
    });

    it('refetch une épargne adossée sur accountChanged de son compte uniquement', async () => {
        api.list.mockResolvedValue(page([car, savings]));
        api.get.mockResolvedValue({ ...savings, estimatedValue: 5200 });
        let listener: Listener<{ change: string; accountPublicId: string }>;
        subscribeToAccountChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = useAssetsStore();
        await store.bootstrap();

        listener?.({ change: 'transactionCreated', accountPublicId: 'acc-other' });
        await Promise.resolve();
        expect(api.get).not.toHaveBeenCalled();

        listener?.({ change: 'transactionCreated', accountPublicId: 'acc-1' });
        await vi.waitFor(() => expect(store.findByPublicId('a-2')?.estimatedValue).toBe(5200));
        expect(api.get).toHaveBeenCalledTimes(1);
        expect(api.get).toHaveBeenCalledWith('a-2');
    });

    it('onAuthenticatedSession branche le temps réel sans charger la liste', () => {
        const store = useAssetsStore();
        store.onAuthenticatedSession();
        expect(subscribeToAssetChanged).toHaveBeenCalledTimes(1);
        expect(subscribeToAccountChanged).toHaveBeenCalledTimes(1);
        expect(api.list).not.toHaveBeenCalled();
        store.reset();
        expect(store.initialized).toBe(false);
    });
});
