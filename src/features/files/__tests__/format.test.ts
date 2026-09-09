import { describe, expect, it } from 'vitest';
import { fileSizeParts, matchesFileSearch, parseFileSort, sortFiles } from '@/features/files/format';
import { buildUpdateFileRequest, fileToFormFields } from '@/features/files/payload';
import type { FileDto } from '@/features/files/types';

function file(partial: Partial<FileDto> = {}): FileDto {
    return {
        publicId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        nameOriginal: 'facture.pdf',
        extension: 'pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1200,
        sha256Hash: 'a'.repeat(64),
        source: 'upload',
        status: 'active',
        documentDate: '2026-01-15',
        description: 'Assurance',
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: null,
        ...partial
    };
}

describe('files format', () => {
    it('trie par récence par défaut et garde deux hash identiques distincts', () => {
        const a = file({ publicId: 'a', nameOriginal: 'a.pdf', createdAt: '2026-09-01T10:00:00Z', sha256Hash: 'f'.repeat(64) });
        const b = file({ publicId: 'b', nameOriginal: 'b.pdf', createdAt: '2026-09-02T10:00:00Z', sha256Hash: 'f'.repeat(64) });
        expect(sortFiles([a, b]).map((item) => item.publicId)).toEqual(['b', 'a']);
        expect(parseFileSort('nope')).toBe('recent');
    });

    it('filtre sur le nom et la description, pas sur le hash', () => {
        const item = file({ sha256Hash: 'deadbeef'.repeat(8) });
        expect(matchesFileSearch(item, 'facture')).toBe(true);
        expect(matchesFileSearch(item, 'assurance')).toBe(true);
        expect(matchesFileSearch(item, 'deadbeef')).toBe(false);
    });

    it('formate la taille', () => {
        expect(fileSizeParts(512)).toEqual({ unit: 'bytes', n: '512' });
        expect(fileSizeParts(2048)).toEqual({ unit: 'kb', n: '2' });
        expect(fileSizeParts(10_485_760)).toEqual({ unit: 'mb', n: '10' });
    });
});

describe('buildUpdateFileRequest', () => {
    it('n’envoie que les champs changés et vide la description', () => {
        const original = file();
        const result = buildUpdateFileRequest(original, {
            ...fileToFormFields(original),
            description: '  '
        });
        expect(result).toEqual({ ok: true, hasChanges: true, request: { description: null } });
    });

    it('refuse un nom vide', () => {
        expect(buildUpdateFileRequest(file(), { nameOriginal: '  ', description: '', documentDate: null })).toEqual({
            ok: false,
            code: 'nameRequired'
        });
    });

    it('clearDocumentDate gagne quand la date est effacée', () => {
        const result = buildUpdateFileRequest(file(), {
            nameOriginal: 'facture.pdf',
            description: 'Assurance',
            documentDate: null
        });
        expect(result).toEqual({ ok: true, hasChanges: true, request: { clearDocumentDate: true } });
    });
});
