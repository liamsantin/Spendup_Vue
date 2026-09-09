import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { AppError } from '@/utils/errors/app-error';
import type { FileDto, FileUsage } from '@/features/files/types';
import { FILE_QUOTA_EXCEEDED_MESSAGE } from '@/features/files/types';
import { fileToFormFields } from '@/features/files/payload';

const api = vi.hoisted(() => ({
    list: vi.fn(),
    get: vi.fn(),
    getContent: vi.fn(),
    usage: vi.fn(),
    upload: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
}));

vi.mock('@/features/files/api', () => ({
    filesApi: {
        list: (...args: unknown[]) => api.list(...args),
        get: (...args: unknown[]) => api.get(...args),
        getContent: (...args: unknown[]) => api.getContent(...args),
        usage: (...args: unknown[]) => api.usage(...args),
        upload: (...args: unknown[]) => api.upload(...args),
        update: (...args: unknown[]) => api.update(...args),
        remove: (...args: unknown[]) => api.remove(...args)
    }
}));

import { useFilesStore } from '@/features/files/stores/files-store';

const facture: FileDto = {
    publicId: 'file-1',
    nameOriginal: 'facture.pdf',
    extension: 'pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    sha256Hash: 'a'.repeat(64),
    source: 'upload',
    status: 'active',
    documentDate: null,
    description: null,
    createdAt: '2026-09-08T10:00:00Z',
    updatedAt: null
};

const contrat: FileDto = {
    ...facture,
    publicId: 'file-2',
    nameOriginal: 'contrat.pdf',
    sha256Hash: 'a'.repeat(64),
    createdAt: '2026-09-09T10:00:00Z'
};

const emptyUsage: FileUsage = {
    usedBytes: 0,
    quotaBytes: 104_857_600,
    remainingBytes: 104_857_600,
    isUnlimited: false,
    fileCount: 0,
    uniqueBlobCount: 0
};

function page(items: FileDto[], totalCount = items.length) {
    return { items, page: 1, pageSize: 50, totalCount };
}

describe('useFilesStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        api.usage.mockResolvedValue(emptyUsage);
    });

    it('charge la liste paginée', async () => {
        api.list.mockResolvedValue(page([facture, contrat]));
        const store = useFilesStore();
        await store.loadList();
        expect(api.list).toHaveBeenCalledWith({ page: 1, pageSize: 50 });
        expect(store.items.map((item) => item.publicId)).toEqual(['file-2', 'file-1']);
        expect(store.totalCount).toBe(2);
    });

    it('uploade deux fois le même PDF comme deux lignes', async () => {
        api.list.mockResolvedValue(page([]));
        api.upload.mockResolvedValueOnce(facture).mockResolvedValueOnce(contrat);
        const store = useFilesStore();
        await store.loadList();
        const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'same.pdf', { type: 'application/pdf' });
        await store.uploadFile(pdf);
        await store.uploadFile(pdf);
        expect(store.items).toHaveLength(2);
        expect(store.items.map((item) => item.publicId).sort()).toEqual(['file-1', 'file-2']);
        expect(new Set(store.items.map((item) => item.sha256Hash)).size).toBe(1);
    });

    it('recharge le quota après upload / delete, pas après un PATCH', async () => {
        api.list.mockResolvedValue(page([facture]));
        api.upload.mockResolvedValue(contrat);
        api.update.mockResolvedValue({ ...facture, nameOriginal: 'facture-2026.pdf' });
        api.remove.mockResolvedValue(undefined);
        api.usage
            .mockResolvedValueOnce({ ...emptyUsage, fileCount: 2, uniqueBlobCount: 1, usedBytes: 2048, remainingBytes: 104_855_552 })
            .mockResolvedValueOnce(emptyUsage);

        const store = useFilesStore();
        await store.loadList();
        expect(api.usage).not.toHaveBeenCalled();

        const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'contrat.pdf', { type: 'application/pdf' });
        await store.uploadFile(pdf);
        expect(api.usage).toHaveBeenCalledTimes(1);
        expect(store.usage?.fileCount).toBe(2);

        await store.updateFile('file-1', { ...fileToFormFields(facture), nameOriginal: 'facture-2026.pdf' });
        expect(api.usage).toHaveBeenCalledTimes(1);

        await store.deleteFile('file-1');
        expect(api.usage).toHaveBeenCalledTimes(2);
        expect(store.usage?.fileCount).toBe(0);
    });

    it('recharge le quota après un 400 quota dépassé', async () => {
        api.upload.mockRejectedValue(new AppError(FILE_QUOTA_EXCEEDED_MESSAGE, 400));
        const store = useFilesStore();
        const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'gros.pdf', { type: 'application/pdf' });
        await expect(store.uploadFile(pdf)).rejects.toMatchObject({ status: 400, message: FILE_QUOTA_EXCEEDED_MESSAGE });
        expect(api.usage).toHaveBeenCalledTimes(1);
    });

    it('met à jour les métadonnées en PATCH partiel et supprime en 204', async () => {
        api.list.mockResolvedValue(page([facture]));
        api.update.mockResolvedValue({ ...facture, nameOriginal: 'facture-2026.pdf', description: null });
        api.remove.mockResolvedValue(undefined);

        const store = useFilesStore();
        await store.loadList();
        await store.updateFile('file-1', { ...fileToFormFields(facture), nameOriginal: 'facture-2026.pdf' });
        expect(api.update).toHaveBeenCalledWith('file-1', { nameOriginal: 'facture-2026.pdf' });
        expect(store.findByPublicId('file-1')?.nameOriginal).toBe('facture-2026.pdf');

        await store.deleteFile('file-1');
        expect(store.items).toHaveLength(0);
        expect(store.findByPublicId('file-1')).toBeNull();
    });

    it('retire localement un 404 et mémorise le message', async () => {
        api.list.mockResolvedValue(page([facture]));
        api.remove.mockRejectedValue(new AppError('gone', 404));
        const store = useFilesStore();
        await store.loadList();
        await expect(store.deleteFile('file-1')).rejects.toMatchObject({ status: 404 });
        expect(store.items).toHaveLength(0);
        expect(store.error).toBe('Ce fichier n’est plus disponible.');
        expect(api.usage).not.toHaveBeenCalled();
    });

    it('reset vide le cache', async () => {
        api.list.mockResolvedValue(page([facture]));
        const store = useFilesStore();
        await store.bootstrap();
        await store.loadUsage();
        expect(store.usage).not.toBeNull();
        store.reset();
        expect(store.items).toHaveLength(0);
        expect(store.initialized).toBe(false);
        expect(store.findByPublicId('file-1')).toBeNull();
        expect(store.usage).toBeNull();
    });
});
