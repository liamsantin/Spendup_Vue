import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { csrfHeaderRecord } from '@/features/auth/csrf';

export function getApiBaseUrl(): string {
    return (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
}

/** Activer uniquement quand l’API expose le refresh en cookie HttpOnly (P1). */
export function isAuthCookieMode(): boolean {
    const raw = String(import.meta.env.VITE_AUTH_COOKIE_MODE ?? '').toLowerCase();
    return raw === 'true' || raw === '1';
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
    if (method !== 'post' && method !== 'put' && method !== 'delete' && method !== 'patch') return false;
    const url = config.url ?? '';
    return url.includes('/api/auth/refresh') || url.includes('/api/auth/logout');
}

/**
 * Client auth `/api/auth/*` — volontairement sans interceptor refresh
 * (évite les boucles sur login / refresh). CSRF sur refresh/logout cookie-mode.
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
