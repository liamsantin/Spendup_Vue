import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { AppError } from '@/utils/errors/app-error';
import type { Liability } from '@/features/liabilities/types';
import { emptyLiabilityFormFields, type LiabilityFormFields } from '@/features/liabilities/payload';

const api = vi.hoisted(() => ({
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setRemainingAmount: vi.fn(),
    remove: vi.fn()
}));

const subscribeToLiabilityChanged = vi.fn();

vi.mock('@/features/liabilities/api', () => ({
    liabilitiesApi: {
        list: (...args: unknown[]) => api.list(...args),
        get: (...args: unknown[]) => api.get(...args),
        create: (...args: unknown[]) => api.create(...args),
        update: (...args: unknown[]) => api.update(...args),
        setRemainingAmount: (...args: unknown[]) => api.setRemainingAmount(...args),
        remove: (...args: unknown[]) => api.remove(...args)
    }
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({
        subscribeToLiabilityChanged
    })
}));

import { useLiabilitiesStore } from '@/features/liabilities/stores/liabilities-store';

const mortgage: Liability = {
    publicId: 'l-1',
    name: 'Hypothèque',
    type: 'hypotheque',
    lenderTierPublicId: null,
    lenderTierName: null,
    assetPublicId: null,
    initialAmount: 500000,
    remainingAmount: 500000,
    repaidAmount: 0,
    percentRepaid: 0,
    currency: 'CHF',
    interestRate: 1.25,
    startDate: '2024-01-01',
    plannedEndDate: null,
    status: 'active',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: null
};

function form(partial: Partial<LiabilityFormFields> = {}): LiabilityFormFields {
    return {
        ...emptyLiabilityFormFields({ currency: 'CHF' }),
        name: 'Hypothèque',
        type: 'hypotheque',
        initialAmount: '500000',
        interestRate: '1.25',
        startDate: '2024-01-01',
        ...partial
    };
}

function page(items: Liability[], totalCount = items.length) {
    return { items, totalCount };
}

type Listener = (payload: { change: string; liabilityPublicId: string }) => void;

describe('useLiabilitiesStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        subscribeToLiabilityChanged.mockReset().mockReturnValue(() => undefined);
    });

    it('charge la liste et applique les filtres', async () => {
        api.list.mockResolvedValue(page([mortgage]));
        const store = useLiabilitiesStore();
        await store.loadList();
        expect(api.list).toHaveBeenCalledWith({ type: undefined, status: undefined });
        expect(store.items.map((item) => item.name)).toEqual(['Hypothèque']);

        await store.loadList({ status: 'active', type: 'hypotheque', force: true });
        expect(api.list).toHaveBeenLastCalledWith({ type: 'hypotheque', status: 'active' });
        expect(store.activeQuery).toEqual({ type: 'hypotheque', status: 'active' });
    });

    it('crée, met à jour, ajuste le restant et supprime', async () => {
        api.list.mockResolvedValue(page([]));
        api.create.mockResolvedValue(mortgage);
        api.update.mockResolvedValue({ ...mortgage, name: 'Hypothèque maison' });
        api.setRemainingAmount.mockResolvedValue({ ...mortgage, remainingAmount: 450000, repaidAmount: 50000, percentRepaid: 10 });
        api.remove.mockResolvedValue(undefined);

        const store = useLiabilitiesStore();
        await store.loadList();
        const created = await store.createLiability(form());
        expect(created.publicId).toBe('l-1');
        expect(store.items).toHaveLength(1);

        await store.updateLiability('l-1', form({ name: 'Hypothèque maison' }), { lockedCurrency: 'CHF' });
        expect(api.update).toHaveBeenLastCalledWith(
            'l-1',
            expect.objectContaining({ status: null, currency: 'CHF', remainingAmount: 500000 })
        );
        expect(store.items[0]?.name).toBe('Hypothèque maison');

        await store.setRemainingAmount('l-1', { remainingAmount: '450000' });
        expect(api.setRemainingAmount).toHaveBeenLastCalledWith('l-1', { remainingAmount: 450000 });
        expect(store.items[0]?.percentRepaid).toBe(10);

        const deleted: string[] = [];
        store.subscribeToDeleted((id) => deleted.push(id));
        await store.deleteLiability('l-1');
        expect(store.items).toHaveLength(0);
        expect(deleted).toEqual(['l-1']);
    });

    it('retire un passif annulé de la liste active', async () => {
        api.list.mockResolvedValue(page([mortgage]));
        api.update.mockResolvedValue({ ...mortgage, status: 'annule' });
        const store = useLiabilitiesStore();
        await store.loadList({ status: 'active' });
        await store.updateLiability('l-1', form({ cancel: true }), { lockedCurrency: 'CHF' });
        expect(store.items).toHaveLength(0);
        expect(store.findByPublicId('l-1')?.status).toBe('annule');
    });

    it('refuse un formulaire invalide sans appeler l’API', async () => {
        const store = useLiabilitiesStore();
        await expect(store.createLiability(form({ initialAmount: '0' }))).rejects.toMatchObject({ status: 400 });
        expect(api.create).not.toHaveBeenCalled();
    });

    it('normalise un 404 en message neutre', async () => {
        api.update.mockRejectedValue(new AppError('Not found', 404));
        const store = useLiabilitiesStore();
        await expect(store.updateLiability('missing', form(), { lockedCurrency: 'CHF' })).rejects.toMatchObject({ status: 404 });
        expect(store.error).toBe('Passif introuvable.');
    });

    it('ignore un liabilityChanged correspondant à une mutation locale', async () => {
        api.list.mockResolvedValue(page([]));
        api.create.mockResolvedValue(mortgage);
        let listener: Listener | undefined;
        subscribeToLiabilityChanged.mockImplementation((fn: Listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = useLiabilitiesStore();
        await store.bootstrap();
        await store.createLiability(form());
        api.list.mockClear();
        listener?.({ change: 'liabilityCreated', liabilityPublicId: 'l-1' });
        await Promise.resolve();
        expect(api.list).not.toHaveBeenCalled();
    });

    it('refetch sur liabilityCreated d’un autre onglet', async () => {
        api.list.mockResolvedValue(page([mortgage]));
        let listener: Listener | undefined;
        subscribeToLiabilityChanged.mockImplementation((fn: Listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = useLiabilitiesStore();
        await store.bootstrap();
        api.list.mockClear();
        listener?.({ change: 'liabilityCreated', liabilityPublicId: 'l-9' });
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
        });
    });

    it('retire localement un passif supprimé ailleurs', async () => {
        api.list.mockResolvedValue(page([mortgage]));
        let listener: Listener | undefined;
        subscribeToLiabilityChanged.mockImplementation((fn: Listener) => {
            listener = fn;
            return () => undefined;
        });
        const store = useLiabilitiesStore();
        await store.bootstrap();
        api.list.mockResolvedValue(page([]));
        listener?.({ change: 'liabilityDeleted', liabilityPublicId: 'l-1' });
        expect(store.findByPublicId('l-1')).toBeNull();
        expect(store.items).toHaveLength(0);
    });

    it('onAuthenticatedSession branche le realtime sans charger', () => {
        const store = useLiabilitiesStore();
        store.onAuthenticatedSession();
        store.onAuthenticatedSession();
        expect(subscribeToLiabilityChanged).toHaveBeenCalledTimes(1);
        expect(api.list).not.toHaveBeenCalled();
    });

    it('reset vide tout et coupe le realtime', async () => {
        const unsubscribe = vi.fn();
        subscribeToLiabilityChanged.mockReturnValue(unsubscribe);
        api.list.mockResolvedValue(page([mortgage]));
        const store = useLiabilitiesStore();
        await store.bootstrap();
        store.reset();
        expect(store.items).toHaveLength(0);
        expect(store.initialized).toBe(false);
        expect(store.findByPublicId('l-1')).toBeNull();
        expect(unsubscribe).toHaveBeenCalled();
    });
});
