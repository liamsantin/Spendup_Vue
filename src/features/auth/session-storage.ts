/** Persistence des jetons — isolée du store pour limiter le « god object ». */

export const REFRESH_KEY = 'spendup_refresh_token';
export const ACCESS_KEY = 'spendup_access_token';
export const EXPIRES_AT_KEY = 'spendup_access_expires_at';
export const PENDING_EMAIL_KEY = 'spendup_pending_email';
export const LOGIN_NOTICE_KEY = 'spendup_login_notice';

/** Marge avant expiration pour déclencher un refresh proactif. */
export const ACCESS_EXPIRY_SKEW_MS = 30_000;

export function readRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
}

export function readAccessToken(): string | null {
    return sessionStorage.getItem(ACCESS_KEY);
}

export function readExpiresAt(): string | null {
    return sessionStorage.getItem(EXPIRES_AT_KEY);
}

export function readPendingEmail(): string | null {
    return sessionStorage.getItem(PENDING_EMAIL_KEY);
}

export function writePendingEmail(email: string | null) {
    if (email) {
        sessionStorage.setItem(PENDING_EMAIL_KEY, email);
    } else {
        sessionStorage.removeItem(PENDING_EMAIL_KEY);
    }
}

export function writeLoginNotice(message: string | null) {
    if (message) {
        sessionStorage.setItem(LOGIN_NOTICE_KEY, message);
    } else {
        sessionStorage.removeItem(LOGIN_NOTICE_KEY);
    }
}

export function readAndClearLoginNotice(): string | null {
    const message = sessionStorage.getItem(LOGIN_NOTICE_KEY);
    sessionStorage.removeItem(LOGIN_NOTICE_KEY);
    return message;
}

/** Nettoyage legacy : ancien stockage plaintext du mot de passe. */
export function clearLegacyPendingPassword() {
    sessionStorage.removeItem('spendup_pending_password');
}

/** Supprime un refresh éventuellement resté en localStorage (mode cookie). */
export function clearStoredRefreshToken() {
    localStorage.removeItem(REFRESH_KEY);
}

/**
 * Persiste l’access (+ expiresAt).
 * `persistRefresh: false` = mode cookie HttpOnly (ne jamais écrire le refresh en JS storage).
 */
export function writeTokens(
    accessToken: string,
    refreshToken: string | null | undefined,
    expiresAt: string | null,
    options?: { persistRefresh?: boolean }
) {
    sessionStorage.setItem(ACCESS_KEY, accessToken);
    const persistRefresh = options?.persistRefresh !== false;
    if (persistRefresh && refreshToken) {
        localStorage.setItem(REFRESH_KEY, refreshToken);
    } else {
        localStorage.removeItem(REFRESH_KEY);
    }
    if (expiresAt) {
        sessionStorage.setItem(EXPIRES_AT_KEY, expiresAt);
    } else {
        sessionStorage.removeItem(EXPIRES_AT_KEY);
    }
}

export function clearStoredTokens() {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(EXPIRES_AT_KEY);
    localStorage.removeItem(REFRESH_KEY);
    clearLegacyPendingPassword();
}

export function isAccessExpired(expiresAt: string | null | undefined, skewMs = ACCESS_EXPIRY_SKEW_MS): boolean {
    if (!expiresAt) return false;
    const ts = Date.parse(expiresAt);
    if (Number.isNaN(ts)) return false;
    return Date.now() >= ts - skewMs;
}
