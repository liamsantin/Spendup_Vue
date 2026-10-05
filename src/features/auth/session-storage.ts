/** Persistence des jetons — isolée du store pour limiter le « god object ». */

export const REFRESH_KEY = 'spendup_refresh_token';
export const ACCESS_KEY = 'spendup_access_token';
export const EXPIRES_AT_KEY = 'spendup_access_expires_at';
export const PENDING_EMAIL_KEY = 'spendup_pending_email';
export const LOGIN_NOTICE_KEY = 'spendup_login_notice';

/** Marge avant expiration pour déclencher un refresh proactif. */
export const ACCESS_EXPIRY_SKEW_MS = 30_000;

function readSession(key: string): string | null {
    return sessionStorage.getItem(key);
}

/**
 * Refresh : mémoire Pinia + sessionStorage (pas localStorage — surface XSS).
 * Migre une fois un jeton legacy resté en localStorage.
 */
export function readRefreshToken(): string | null {
    const fromSession = readSession(REFRESH_KEY);
    if (fromSession) {
        localStorage.removeItem(REFRESH_KEY);
        return fromSession;
    }
    const fromLocal = localStorage.getItem(REFRESH_KEY);
    if (!fromLocal) return null;
    sessionStorage.setItem(REFRESH_KEY, fromLocal);
    localStorage.removeItem(REFRESH_KEY);
    return fromLocal;
}

export function readAccessToken(): string | null {
    return readSession(ACCESS_KEY);
}

export function readExpiresAt(): string | null {
    return readSession(EXPIRES_AT_KEY);
}

export function readPendingEmail(): string | null {
    return readSession(PENDING_EMAIL_KEY);
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

/** Purge refresh sessionStorage + localStorage (legacy / cookie-mode). */
export function clearStoredRefreshToken() {
    sessionStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(REFRESH_KEY);
}

/**
 * Persiste les jetons.
 * - Cookie-mode (`persistAccess: false`) : rien en storage JS (access + refresh = cookies HttpOnly).
 * - Bearer : access + refresh en sessionStorage (jamais localStorage).
 */
export function writeTokens(
    accessToken: string,
    refreshToken: string | null | undefined,
    expiresAt: string | null,
    options?: { persistRefresh?: boolean; persistAccess?: boolean }
) {
    const persistAccess = options?.persistAccess !== false;
    if (persistAccess) {
        sessionStorage.setItem(ACCESS_KEY, accessToken);
        if (expiresAt) {
            sessionStorage.setItem(EXPIRES_AT_KEY, expiresAt);
        } else {
            sessionStorage.removeItem(EXPIRES_AT_KEY);
        }
    } else {
        sessionStorage.removeItem(ACCESS_KEY);
        sessionStorage.removeItem(EXPIRES_AT_KEY);
    }

    const persistRefresh = options?.persistRefresh !== false;
    if (persistRefresh && refreshToken) {
        sessionStorage.setItem(REFRESH_KEY, refreshToken);
    } else {
        sessionStorage.removeItem(REFRESH_KEY);
    }
    localStorage.removeItem(REFRESH_KEY);
}

export function clearStoredTokens() {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(EXPIRES_AT_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(REFRESH_KEY);
    clearLegacyPendingPassword();
}

export function isAccessExpired(expiresAt: string | null | undefined, skewMs = ACCESS_EXPIRY_SKEW_MS): boolean {
    if (!expiresAt) return false;
    const ts = Date.parse(expiresAt);
    if (Number.isNaN(ts)) return false;
    return Date.now() >= ts - skewMs;
}
