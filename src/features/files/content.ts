import { FILE_PDF_MIME } from '@/features/files/types';

function pdfMime(type: string): boolean {
    return type.split(';')[0].trim().toLowerCase() === FILE_PDF_MIME;
}

/** Le viewer natif n’affiche un blob dans l’iframe que si le MIME est `application/pdf`. */
export function asPdfBlob(blob: Blob): Blob {
    if (pdfMime(blob.type)) return blob;
    return new Blob([blob], { type: FILE_PDF_MIME });
}
