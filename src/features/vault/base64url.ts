/**
 * Base64url (RFC 4648 §5) sans `=` : format attendu par l’API pour les sels, les DEK emballées
 * et le corps des valeurs `enc:v1:`.
 */

const BASE64URL_RE = /^[A-Za-z0-9_-]*$/;

/**
 * Encode des octets en base64url sans remplissage.
 * @param bytes Octets à encoder.
 * @returns Chaîne base64url.
 */
export function toBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Décode une chaîne base64url (avec ou sans `=`).
 * @param value Chaîne base64url.
 * @returns Octets décodés.
 * @throws Error si la chaîne contient des caractères hors alphabet.
 */
export function fromBase64Url(value: string): Uint8Array {
    const trimmed = value.replace(/=+$/, '');
    if (!BASE64URL_RE.test(trimmed)) {
        throw new Error('base64url invalide');
    }
    const base64 = trimmed.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

/** Vrai si la chaîne est un base64url plausible (alphabet, non vide). */
export function isBase64Url(value: string): boolean {
    return value.length > 0 && BASE64URL_RE.test(value.replace(/=+$/, ''));
}
