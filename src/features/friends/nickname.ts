export const FRIEND_NICKNAME_MAX_LENGTH = 64;

const CONTROL_CHAR_RE = /\p{C}/u;

/** Normalise la saisie avant envoi API (trim ; vide → null). */
export function normalizeFriendNickname(raw: string | null | undefined): string | null {
    if (raw == null) return null;
    const trimmed = raw.trim();
    return trimmed.length === 0 ? null : trimmed;
}

/** Validation client (miroir API) — lève une Error avec message lisible. */
export function validateFriendNickname(nickname: string | null): void {
    if (nickname === null) return;
    if (nickname.length > FRIEND_NICKNAME_MAX_LENGTH) {
        throw new Error('Le surnom ne peut pas dépasser 64 caractères.');
    }
    if (CONTROL_CHAR_RE.test(nickname)) {
        throw new Error('Le surnom contient des caractères non autorisés.');
    }
}
