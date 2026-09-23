import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { AppError } from '@/utils/errors/app-error';
import type { Tag } from '@/features/tags/types';
import type { TagFormFields } from '@/features/tags/payload';

const api = vi.hoisted(() => ({
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
}));

const subscribeToTagChanged = vi.fn();

vi.mock('@/features/tags/api', () => ({
    tagsApi: {
        list: (...args: unknown[]) => api.list(...args),
        get: (...args: unknown[]) => api.get(...args),
        create: (...args: unknown[]) => api.create(...args),
        update: (...args: unknown[]) => api.update(...args),
        remove: (...args: unknown[]) => api.remove(...args)
    }
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({
        subscribeToTagChanged
    })
}));

import { useTagsStore } from '@/features/tags/stores/tags-store';

const urgent: Tag = {
    publicId: 't-1',
    name: 'Urgent',
    color: '#ef4444',
    transactionCount: 2,
    recurringExpenseCount: 1,
    createdAt: '2026-09-23T19:00:00Z',
    updatedAt: null
};

function form(partial: Partial<TagFormFields> = {}): TagFormFields {
    return { name: 'Urgent', color: '#EF4444', ...partial };
}

describe('useTagsStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        subscribeToTagChanged.mockReset().mockReturnValue(() => undefined);
    });

    it('charge la liste non paginée', async () => {
        api.list.mockResolvedValue({ items: [urgent], totalCount: 1 });
        const store = useTagsStore();
        await store.loadList();
        expect(api.list).toHaveBeenCalled();
        expect(store.items).toHaveLength(1);
        expect(store.totalCount).toBe(1);
    });

    it('crée, met à jour et supprime', async () => {
        api.list.mockResolvedValue({ items: [], totalCount: 0 });
        api.create.mockResolvedValue(urgent);
        api.update.mockResolvedValue({ ...urgent, name: 'Prioritaire', color: null });
        api.remove.mockResolvedValue(undefined);

        const store = useTagsStore();
        await store.loadList();
        const created = await store.createTag(form());
        expect(created.publicId).toBe('t-1');
        expect(store.items).toHaveLength(1);

        await store.updateTag('t-1', form({ name: 'Prioritaire', color: null }));
        expect(store.items[0]?.name).toBe('Prioritaire');
        expect(store.items[0]?.color).toBeNull();

        const deleted: string[] = [];
        store.subscribeToDeleted((id) => deleted.push(id));
        await store.deleteTag('t-1');
        expect(store.items).toHaveLength(0);
        expect(deleted).toEqual(['t-1']);
        expect(api.remove).toHaveBeenCalledWith('t-1');
    });

    it('normalise un 404 en message neutre et retire le tag', async () => {
        api.update.mockRejectedValue(new AppError('Tag introuvable.', 404));
        const store = useTagsStore();
        const deleted: string[] = [];
        store.subscribeToDeleted((id) => deleted.push(id));
        await expect(store.updateTag('missing', form())).rejects.toMatchObject({ status: 404 });
        expect(store.error).toBe('Tag introuvable.');
        expect(deleted).toEqual(['missing']);
    });

    it('ignore un tagChanged correspondant à une mutation locale', async () => {
        api.list.mockResolvedValue({ items: [], totalCount: 0 });
        api.create.mockResolvedValue(urgent);
        let listener: ((payload: { change: string; tagPublicId: string }) => void) | undefined;
        subscribeToTagChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = useTagsStore();
        await store.bootstrap();
        await store.createTag(form());
        api.list.mockClear();
        listener?.({ change: 'tagCreated', tagPublicId: 't-1' });
        await Promise.resolve();
        expect(api.list).not.toHaveBeenCalled();
    });

    it('refetch sur tagChanged d’un autre onglet', async () => {
        api.list.mockResolvedValue({ items: [urgent], totalCount: 1 });
        let listener: ((payload: { change: string; tagPublicId: string }) => void) | undefined;
        subscribeToTagChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = useTagsStore();
        await store.bootstrap();
        api.list.mockClear();
        api.list.mockResolvedValue({ items: [urgent], totalCount: 1 });
        listener?.({ change: 'tagUpdated', tagPublicId: 't-other' });
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
        });
    });

    it('onAuthenticatedSession branche le realtime sans charger', () => {
        const store = useTagsStore();
        store.onAuthenticatedSession();
        expect(subscribeToTagChanged).toHaveBeenCalled();
        expect(api.list).not.toHaveBeenCalled();
    });
});
