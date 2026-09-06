import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { csrfHeaderRecord } from '@/features/auth/csrf';

export function getApiBaseUrl(): string {
    return (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
}

/**
 * Cookie HttpOnly + CSRF (same-site). Défaut / prod = Bearer :
 * front et API sont cross-site ; les cookies tiers sont refusés sur mobile.
 */
export function isAuthCookieMode(): boolean {
    const raw = String(import.meta.env.VITE_AUTH_COOKIE_MODE ?? '').toLowerCase();
    return raw === 'true' || raw === '1';
}

/**
 * Builds de production : refuse le mode cookie (cookies tiers → 401 mobile).
 * No-op en dev / test / si Bearer déjà actif.
 */
export function assertProductionAuthBearerMode(): void {
    if (!import.meta.env.PROD) return;
    if (!isAuthCookieMode()) return;
    throw new Error('VITE_AUTH_COOKIE_MODE must be false in production builds (Bearer; third-party cookies blocked on mobile).');
}

/** En cookie-mode, le JWT access voyage dans `spendup_access` — pas de header Bearer. */
export function shouldSendBearerAuth(): boolean {
    return !isAuthCookieMode();
}

/** Instance Axios de base (JSON). Sans interceptor refresh. Timeout 30s. */
export function createApiAxios(): AxiosInstance {
    return axios.create({
        baseURL: getApiBaseUrl(),
        timeout: 30_000,
        headers: { 'Content-Type': 'application/json' },
        withCredentials: isAuthCookieMode()
    });
}

function needsCsrfHeader(config: InternalAxiosRequestConfig): boolean {
    if (!isAuthCookieMode()) return false;
    const method = (config.method ?? 'get').toLowerCase();
    // Cookie session = auth par cookie : toute mutation doit double-submit le CSRF
    // (refresh/logout + profil / avatar / devices / etc.).
    return method === 'post' || method === 'put' || method === 'delete' || method === 'patch';
}

/**
 * Client auth `/api/auth/*` — volontairement sans interceptor refresh
 * (évite les boucles sur login / refresh). CSRF sur mutations cookie-mode.
 */
export const authAxios = createApiAxios();

authAxios.interceptors.request.use((config) => {
    if (!needsCsrfHeader(config)) return config;
    const csrf = csrfHeaderRecord();
    if (!Object.keys(csrf).length) return config;
    config.headers = config.headers ?? {};
    for (const [key, value] of Object.entries(csrf)) {
        config.headers.set(key, value);
    }
    return config;
});
