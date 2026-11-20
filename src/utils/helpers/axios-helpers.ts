import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { csrfHeaderRecord } from '@/features/auth/csrf';
import { isTauri } from '@/utils/helpers/platform-helpers';

export function getApiBaseUrl(): string {
    return (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
}

function envFlag(value: unknown): boolean {
    const raw = String(value ?? '').toLowerCase();
    return raw === 'true' || raw === '1';
}

/**
 * Cookies HttpOnly + CSRF : les jetons ne sont plus lisibles par le JavaScript (A1.9).
 * Ne fonctionne que si le front et l'API sont sur le même site (même domaine enregistrable) :
 * entre deux sites, Safari / iOS bloquent ces cookies et la connexion échoue.
 * - App de bureau : toujours Bearer (pas de cookies exploitables dans la WebView).
 * - Production : il faut en plus `VITE_AUTH_SAME_SITE_API=true`, qui atteste que l'API est servie
 *   sous le domaine du site. Sans lui le site reste en Bearer, même si `VITE_AUTH_COOKIE_MODE`
 *   est resté à `true` dans un ancien environnement de build.
 */
export function isAuthCookieMode(): boolean {
    if (isTauri()) return false;
    if (!envFlag(import.meta.env.VITE_AUTH_COOKIE_MODE)) return false;
    if (import.meta.env.PROD) return envFlag(import.meta.env.VITE_AUTH_SAME_SITE_API);
    return true;
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
