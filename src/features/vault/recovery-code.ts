/**
 * Code de récupération : 128 bits aléatoires, affichés une seule fois en 8 groupes de 4 caractères
 * d’un alphabet sans ambiguïté (ni 0/O, ni 1/I/L). Saisi plus tard, il est normalisé avant dérivation.
 */

/** 32 symboles : 5 bits chacun, 26 symboles = 130 bits ≥ 128 bits d’entropie. */
export const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const RECOVERY_GROUPS = 8;
export const RECOVERY_GROUP_SIZE = 4;
export const RECOVERY_CODE_LENGTH = RECOVERY_GROUPS * RECOVERY_GROUP_SIZE;

/**
 * Tire un code de récupération aléatoire (rejet uniforme sur l’alphabet).
 * @returns Code de 32 caractères sans séparateur.
 */
export function generateRecoveryCode(): string {
    const alphabet = RECOVERY_ALPHABET;
    const limit = 256 - (256 % alphabet.length);
    const out: string[] = [];
    const buffer = new Uint8Array(64);
    while (out.length < RECOVERY_CODE_LENGTH) {
        globalThis.crypto.getRandomValues(buffer);
        for (const byte of buffer) {
            if (byte >= limit) continue;
            out.push(alphabet[byte % alphabet.length]);
            if (out.length === RECOVERY_CODE_LENGTH) break;
        }
    }
    return out.join('');
}

/**
 * Format lisible : `XXXX-XXXX-…` (8 groupes).
 * @param code Code brut ou déjà formaté.
 */
export function formatRecoveryCode(code: string): string {
    const normalized = normalizeRecoveryCode(code);
    const groups: string[] = [];
    for (let i = 0; i < normalized.length; i += RECOVERY_GROUP_SIZE) {
        groups.push(normalized.slice(i, i + RECOVERY_GROUP_SIZE));
    }
    return groups.join('-');
}

/**
 * Normalise une saisie : majuscules, sans espaces ni tirets. L’alphabet exclut déjà les caractères
 * ambigus (0/O, 1/I/L), donc aucune substitution n’est tentée.
 * @param input Saisie utilisateur.
 */
export function normalizeRecoveryCode(input: string): string {
    return input.toUpperCase().replace(/[\s-]+/g, '');
}

/**
 * Vrai si la saisie, normalisée, a la bonne longueur et ne contient que l’alphabet.
 * @param input Saisie utilisateur.
 */
export function isValidRecoveryCode(input: string): boolean {
    const normalized = normalizeRecoveryCode(input);
    if (normalized.length !== RECOVERY_CODE_LENGTH) return false;
    return [...normalized].every((ch) => RECOVERY_ALPHABET.includes(ch));
}
