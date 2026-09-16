import { describe, expect, it } from 'vitest';
import { asPdfBlob } from '@/features/files/content';
import { FILE_PDF_MIME } from '@/features/files/types';

describe('asPdfBlob', () => {
    it('conserve un blob déjà application/pdf', () => {
        const pdf = new Blob(['%PDF-1.4'], { type: FILE_PDF_MIME });
        expect(asPdfBlob(pdf)).toBe(pdf);
    });

    it('force application/pdf si le MIME API est absent ou octet-stream', () => {
        const raw = new Blob(['%PDF-1.4'], { type: 'application/octet-stream' });
        const pdf = asPdfBlob(raw);
        expect(pdf).not.toBe(raw);
        expect(pdf.type).toBe(FILE_PDF_MIME);
    });
});
