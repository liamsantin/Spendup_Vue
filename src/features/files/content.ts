import { FILE_PDF_MIME } from '@/features/files/types';
import { filesApi } from '@/features/files/api';
import { useVaultStore } from '@/features/vault/stores/vault-store';

/** Message quand un PDF chiffré ne peut pas être ouvert sur cet appareil (Coffre fermé ou autre clé). */
export const FILE_CONTENT_LOCKED_MESSAGE = 'Ce document est chiffré par votre Coffre et ne peut pas être ouvert sur cet appareil.';

export class FileContentLockedError extends Error {
    constructor() {
        super(FILE_CONTENT_LOCKED_MESSAGE);
        this.name = 'FileContentLockedError';
    }
}

/**
 * Télécharge un PDF et le déchiffre si le Coffre l’a chiffré. Le blob renvoyé a toujours le MIME PDF.
 * @param publicId Identifiant public du fichier.
 * @throws FileContentLockedError si le contenu est chiffré et indéchiffrable ici.
 */
export async function loadReadablePdf(publicId: string): Promise<Blob> {
    const raw = await filesApi.getContent(publicId);
    const readable = await useVaultStore().decryptPdf(raw);
    if (!readable) throw new FileContentLockedError();
    return asPdfBlob(readable);
}

function pdfMime(type: string): boolean {
    return type.split(';')[0].trim().toLowerCase() === FILE_PDF_MIME;
}

/** Le viewer natif n’affiche un blob dans l’iframe que si le MIME est `application/pdf`. */
export function asPdfBlob(blob: Blob): Blob {
    if (pdfMime(blob.type)) return blob;
    return new Blob([blob], { type: FILE_PDF_MIME });
}
