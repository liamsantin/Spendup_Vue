import axios, { type AxiosRequestConfig, type Method } from 'axios';
import { useAuthStore } from '@/features/auth';
import { createApiAxios, getApiBaseUrl } from '@/utils/helpers/axios-helpers';

/**
 * Client Axios pour les API domaine authentifiées.
 * Ajoute le Bearer et retente une fois après refresh sur 401.
 */
const domainAxios = createApiAxios();

export const fetchWrapper = {
    get: request('GET'),
    post: request('POST'),
    put: request('PUT'),
    delete: request('DELETE')
};

function request(method: Method) {
    return async (url: string, body?: unknown) => {
        const doRequest = async (retried: boolean): Promise<unknown> => {
            const config: AxiosRequestConfig = {
                url: toRequestUrl(url),
                method,
                data: body,
                headers: await authHeader(url),
                validateStatus: () => true
            };

            try {
                const response = await domainAxios.request(config);
                return handleResponse(response.status, response.data, response.statusText, () => {
                    if (retried) return Promise.reject('Unauthorized');
                    return doRequest(true);
                });
            } catch (e: unknown) {
                if (axios.isAxiosError(e) && !e.response) {
                    return Promise.reject(e.message || 'Network error');
                }
                throw e;
            }
        };

        return doRequest(false);
    };
}

/** Accepte une URL absolue ou un path relatif à la base API. */
function toRequestUrl(url: string): string {
    const base = getApiBaseUrl();
    if (url.startsWith('http://') || url.startsWith('https://')) {
        if (base && url.startsWith(base)) {
            return url.slice(base.length) || '/';
        }
        return url;
    }
    return url;
}

async function authHeader(url: string): Promise<Record<string, string>> {
    const auth = useAuthStore();
    const base = getApiBaseUrl();
    const isApiUrl = (!!base && url.startsWith(base)) || url.startsWith('/') || !url.startsWith('http');
    if (!isApiUrl) return {};

    const token = await auth.ensureAccessToken();
    if (token) {
        return { Authorization: `Bearer ${token}` };
    }
    return {};
}

async function handleResponse(status: number, data: unknown, statusText: string, retry: () => Promise<unknown>): Promise<unknown> {
    if (status === 401) {
        const auth = useAuthStore();
        if (auth.refreshToken) {
            const refreshed = await auth.refreshSession();
            if (refreshed) {
                return retry();
            }
        }
        // Toujours forcer le re-login : clearSession a déjà pu rendre isAuthenticated=false.
        await auth.forceReLogin();
        const error = (data && typeof data === 'object' && 'message' in data && (data as { message?: string }).message) || statusText;
        return Promise.reject(error);
    }

    if (status >= 400) {
        const error = (data && typeof data === 'object' && 'message' in data && (data as { message?: string }).message) || statusText;
        return Promise.reject(error);
    }

    // Spendup envelope when present
    if (data && typeof data === 'object' && 'success' in data) {
        const envelope = data as { success: boolean; message?: string; result?: unknown };
        if (!envelope.success) {
            return Promise.reject(envelope.message ?? 'Request failed');
        }
        return envelope.result;
    }

    return data;
}
