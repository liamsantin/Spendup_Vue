import { FILE_PDF_MIME } from '@/features/files/types';
import { filesApi } from '@/features/files/api';
import { useVaultStore } from '@/features/vault/stores/vault-store';
import { useFileSyncStore } from '@/features/files/sync/sync-store';
import { AppError } from '@/utils/errors/app-error';
import { isTauri } from '@/utils/helpers/platform-helpers';

/** Message quand un PDF chiffré ne peut pas être ouvert sur cet appareil (Coffre fermé ou autre clé). */
export const FILE_CONTENT_LOCKED_MESSAGE = 'Ce document est chiffré par votre Coffre et ne peut pas être ouvert sur cet appareil.';

export class FileContentLockedError extends Error {
    constructor() {
        super(FILE_CONTENT_LOCKED_MESSAGE);
        this.name = 'FileContentLockedError';
    }
}

/** Le contenu n'est que sur un autre poste (synchro de l'app de bureau) : le fichier est affiché grisé. */
export class FileContentElsewhereError extends Error {
    constructor(readonly deviceName: string) {
        super(`Ce document est seulement sur « ${deviceName} ».`);
        this.name = 'FileContentElsewhereError';
    }
}

/** Raison du 409 de `GET /api/files/{id}/content` quand le contenu n'est que sur un poste. */
export const CONTENT_LOCAL_ONLY_REASON = 'content_local_only';

function elsewhereFrom(e: unknown): FileContentElsewhereError | null {
    const err = AppError.fromUnknown(e);
    const details = err.details as { reason?: string; device?: { name?: string } | null } | undefined;
    if (err.status !== 409 || details?.reason !== CONTENT_LOCAL_ONLY_REASON) return null;
    return new FileContentElsewhereError(details.device?.name ?? 'un autre appareil');
}

/**
 * Contenu tel que stocké (scellé si chiffré) : copie du dossier local d'abord (app de bureau), sinon téléchargement.
 * Un fichier en ligne ouvert depuis l'app de bureau est gardé dans le dossier (« fichier à la demande »).
 * @throws FileContentElsewhereError si le contenu n'est que sur un autre poste.
 */
export async function loadStoredContent(publicId: string): Promise<Blob> {
    const sync = isTauri() ? useFileSyncStore() : null;
    const local = await sync?.readLocal(publicId);
    if (local) return local;
    let raw: Blob;
    try {
        raw = await filesApi.getContent(publicId);
    } catch (e: unknown) {
        throw elsewhereFrom(e) ?? e;
    }
    const known = sync?.remote.get(publicId);
    if (sync && known) await sync.keepDownloaded(known, raw).catch(() => undefined);
    return raw;
}

/**
 * Charge un PDF (copie locale ou téléchargement) et le déchiffre si le Coffre l’a chiffré. Le blob renvoyé a toujours le MIME PDF.
 * @param publicId Identifiant public du fichier.
 * @throws FileContentLockedError si le contenu est chiffré et indéchiffrable ici.
 * @throws FileContentElsewhereError si le contenu n'est que sur un autre poste.
 */
export async function loadReadablePdf(publicId: string): Promise<Blob> {
    const raw = await loadStoredContent(publicId);
    const readable = await useVaultStore().decryptPdf(raw, publicId);
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
