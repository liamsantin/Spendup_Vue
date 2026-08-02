import axios, { type AxiosRequestConfig, type Method } from 'axios';
import { useAuthStore } from '@/features/auth';
import { createApiAxios, getApiBaseUrl } from '@/utils/helpers/axios-helpers';
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
                        await useAuthStore().forceReLogin();
                        return Promise.reject(new AppError('Unauthorized', 401));
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
        await auth.forceReLogin();
        const message =
            (data && typeof data === 'object' && 'message' in data && (data as { message?: string }).message) ||
            statusText ||
            'Unauthorized';
        return Promise.reject(new AppError(String(message), 401));
    }

    if (status >= 400) {
        const message =
            (data && typeof data === 'object' && 'message' in data && (data as { message?: string }).message) ||
            statusText ||
            'Request failed';
        return Promise.reject(new AppError(String(message), status));
    }

    try {
        return unwrapSpendupEnvelope(data, statusText);
    } catch (e: unknown) {
        return Promise.reject(AppError.fromUnknown(e, statusText));
    }
}
