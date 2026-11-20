/**
 * Règles pures de la synchro façon drive : nom du fichier sur le disque, état affiché, file d'envoi.
 *
 * File d'envoi : fichiers inclus gardés sur ce poste, du plus ancien au plus récent (date d'insertion),
 * envoyés tant qu'ils tiennent dans le quota. Ordre strict : le premier qui ne tient pas bloque les suivants,
 * même plus petits. Un fichier exclu par l'utilisateur ne compte pas et ne bloque jamais.
 */
import type { FileDto } from '@/features/files/types';

/** Entrée de l'index local : où est le fichier sur le disque et quel blob il contient. */
export type LocalIndexEntry = { name: string; sha256: string; size: number };

export type LocalIndex = {
    version: 1;
    entries: Record<string, LocalIndexEntry>;
};

export const EMPTY_INDEX: LocalIndex = { version: 1, entries: {} };

/** Lit l'index JSON du dossier ; un contenu illisible repart d'un index vide. */
export function parseIndex(json: string | null): LocalIndex {
    if (!json) return { version: 1, entries: {} };
    try {
        const parsed = JSON.parse(json) as Partial<LocalIndex>;
        if (parsed?.version !== 1 || typeof parsed.entries !== 'object' || !parsed.entries) return { version: 1, entries: {} };
        return { version: 1, entries: { ...parsed.entries } };
    } catch {
        return { version: 1, entries: {} };
    }
}

const FORBIDDEN = /[<>:"/\\|?*\u0000-\u001f]/g;
const MAX_STEM = 120;

/**
 * Nom sur le disque. Contenu scellé par le Coffre : `<publicId>.spdf` (le vrai nom est chiffré côté serveur).
 * En clair : nom lisible suivi d'un suffixe court de l'identifiant, pour rester unique dans le dossier.
 */
export function localFileName(publicId: string, displayName: string, encrypted: boolean): string {
    if (encrypted) return `${publicId}.spdf`;
    const stem =
        displayName
            .replace(/\.pdf$/i, '')
            .replace(FORBIDDEN, ' ')
            .replace(/\.+/g, '.')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/^\.+|\.+$/g, '')
            .slice(0, MAX_STEM)
            .trim() || 'document';
    return `${stem}__${publicId.slice(0, 8)}.pdf`;
}

export type SyncStatus =
    /** En ligne et sur ce poste. */
    | 'synced'
    /** En ligne, pas sur ce poste : s'ouvre à la demande. */
    | 'cloud'
    /** Sur ce poste, attend son tour dans la file d'envoi. */
    | 'pending'
    /** Sur ce poste, synchro désactivée sur cet appareil. */
    | 'local'
    /** Sur ce poste, exclu de la synchro par l'utilisateur. */
    | 'excluded'
    /** Seulement sur un autre poste : grisé. */
    | 'elsewhere'
    /** Devrait être sur ce poste mais le fichier a disparu du dossier. */
    | 'missing';

export type StatusContext = {
    deviceId: string;
    /** Le fichier est présent dans le dossier local. */
    isHere: (publicId: string) => boolean;
    /** Synchro activée sur cet appareil. */
    syncEnabled: boolean;
    /** Faux dans le navigateur (aucun dossier local). */
    desktop: boolean;
};

/** État affiché d'un fichier pour cet appareil. */
export function fileSyncStatus(file: FileDto, ctx: StatusContext): SyncStatus {
    const online = (file.contentLocation ?? 'online') === 'online';
    if (online) return ctx.desktop && ctx.isHere(file.publicId) ? 'synced' : 'cloud';
    const mine = ctx.desktop && file.localDevice?.deviceIdentifier === ctx.deviceId;
    if (!mine) return 'elsewhere';
    if (!ctx.isHere(file.publicId)) return 'missing';
    if (file.syncExcluded) return 'excluded';
    return ctx.syncEnabled ? 'pending' : 'local';
}

export type UploadPlan = {
    /** À envoyer maintenant, dans l'ordre. */
    upload: FileDto[];
    /** Premier fichier qui ne tient pas : il bloque la file. */
    blocked: FileDto | null;
    /** Vrai si `blocked` ne tiendra jamais (plus grand que le quota entier ou que la taille max) : à exclure. */
    blockedNeverFits: boolean;
};

export type PlanOptions = {
    deviceId: string;
    isHere: (publicId: string) => boolean;
    remainingBytes: number;
    quotaBytes: number;
    unlimited: boolean;
    maxFileBytes: number;
};

function insertionOrder(a: FileDto, b: FileDto): number {
    const byDate = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    return byDate !== 0 ? byDate : a.publicId.localeCompare(b.publicId);
}

/** Calcule la file d'envoi en ordre strict d'insertion. */
export function planUploads(files: readonly FileDto[], opts: PlanOptions): UploadPlan {
    const candidates = files
        .filter(
            (f) =>
                f.contentLocation === 'local_only' &&
                !f.syncExcluded &&
                f.localDevice?.deviceIdentifier === opts.deviceId &&
                opts.isHere(f.publicId)
        )
        .sort(insertionOrder);

    let remaining = opts.unlimited ? Number.POSITIVE_INFINITY : Math.max(0, opts.remainingBytes);
    const upload: FileDto[] = [];
    for (const file of candidates) {
        const size = file.sizeBytes;
        const neverFits = size > opts.maxFileBytes || (!opts.unlimited && size > opts.quotaBytes);
        if (neverFits || size > remaining) {
            return { upload, blocked: file, blockedNeverFits: neverFits };
        }
        upload.push(file);
        remaining -= size;
    }
    return { upload, blocked: null, blockedNeverFits: false };
}

/** Empreinte SHA-256 hexadécimale (WebCrypto). */
export async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
