import { FILE_MAX_BYTES } from '@/features/files/types';

/** `%PDF` — un `.pdf` renommé qui n’est pas un PDF est rejeté. */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46] as const;

export type PdfValidationCode = 'required' | 'tooLarge' | 'notPdf';

export type PdfValidationResult = { ok: true } | { ok: false; code: PdfValidationCode };

export async function hasPdfMagicBytes(file: Blob): Promise<boolean> {
    const slice = file.slice(0, PDF_MAGIC.length);
    const bytes = new Uint8Array(await slice.arrayBuffer());
    if (bytes.length < PDF_MAGIC.length) return false;
    return PDF_MAGIC.every((value, index) => bytes[index] === value);
}

export async function validatePdfFile(file: File | null | undefined): Promise<PdfValidationResult> {
    if (!file || file.size === 0) return { ok: false, code: 'required' };
    if (file.size > FILE_MAX_BYTES) return { ok: false, code: 'tooLarge' };
    if (!(await hasPdfMagicBytes(file))) return { ok: false, code: 'notPdf' };
    return { ok: true };
}
