import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { AppError } from '@/utils/errors/app-error';
import type { Category } from '@/features/categories/types';
import type { CategoryFormFields } from '@/features/categories/payload';

const api = vi.hoisted(() => ({
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
}));

const txApi = vi.hoisted(() => ({
    list: vi.fn()
}));

const subscribeToCategoryChanged = vi.fn();

vi.mock('@/features/categories/api', () => ({
    categoriesApi: {
        list: (...args: unknown[]) => api.list(...args),
        get: (...args: unknown[]) => api.get(...args),
        create: (...args: unknown[]) => api.create(...args),
        update: (...args: unknown[]) => api.update(...args),
        remove: (...args: unknown[]) => api.remove(...args)
    }
}));

vi.mock('@/features/transactions/api', () => ({
    transactionsApi: {
        list: (...args: unknown[]) => txApi.list(...args)
    }
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({
        subscribeToCategoryChanged
    })
}));

import { useCategoriesStore } from '@/features/categories/stores/categories-store';

const logement: Category = {
    publicId: 'cat-1',
    name: 'Logement',
    type: 'depense',
    color: '#2a9d8f',
    icone: 'home',
    parentPublicId: null,
    createdAt: '2026-09-07T14:32:10+02:00',
    updatedAt: null,
    children: []
};

function form(partial: Partial<CategoryFormFields> = {}): CategoryFormFields {
    return {
        name: 'Logement',
        type: 'depense',
        color: '#2A9D8F',
        icone: 'home',
        parentPublicId: '',
        ...partial
    };
}

describe('useCategoriesStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        txApi.list.mockReset();
        subscribeToCategoryChanged.mockReset().mockReturnValue(() => undefined);
    });

    it('charge l’arbre sans filtre et la liste filtrée par type', async () => {
        api.list.mockResolvedValue({ items: [logement], totalCount: 1 });
        const store = useCategoriesStore();
        await store.loadList();
        expect(api.list).toHaveBeenCalledWith({ type: undefined });
        expect(store.items).toHaveLength(1);

        api.list.mockResolvedValue({ items: [logement], totalCount: 1 });
        await store.loadList({ type: 'depense', force: true });
        expect(api.list).toHaveBeenLastCalledWith({ type: 'depense' });
    });

    it('crée, met à jour et supprime', async () => {
        api.list.mockResolvedValue({ items: [], totalCount: 0 });
        api.create.mockResolvedValue(logement);
        api.update.mockResolvedValue({ ...logement, name: 'Maison' });
        api.remove.mockResolvedValue(undefined);

        const store = useCategoriesStore();
        await store.loadList();
        const created = await store.createCategory(form());
        expect(created.publicId).toBe('cat-1');
        expect(store.items).toHaveLength(1);

        await store.updateCategory('cat-1', form({ name: 'Maison' }));
        expect(store.items[0]?.name).toBe('Maison');

        await store.deleteCategory('cat-1');
        expect(store.items).toHaveLength(0);
        expect(api.remove).toHaveBeenCalledWith('cat-1');
    });

    it('rafraîchit l’arbre sur 404', async () => {
        api.update.mockRejectedValue(new AppError('Catégorie introuvable.', 404));
        const store = useCategoriesStore();
        await expect(store.updateCategory('missing', form())).rejects.toMatchObject({ status: 404 });
        expect(store.error).toBe('Catégorie introuvable.');
    });

    it('ignore un categoryChanged correspondant à une mutation locale', async () => {
        api.list.mockResolvedValue({ items: [], totalCount: 0 });
        api.create.mockResolvedValue(logement);
        let listener: ((payload: { change: string; categoryPublicId: string }) => void) | undefined;
        subscribeToCategoryChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = useCategoriesStore();
        await store.bootstrap();
        await store.createCategory(form());
        api.list.mockClear();
        listener?.({ change: 'categoryCreated', categoryPublicId: 'cat-1' });
        await Promise.resolve();
        expect(api.list).not.toHaveBeenCalled();
    });

    it('refetch sur categoryChanged d’un autre onglet', async () => {
        api.list.mockResolvedValue({ items: [logement], totalCount: 1 });
        let listener: ((payload: { change: string; categoryPublicId: string }) => void) | undefined;
        subscribeToCategoryChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = useCategoriesStore();
        await store.bootstrap();
        api.list.mockClear();
        api.list.mockResolvedValue({ items: [logement], totalCount: 1 });
        listener?.({ change: 'categoryUpdated', categoryPublicId: 'cat-other' });
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
        });
    });

    it('onAuthenticatedSession branche le realtime sans charger', () => {
        const store = useCategoriesStore();
        store.onAuthenticatedSession();
        expect(subscribeToCategoryChanged).toHaveBeenCalled();
        expect(api.list).not.toHaveBeenCalled();
    });
});
