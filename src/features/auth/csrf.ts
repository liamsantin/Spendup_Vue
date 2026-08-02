/** Aligné sur `Authentication:RefreshCookie` API. */
export const CSRF_COOKIE_NAME = 'spendup_csrf';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

/** Jeton mémorisé (réponse JSON `csrfToken`) — secours si le cookie n’est pas lisible (Path). */
let memoryCsrf: string | null = null;

export function rememberCsrfToken(token: string | null | undefined): void {
    if (typeof token === 'string' && token.trim()) {
        memoryCsrf = token.trim();
    }
}

export function clearCsrfToken(): void {
    memoryCsrf = null;
}

/** Lit `spendup_csrf` depuis `document.cookie` (nécessite Path=/ côté API pour les pages SPA). */
export function readCsrfCookie(): string | null {
    if (typeof document === 'undefined') return null;
    const parts = document.cookie.split(';');
    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed.startsWith(`${CSRF_COOKIE_NAME}=`)) continue;
        const value = trimmed.slice(CSRF_COOKIE_NAME.length + 1);
        try {
            return decodeURIComponent(value).trim() || null;
        } catch {
            return value.trim() || null;
        }
    }
    return null;
}

/** Valeur à envoyer dans `X-CSRF-Token` (mémoire puis cookie). */
export function getCsrfToken(): string | null {
    return memoryCsrf || readCsrfCookie();
}

/** Headers CSRF pour refresh / logout cookie-mode. */
export function csrfHeaderRecord(): Record<string, string> {
    const token = getCsrfToken();
    return token ? { [CSRF_HEADER_NAME]: token } : {};
}
