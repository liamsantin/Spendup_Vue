import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileDto } from '@/features/files/types';

const api = vi.hoisted(() => ({
    list: vi.fn(),
    remove: vi.fn(),
    usage: vi.fn()
}));

vi.mock('@/features/files/api', () => ({
    filesApi: {
        list: (...args: unknown[]) => api.list(...args),
        remove: (...args: unknown[]) => api.remove(...args),
        usage: (...args: unknown[]) => api.usage(...args)
    }
}));

import { createFilesState, nextPageFromLoaded } from '@/features/files/stores/internal/files-state';
import { createFilesCrud } from '@/features/files/stores/internal/files-crud';

function file(index: number): FileDto {
    return {
        publicId: `file-${index}`,
        nameOriginal: `doc-${index}.pdf`,
        extension: 'pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        sha256Hash: 'a'.repeat(64),
        source: 'upload',
        status: 'active',
        documentDate: null,
        description: null,
        createdAt: `2026-09-${String(28 - index).padStart(2, '0')}T10:00:00Z`,
        updatedAt: null
    };
}

function setup() {
    const state = createFilesState();
    const crud = createFilesCrud(state);
    return { state, crud };
}

describe('files-crud', () => {
    beforeEach(() => {
        Object.values(api).forEach((mock) => mock.mockReset());
        api.usage.mockResolvedValue(null);
    });

    it('nextPageFromLoaded déduit la page du nombre chargé', () => {
        expect(nextPageFromLoaded(0, 2)).toBe(1);
        expect(nextPageFromLoaded(2, 2)).toBe(2);
        expect(nextPageFromLoaded(3, 2)).toBe(2);
        expect(nextPageFromLoaded(4, 2)).toBe(3);
    });

    it('loadList supplantant un loadMore en vol libère loadingMore', async () => {
        const { state, crud } = setup();
        api.list.mockResolvedValueOnce({ items: [file(1), file(2)], page: 1, pageSize: 2, totalCount: 4 });
        await crud.loadList({ pageSize: 2 });

        let resolveMore: ((value: unknown) => void) | undefined;
        api.list.mockImplementationOnce(() => new Promise((resolve) => (resolveMore = resolve)));
        const more = crud.loadMore();
        expect(state.loadingMore.value).toBe(true);

        api.list.mockResolvedValueOnce({ items: [file(1), file(2)], page: 1, pageSize: 2, totalCount: 4 });
        await crud.loadList({ pageSize: 2, force: true });
        expect(state.loadingMore.value).toBe(false);

        // Réponse tardive ignorée (seq), sans rebloquer le verrou.
        resolveMore?.({ items: [file(3), file(4)], page: 2, pageSize: 2, totalCount: 4 });
        await more;
        expect(state.loadingMore.value).toBe(false);
        expect(state.items.value).toHaveLength(2);

        api.list.mockResolvedValueOnce({ items: [file(3), file(4)], page: 2, pageSize: 2, totalCount: 4 });
        await crud.loadMore();
        expect(state.items.value).toHaveLength(4);
    });

    it('après une suppression locale, loadMore recharge la page décalée sans sauter d’élément', async () => {
        const { state, crud } = setup();
        api.list.mockResolvedValueOnce({ items: [file(1), file(2)], page: 1, pageSize: 2, totalCount: 5 });
        await crud.loadList({ pageSize: 2 });
        api.list.mockResolvedValueOnce({ items: [file(3), file(4)], page: 2, pageSize: 2, totalCount: 5 });
        await crud.loadMore();
        expect(state.items.value).toHaveLength(4);

        api.remove.mockResolvedValueOnce(undefined);
        await crud.deleteFile('file-2');
        expect(state.totalCount.value).toBe(4);

        // Serveur : [1, 3, 4, 5] → page 2 (taille 2) = [4, 5].
        api.list.mockResolvedValueOnce({ items: [file(4), file(5)], page: 2, pageSize: 2, totalCount: 4 });
        await crud.loadMore();
        expect(api.list).toHaveBeenLastCalledWith({ page: 2, pageSize: 2 });
        expect(state.items.value.map((f) => f.publicId).sort()).toEqual(['file-1', 'file-3', 'file-4', 'file-5']);
        expect(state.hasMore.value).toBe(false);
    });

    it('une page vide arrête hasMore', async () => {
        const { state, crud } = setup();
        api.list.mockResolvedValueOnce({ items: [file(1), file(2)], page: 1, pageSize: 2, totalCount: 3 });
        await crud.loadList({ pageSize: 2 });
        expect(state.hasMore.value).toBe(true);
        api.list.mockResolvedValueOnce({ items: [], page: 2, pageSize: 2, totalCount: 3 });
        await crud.loadMore();
        expect(state.hasMore.value).toBe(false);
    });
});
