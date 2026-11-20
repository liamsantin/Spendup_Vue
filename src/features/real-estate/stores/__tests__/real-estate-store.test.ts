import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { AppError } from '@/utils/errors/app-error';
import { emptyChargeFormFields, emptyUnitFormFields, type RealEstateUnitFormFields } from '@/features/real-estate/payload';
import type { RealEstateCharge, RealEstateUnit } from '@/features/real-estate/types';

const api = vi.hoisted(() => ({
    listUnits: vi.fn(),
    createUnit: vi.fn(),
    updateUnit: vi.fn(),
    removeUnit: vi.fn(),
    listCharges: vi.fn(),
    createCharge: vi.fn(),
    listRentals: vi.fn(),
    removeDocument: vi.fn()
}));

const fetchAsset = vi.hoisted(() => vi.fn());
const listIncomes = vi.hoisted(() => vi.fn());
const subscribeToAssetChanged = vi.fn();

vi.mock('@/features/real-estate/api', () => ({
    realEstateApi: new Proxy(
        {},
        {
            get:
                (_target, key: string) =>
                (...args: unknown[]) =>
                    (api as Record<string, (...a: unknown[]) => unknown>)[key]?.(...args)
        }
    )
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({ subscribeToAssetChanged }),
    parseAssetChangedPayload: (raw: unknown) => raw
}));

vi.mock('@/features/assets/stores/assets-store', () => ({
    useAssetsStore: () => ({ fetchAsset })
}));

vi.mock('@/features/recurring-payments', () => ({
    recurringIncomesApi: { list: (...args: unknown[]) => listIncomes(...args) }
}));

vi.mock('@/features/user-settings', () => ({
    useUserSettingsStore: () => ({ current: { timezone: 'Europe/Zurich', defaultCurrency: 'CHF' } })
}));

import { useRealEstateStore } from '@/features/real-estate/stores/real-estate-store';

const ASSET = 'a-1';

const studio: RealEstateUnit = {
    publicId: 'u-1',
    name: 'Studio',
    unitType: 'appartement',
    surfaceM2: 32,
    rooms: 1.5,
    floor: 0,
    isRentable: true,
    isOccupied: false,
    notes: null,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: null
};

const insurance: RealEstateCharge = {
    publicId: 'c-1',
    name: 'Assurance',
    chargeType: 'assuranceBatiment',
    amount: 1200,
    periodicity: 'annuelle',
    startDate: null,
    endDate: null,
    unitPublicId: null,
    tierPublicId: null,
    tierName: null,
    transactionPublicId: null,
    currency: 'CHF',
    monthlyEquivalent: 100,
    isCurrent: true,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: null
};

function unitForm(partial: Partial<RealEstateUnitFormFields> = {}): RealEstateUnitFormFields {
    return { ...emptyUnitFormFields(), name: 'Studio', surfaceM2: '32', rooms: '1.5', floor: '0', ...partial };
}

function list<T>(items: T[]) {
    return { items, totalCount: items.length };
}

async function flush() {
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

describe('useRealEstateStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        fetchAsset.mockReset().mockResolvedValue(null);
        listIncomes.mockReset();
        subscribeToAssetChanged.mockReset().mockReturnValue(() => undefined);
    });

    it('charge les lots par bien et met la liste en cache', async () => {
        api.listUnits.mockResolvedValue(list([studio]));
        const store = useRealEstateStore();
        await store.loadUnits(ASSET);
        expect(api.listUnits).toHaveBeenCalledWith(ASSET);
        expect(store.unitsFor(ASSET).map((unit) => unit.name)).toEqual(['Studio']);
        expect(store.isLoaded(ASSET, 'units')).toBe(true);
        expect(store.unitsFor('autre')).toEqual([]);

        await store.loadUnits(ASSET);
        expect(api.listUnits).toHaveBeenCalledTimes(1);
        await store.loadUnits(ASSET, true);
        expect(api.listUnits).toHaveBeenCalledTimes(2);
    });

    it('crée, met à jour et supprime un lot puis rafraîchit la synthèse du bien', async () => {
        api.listUnits.mockResolvedValue(list([]));
        api.createUnit.mockResolvedValue(studio);
        api.updateUnit.mockResolvedValue({ ...studio, name: 'Grand studio' });
        api.removeUnit.mockResolvedValue(undefined);

        const store = useRealEstateStore();
        await store.loadUnits(ASSET);
        await store.createUnit(ASSET, unitForm());
        expect(api.createUnit).toHaveBeenCalledWith(
            ASSET,
            expect.objectContaining({ name: 'Studio', surfaceM2: 32, rooms: 1.5, floor: 0 })
        );
        expect(store.unitsFor(ASSET)).toHaveLength(1);
        expect(fetchAsset).toHaveBeenLastCalledWith(ASSET, true);

        await store.updateUnit(ASSET, 'u-1', unitForm({ name: 'Grand studio' }));
        expect(store.unitsFor(ASSET)[0]?.name).toBe('Grand studio');

        await store.deleteUnit(ASSET, 'u-1');
        expect(store.unitsFor(ASSET)).toHaveLength(0);
        expect(fetchAsset).toHaveBeenCalledTimes(3);
    });

    it('refuse un payload invalide sans appeler l’API', async () => {
        const store = useRealEstateStore();
        await expect(store.createUnit(ASSET, unitForm({ name: ' ' }))).rejects.toMatchObject({ status: 400, code: 'nameRequired' });
        expect(api.createUnit).not.toHaveBeenCalled();
    });

    it('normalise un 404 en message neutre et retire l’élément', async () => {
        api.listCharges.mockResolvedValue(list([insurance]));
        api.createCharge.mockRejectedValue(new AppError('Not found', 404));
        const store = useRealEstateStore();
        await store.loadCharges(ASSET);

        api.removeDocument.mockRejectedValue(new AppError('Not found', 404));
        await expect(store.deleteDocument(ASSET, 'd-1')).rejects.toMatchObject({ status: 404 });
        expect(store.error).toBe('Document introuvable.');

        const fields = { ...emptyChargeFormFields(), name: 'Eau', chargeType: 'eau' as const, amount: '40' };
        await expect(store.createCharge(ASSET, fields)).rejects.toMatchObject({ status: 404 });
        expect(store.error).toBe('Bien introuvable.');
        // le 404 du bien purge son état local
        expect(store.chargesFor(ASSET)).toEqual([]);
    });

    it('filtre les baux par statut', async () => {
        api.listRentals.mockResolvedValue(list([]));
        const store = useRealEstateStore();
        await store.loadRentals(ASSET, { status: 'active' });
        expect(api.listRentals).toHaveBeenLastCalledWith(ASSET, { status: 'active' });
        expect(store.rentalsStatusFor(ASSET)).toBe('active');
        await store.loadRentals(ASSET);
        expect(api.listRentals).toHaveBeenLastCalledWith(ASSET, { status: undefined });
        expect(store.rentalsStatusFor(ASSET)).toBeNull();
    });

    it('ignore un assetRealEstateChanged issu d’une mutation locale', async () => {
        let listener: ((payload: { change: string; assetPublicId: string }) => void) | undefined;
        subscribeToAssetChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });
        api.listUnits.mockResolvedValue(list([]));
        api.createUnit.mockResolvedValue(studio);

        const store = useRealEstateStore();
        store.onAuthenticatedSession();
        await store.loadUnits(ASSET);
        await store.createUnit(ASSET, unitForm());
        api.listUnits.mockClear();

        listener?.({ change: 'assetRealEstateChanged', assetPublicId: ASSET });
        await flush();
        expect(api.listUnits).not.toHaveBeenCalled();
    });

    it('recharge les sous-listes chargées sur un événement externe et purge sur assetDeleted', async () => {
        let listener: ((payload: { change: string; assetPublicId: string }) => void) | undefined;
        subscribeToAssetChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });
        api.listUnits.mockResolvedValue(list([studio]));
        api.listCharges.mockResolvedValue(list([insurance]));

        const store = useRealEstateStore();
        await store.bootstrap();
        await store.loadUnits(ASSET);
        api.listUnits.mockClear();

        // bien jamais ouvert : ignoré
        listener?.({ change: 'assetRealEstateChanged', assetPublicId: 'autre' });
        listener?.({ change: 'assetRealEstateChanged', assetPublicId: ASSET });
        listener?.({ change: 'assetUpdated', assetPublicId: ASSET });
        await flush();
        expect(api.listUnits).toHaveBeenCalledTimes(1);
        expect(api.listCharges).not.toHaveBeenCalled();

        listener?.({ change: 'assetDeleted', assetPublicId: ASSET });
        expect(store.unitsFor(ASSET)).toEqual([]);
        expect(store.isLoaded(ASSET, 'units')).toBe(false);
    });

    it('charge les revenus récurrents une seule fois', async () => {
        listIncomes.mockResolvedValue({ items: [{ publicId: 'ri-1', name: 'Loyer' }], totalCount: 1 });
        const store = useRealEstateStore();
        await store.loadRecurringIncomes();
        await store.loadRecurringIncomes();
        expect(listIncomes).toHaveBeenCalledTimes(1);
        expect(listIncomes).toHaveBeenCalledWith({ pageSize: 200 });
        expect(store.recurringIncomes.map((income) => income.name)).toEqual(['Loyer']);
    });

    it('reset vide l’état et coupe le realtime', async () => {
        const unsubscribe = vi.fn();
        subscribeToAssetChanged.mockReturnValue(unsubscribe);
        api.listUnits.mockResolvedValue(list([studio]));
        const store = useRealEstateStore();
        store.onAuthenticatedSession();
        await store.loadUnits(ASSET);
        store.reset();
        expect(store.unitsFor(ASSET)).toEqual([]);
        expect(unsubscribe).toHaveBeenCalled();
    });
});
