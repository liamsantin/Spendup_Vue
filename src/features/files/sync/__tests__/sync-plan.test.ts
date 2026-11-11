import { describe, expect, it } from 'vitest';
import type { FileDto } from '@/features/files/types';
import { fileSyncStatus, localFileName, parseIndex, planUploads, type PlanOptions } from '@/features/files/sync/sync-plan';

const ME = 'device-me';

function file(id: string, createdAt: string, sizeBytes: number, extra: Partial<FileDto> = {}): FileDto {
    return {
        publicId: id,
        nameOriginal: `${id}.pdf`,
        extension: 'pdf',
        mimeType: 'application/pdf',
        sizeBytes,
        sha256Hash: 'x'.repeat(64),
        source: 'upload',
        status: 'active',
        documentDate: null,
        description: null,
        createdAt,
        updatedAt: null,
        contentLocation: 'local_only',
        syncExcluded: false,
        localDevice: { deviceIdentifier: ME, name: 'PC-Bureau' },
        ...extra
    };
}

function opts(remainingBytes: number, extra: Partial<PlanOptions> = {}): PlanOptions {
    return {
        deviceId: ME,
        isHere: () => true,
        remainingBytes,
        quotaBytes: 1000,
        unlimited: false,
        maxFileBytes: 10_000,
        ...extra
    };
}

describe('planUploads', () => {
    it('envoie du plus ancien au plus récent tant que le quota le permet', () => {
        const files = [file('c', '2026-03-01', 100), file('a', '2026-01-01', 100), file('b', '2026-02-01', 100)];
        const plan = planUploads(files, opts(250));
        expect(plan.upload.map((f) => f.publicId)).toEqual(['a', 'b']);
        expect(plan.blocked?.publicId).toBe('c');
        expect(plan.blockedNeverFits).toBe(false);
    });

    it('ordre strict : un gros fichier ancien bloque les plus récents, même plus petits', () => {
        const files = [file('big', '2026-01-01', 500), file('small', '2026-02-01', 10)];
        const plan = planUploads(files, opts(100));
        expect(plan.upload).toEqual([]);
        expect(plan.blocked?.publicId).toBe('big');
    });

    it('un fichier exclu ne compte pas et ne bloque pas', () => {
        const files = [file('big', '2026-01-01', 500, { syncExcluded: true }), file('small', '2026-02-01', 10)];
        expect(planUploads(files, opts(100)).upload.map((f) => f.publicId)).toEqual(['small']);
    });

    it('signale un fichier plus grand que le quota entier comme ne tenant jamais', () => {
        const plan = planUploads([file('huge', '2026-01-01', 2000)], opts(1000));
        expect(plan.blocked?.publicId).toBe('huge');
        expect(plan.blockedNeverFits).toBe(true);
    });

    it('ignore les fichiers en ligne, ceux d’un autre poste et ceux absents du dossier', () => {
        const files = [
            file('online', '2026-01-01', 10, { contentLocation: 'online' }),
            file('other', '2026-01-02', 10, { localDevice: { deviceIdentifier: 'other', name: 'Portable' } }),
            file('gone', '2026-01-03', 10),
            file('ok', '2026-01-04', 10)
        ];
        const plan = planUploads(files, opts(1000, { isHere: (id) => id !== 'gone' }));
        expect(plan.upload.map((f) => f.publicId)).toEqual(['ok']);
    });

    it('quota illimité : tout part', () => {
        const files = [file('a', '2026-01-01', 900), file('b', '2026-01-02', 900)];
        expect(planUploads(files, opts(0, { unlimited: true })).upload).toHaveLength(2);
    });
});

describe('fileSyncStatus', () => {
    const ctx = { deviceId: ME, isHere: (id: string) => id !== 'gone', syncEnabled: true, desktop: true };

    it('distingue les états d’un drive', () => {
        expect(fileSyncStatus(file('a', '2026-01-01', 1, { contentLocation: 'online' }), ctx)).toBe('synced');
        expect(fileSyncStatus(file('gone', '2026-01-01', 1, { contentLocation: 'online' }), ctx)).toBe('cloud');
        expect(fileSyncStatus(file('a', '2026-01-01', 1), ctx)).toBe('pending');
        expect(fileSyncStatus(file('a', '2026-01-01', 1), { ...ctx, syncEnabled: false })).toBe('local');
        expect(fileSyncStatus(file('a', '2026-01-01', 1, { syncExcluded: true }), ctx)).toBe('excluded');
        expect(fileSyncStatus(file('gone', '2026-01-01', 1), ctx)).toBe('missing');
        expect(fileSyncStatus(file('a', '2026-01-01', 1, { localDevice: { deviceIdentifier: 'other', name: 'Portable' } }), ctx)).toBe(
            'elsewhere'
        );
    });

    it('dans le navigateur, un fichier local est toujours ailleurs et un fichier en ligne dans le cloud', () => {
        const web = { ...ctx, desktop: false };
        expect(fileSyncStatus(file('a', '2026-01-01', 1), web)).toBe('elsewhere');
        expect(fileSyncStatus(file('a', '2026-01-01', 1, { contentLocation: 'online' }), web)).toBe('cloud');
    });
});

describe('localFileName', () => {
    const id = '0f8e5a2c-1111-4222-8333-944445555666';

    it('nomme un fichier scellé par son identifiant', () => {
        expect(localFileName(id, 'Relevé.pdf', true)).toBe(`${id}.spdf`);
    });

    it('garde un nom lisible sans caractères interdits, avec un suffixe unique', () => {
        expect(localFileName(id, 'Relevé UBS: mars/2026.pdf', false)).toBe('Relevé UBS mars 2026__0f8e5a2c.pdf');
        expect(localFileName(id, '..pdf', false)).toBe('document__0f8e5a2c.pdf');
        expect(localFileName(id, '.cache', false)).toBe('cache__0f8e5a2c.pdf');
    });
});

describe('parseIndex', () => {
    it('repart d’un index vide si le JSON est illisible', () => {
        expect(parseIndex('{oops').entries).toEqual({});
        expect(parseIndex(null).entries).toEqual({});
        expect(parseIndex(JSON.stringify({ version: 1, entries: { a: { name: 'a.pdf', sha256: 'x', size: 1 } } })).entries.a.name).toBe(
            'a.pdf'
        );
    });
});
