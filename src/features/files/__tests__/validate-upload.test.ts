import { describe, expect, it } from 'vitest';
import { FILE_MAX_BYTES } from '@/features/files/types';
import { hasPdfMagicBytes, validatePdfFile } from '@/features/files/validate-upload';

function fileFromBytes(bytes: number[], name = 'doc.pdf', type = 'application/pdf', size?: number): File {
    const body = new Uint8Array(bytes);
    const blob = new Blob([body], { type });
    const file = new File([blob], name, { type });
    if (size != null) {
        Object.defineProperty(file, 'size', { value: size });
    }
    return file;
}

describe('validatePdfFile', () => {
    it('accepte un PDF dont les magic bytes sont %PDF', async () => {
        const file = fileFromBytes([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
        expect(await hasPdfMagicBytes(file)).toBe(true);
        expect(await validatePdfFile(file)).toEqual({ ok: true });
    });

    it('refuse un .pdf qui n’est pas un PDF', async () => {
        const file = fileFromBytes([0x89, 0x50, 0x4e, 0x47], 'fake.pdf');
        expect(await validatePdfFile(file)).toEqual({ ok: false, code: 'notPdf' });
    });

    it('refuse un fichier vide ou absent', async () => {
        expect(await validatePdfFile(null)).toEqual({ ok: false, code: 'required' });
        expect(await validatePdfFile(fileFromBytes([], 'empty.pdf'))).toEqual({ ok: false, code: 'required' });
    });

    it('refuse au-delà de 10 Mo', async () => {
        const file = fileFromBytes([0x25, 0x50, 0x44, 0x46], 'big.pdf', 'application/pdf', FILE_MAX_BYTES + 1);
        expect(await validatePdfFile(file)).toEqual({ ok: false, code: 'tooLarge' });
    });
});
