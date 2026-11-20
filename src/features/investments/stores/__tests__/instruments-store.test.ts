import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { AppError } from '@/utils/errors/app-error';
import { emptyInstrumentFormFields, type InstrumentFormFields } from '@/features/investments/payload';
import type { Instrument } from '@/features/investments/types';

const api = vi.hoisted(() => ({
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setPrice: vi.fn(),
    remove: vi.fn()
}));

vi.mock('@/features/investments/api', () => ({
    instrumentsApi: {
        list: (...args: unknown[]) => api.list(...args),
        get: (...args: unknown[]) => api.get(...args),
        create: (...args: unknown[]) => api.create(...args),
        update: (...args: unknown[]) => api.update(...args),
        setPrice: (...args: unknown[]) => api.setPrice(...args),
        remove: (...args: unknown[]) => api.remove(...args)
    },
    investmentsApi: {}
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({ subscribeToAccountChanged: vi.fn(() => () => undefined) })
}));

vi.mock('@/features/accounts', () => ({
    useAccountsStore: () => ({ loadAccountDetail: vi.fn() })
}));

import { useInstrumentsStore } from '@/features/investments/stores/instruments-store';

const nestle: Instrument = {
    publicId: 'i-1',
    symbol: 'nesn',
    name: 'Nestlé',
    type: 'action',
    currency: 'CHF',
    isin: '',
    lastPrice: null,
    lastPriceDate: null,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: null
};

function form(partial: Partial<InstrumentFormFields> = {}): InstrumentFormFields {
    return { ...emptyInstrumentFormFields({ currency: 'CHF', type: 'action' }), symbol: 'NESN', name: 'Nestlé', ...partial };
}

function page(items: Instrument[]) {
    return { items, totalCount: items.length, page: 1, pageSize: 50 };
}

describe('useInstrumentsStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
    });

    it('charge une page normalisée et indexe les instruments', async () => {
        api.list.mockResolvedValue(page([nestle]));
        const store = useInstrumentsStore();
        await store.loadList({ search: '  nes ', type: 'action' });
        expect(api.list).toHaveBeenCalledWith({ search: 'nes', type: 'action', page: 1, pageSize: 50 });
        expect(store.items[0]?.symbol).toBe('NESN');
        expect(store.items[0]?.isin).toBeNull();
        expect(store.findByPublicId('i-1')?.name).toBe('Nestlé');
    });

    it('recherche pour le sélecteur sans toucher la liste principale', async () => {
        api.list.mockResolvedValue(page([nestle]));
        const store = useInstrumentsStore();
        const found = await store.searchForPicker('nes');
        expect(found.map((item) => item.symbol)).toEqual(['NESN']);
        expect(api.list).toHaveBeenCalledWith({ search: 'nes', pageSize: 50 });
        expect(store.items).toHaveLength(0);
        expect(store.findByPublicId('i-1')).not.toBeNull();
    });

    it('crée, modifie, met à jour le cours et supprime', async () => {
        api.create.mockResolvedValue(nestle);
        api.update.mockResolvedValue({ ...nestle, name: 'Nestlé SA' });
        api.setPrice.mockResolvedValue({ ...nestle, lastPrice: 92.5, lastPriceDate: '2026-10-27' });
        api.remove.mockResolvedValue(undefined);
        const store = useInstrumentsStore();

        await store.createInstrument(form({ lastPrice: '90', lastPriceDate: '2026-10-20' }), { today: '2026-10-27' });
        expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ symbol: 'NESN', lastPrice: 90, lastPriceDate: '2026-10-20' }));

        await store.updateInstrument('i-1', form({ name: 'Nestlé SA' }));
        expect(api.update).toHaveBeenCalledWith('i-1', { symbol: 'NESN', name: 'Nestlé SA', type: 'action', currency: 'CHF', isin: null });
        expect(store.findByPublicId('i-1')?.name).toBe('Nestlé SA');

        const priced = await store.setPrice('i-1', { price: '92.5', date: '2026-10-27' }, { today: '2026-10-27' });
        expect(api.setPrice).toHaveBeenCalledWith('i-1', { price: 92.5, date: '2026-10-27' });
        expect(priced.lastPrice).toBe(92.5);

        await store.deleteInstrument('i-1');
        expect(store.findByPublicId('i-1')).toBeNull();
    });

    it('refuse un cours daté dans le futur sans appeler l’API', async () => {
        const store = useInstrumentsStore();
        await expect(store.setPrice('i-1', { price: '92', date: '2026-10-28' }, { today: '2026-10-27' })).rejects.toMatchObject({
            status: 400
        });
        expect(api.setPrice).not.toHaveBeenCalled();
        expect(store.error).toBe('La date du cours ne peut pas être dans le futur.');
    });

    it('400 serveur affiché tel quel (champs figés)', async () => {
        api.update.mockRejectedValue(new AppError('Le symbole ne peut plus être modifié : des opérations existent.', 400));
        const store = useInstrumentsStore();
        await expect(store.updateInstrument('i-1', form({ symbol: 'NESN2' }))).rejects.toMatchObject({ status: 400 });
        expect(store.error).toBe('Le symbole ne peut plus être modifié : des opérations existent.');
    });

    it('404 neutre et oubli local', async () => {
        api.list.mockResolvedValue(page([nestle]));
        api.remove.mockRejectedValue(new AppError('Not found', 404));
        const store = useInstrumentsStore();
        await store.loadList();
        await expect(store.deleteInstrument('i-1')).rejects.toMatchObject({ status: 404 });
        expect(store.error).toBe('Instrument introuvable.');
        expect(store.items).toHaveLength(0);
    });

    it('onAuthenticatedSession ne charge rien ; reset vide tout', async () => {
        api.list.mockResolvedValue(page([nestle]));
        const store = useInstrumentsStore();
        store.onAuthenticatedSession();
        expect(api.list).not.toHaveBeenCalled();
        await store.loadList();
        store.reset();
        expect(store.items).toHaveLength(0);
        expect(store.initialized).toBe(false);
        expect(store.findByPublicId('i-1')).toBeNull();
    });
});
