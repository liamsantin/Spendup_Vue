import axios, { type AxiosInstance } from 'axios';

export function getApiBaseUrl(): string {
    return (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
}

/** Instance Axios de base (JSON). Sans interceptor refresh. */
export function createApiAxios(): AxiosInstance {
    return axios.create({
        baseURL: getApiBaseUrl(),
        headers: { 'Content-Type': 'application/json' }
    });
}

/**
 * Client auth `/api/auth/*` — volontairement sans interceptor refresh
 * (évite les boucles sur login / refresh).
 */
export const authAxios = createApiAxios();
