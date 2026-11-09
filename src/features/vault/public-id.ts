/**
 * Identifiant public choisi par le client à la création (`POST /api/accounts`, `/api/assets`, `/api/tiers`,
 * `/api/files`) : l’AAD d’un champ chiffré contient le `publicId`, le choisir avant l’envoi évite le double
 * appel POST puis PUT. Format accepté par l’API : GUID `8-4-4-4-12` en minuscules (400 sinon) ; déjà pris,
 * lignes supprimées comprises : 409 `CONFLICT`, on retente avec un nouvel identifiant.
 */
import { AppError } from '@/utils/errors/app-error';

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Nouveaux tirages après un 409 avant d’abandonner (une collision de GUID est déjà improbable). */
const MAX_CONFLICT_RETRIES = 3;

/** Tire un identifiant public au format attendu par l’API. */
export function generatePublicId(): string {
    const api = globalThis.crypto;
    if (typeof api?.randomUUID === 'function') return api.randomUUID().toLowerCase();
    // Repli (contexte sans randomUUID) : UUID v4 depuis getRandomValues.
    const bytes = new Uint8Array(16);
    api.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Vrai si la valeur a le format exigé par l’API. */
export function isValidPublicId(value: string): boolean {
    return GUID_PATTERN.test(value);
}

/** Vrai pour le 409 `CONFLICT` de l’API (identifiant déjà pris, ou version de ligne périmée). */
export function isConflictError(error: unknown): boolean {
    return error instanceof AppError && (error.status === 409 || error.code === 'CONFLICT');
}

/**
 * Exécute une création avec un identifiant tiré localement ; un 409 `CONFLICT` fait retirer un
 * identifiant et recommencer (le chiffrement doit être refait avec le nouvel AAD, d’où le rappel).
 * @param create Création à exécuter pour un identifiant donné.
 */
export async function withFreshPublicId<T>(create: (publicId: string) => Promise<T>): Promise<T> {
    let attempt = 0;
    for (;;) {
        const publicId = generatePublicId();
        try {
            return await create(publicId);
        } catch (e: unknown) {
            attempt += 1;
            if (!isConflictError(e) || attempt > MAX_CONFLICT_RETRIES) throw e;
        }
    }
}
