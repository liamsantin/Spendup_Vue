import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { csrfHeaderRecord } from '@/features/auth/csrf';

export function getApiBaseUrl(): string {
    return (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
}

/** Activer uniquement quand l’API expose refresh (+ access) en cookie HttpOnly. */
export function isAuthCookieMode(): boolean {
    const raw = String(import.meta.env.VITE_AUTH_COOKIE_MODE ?? '').toLowerCase();
    return raw === 'true' || raw === '1';
}

/**
 * Builds de production : refuse le mode legacy (refresh en localStorage).
 * No-op en dev / test / si cookie-mode déjà actif.
 */
export function assertProductionAuthCookieMode(): void {
    if (!import.meta.env.PROD) return;
    if (isAuthCookieMode()) return;
    throw new Error('VITE_AUTH_COOKIE_MODE must be true in production builds (HttpOnly cookies).');
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
