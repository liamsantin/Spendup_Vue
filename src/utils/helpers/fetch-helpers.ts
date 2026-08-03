import axios, { type AxiosRequestConfig, type Method } from 'axios';
import { useAuthStore } from '@/features/auth';
import { createApiAxios, getApiBaseUrl, isAuthCookieMode } from '@/utils/helpers/axios-helpers';
import { AppError, unwrapSpendupEnvelope } from '@/utils/errors/app-error';

/**
 * Client Axios pour les API domaine authentifiées.
 * Ajoute le Bearer et retente une fois après refresh sur 401.
 */
const domainAxios = createApiAxios();

export const fetchWrapper = {
    get: request('GET'),
    post: request('POST'),
    put: request('PUT'),
    patch: request('PATCH'),
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
                return handleResponse(response.status, response.data, response.statusText, async () => {
                    if (retried) {
                        const msg =
                            (response.data &&
                                typeof response.data === 'object' &&
                                'message' in response.data &&
                                (response.data as { message?: string }).message) ||
                            response.statusText ||
                            'Unauthorized';
                        await useAuthStore().forceReLogin(String(msg));
                        return Promise.reject(new AppError(String(msg), 401));
                    }
                    return doRequest(true);
                });
            } catch (e: unknown) {
                if (e instanceof AppError) return Promise.reject(e);
                if (axios.isAxiosError(e) && !e.response) {
                    return Promise.reject(new AppError(e.message || 'Network error', 0));
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

    // Cookie-mode : refresh si besoin, auth via cookie `spendup_access` (pas de Bearer).
    if (isAuthCookieMode()) {
        await auth.ensureAccessToken();
        return {};
    }

    const token = await auth.ensureAccessToken();
    if (token) {
        return { Authorization: `Bearer ${token}` };
    }
    return {};
}

async function handleResponse(status: number, data: unknown, statusText: string, retry: () => Promise<unknown>): Promise<unknown> {
    if (status === 401) {
        const auth = useAuthStore();
        const message =
            (data && typeof data === 'object' && 'message' in data && (data as { message?: string }).message) ||
            statusText ||
            'Unauthorized';
        if (auth.refreshToken || isAuthCookieMode()) {
            const refreshed = await auth.refreshSession();
            if (refreshed) {
                return retry();
            }
        }
        // Passe le message API (ex. idle) pour la notice login si le refresh a aussi échoué.
        await auth.forceReLogin(String(message));
        return Promise.reject(new AppError(String(message), 401));
    }

    if (status >= 400) {
        const envelope = data && typeof data === 'object' ? (data as { message?: string; code?: string; details?: unknown }) : null;
        const message = envelope?.message || statusText || 'Request failed';
        return Promise.reject(new AppError(String(message), status, envelope?.code, envelope?.details));
    }

    try {
        return unwrapSpendupEnvelope(data, statusText);
    } catch (e: unknown) {
        return Promise.reject(AppError.fromUnknown(e, statusText));
    }
}
