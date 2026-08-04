/** Payload QR amis : `spendup:user:{userPublicId}`. */

export const FRIEND_QR_PREFIX = 'spendup:user:';

/** Public id API : 7 caractères 0-9 + A-Z. */
const PUBLIC_ID_RE = /^[0-9A-Z]{7}$/;

export function normalizePublicId(value: string): string {
    return value.trim().toUpperCase();
}

export function isValidPublicId(value: string): boolean {
    return PUBLIC_ID_RE.test(normalizePublicId(value));
}

export function buildFriendQrPayload(publicId: string): string {
    const id = normalizePublicId(publicId);
    if (!isValidPublicId(id)) {
        throw new Error('Invalid user public id');
    }
    return `${FRIEND_QR_PREFIX}${id}`;
}

/**
 * Extrait un publicId depuis un scan QR.
 * Accepte `spendup:user:XXXXXXX` ou un publicId brut 7 caractères.
 */
export function parseFriendQrPayload(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const lower = trimmed.toLowerCase();
    if (lower.startsWith(FRIEND_QR_PREFIX)) {
        const id = normalizePublicId(trimmed.slice(FRIEND_QR_PREFIX.length));
        return isValidPublicId(id) ? id : null;
    }

    const bare = normalizePublicId(trimmed);
    return isValidPublicId(bare) ? bare : null;
}
