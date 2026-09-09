import axios, { type AxiosProgressEvent, type AxiosRequestConfig, type Method } from 'axios';
import { useAuthStore } from '@/features/auth';
import { csrfHeaderRecord } from '@/features/auth/csrf';
import { createApiAxios, getApiBaseUrl, isAuthCookieMode } from '@/utils/helpers/axios-helpers';
import { AppError, unwrapSpendupEnvelope } from '@/utils/errors/app-error';

/**
 * Client Axios pour les API domaine authentifiées.
 * Ajoute le Bearer et retente une fois après refresh sur 401.
 */
const domainAxios = createApiAxios();

export type FetchFormOptions = {
    onUploadProgress?: (event: AxiosProgressEvent) => void;
    timeout?: number;
};

type SendOptions = AxiosRequestConfig & {
    /** Réponse brute (PDF, image) — pas d’enveloppe JSON. */
    binary?: boolean;
};

export const fetchWrapper = {
    get: request('GET'),
    post: request('POST'),
    put: request('PUT'),
    patch: request('PATCH'),
    delete: request('DELETE'),
    /**
     * Upload `multipart/form-data`. Ne pas forcer `Content-Type` (boundary navigateur).
     */
    postForm(url: string, body: FormData, options: FetchFormOptions = {}) {
        return send('POST', url, body, {
            timeout: options.timeout ?? 120_000,
            onUploadProgress: options.onUploadProgress
        });
    },
    /** GET binaire authentifié (`/content`, avatar uploadé). 401/404 restent du JSON enveloppé. */
    getBlob(url: string) {
        return send('GET', url, undefined, { binary: true }) as Promise<Blob>;
    }
};

function request(method: Method) {
    return (url: string, body?: unknown) => send(method, url, body);
}

async function send(method: Method, url: string, body?: unknown, extra: SendOptions = {}): Promise<unknown> {
    const { binary = false, ...axiosExtra } = extra;
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

    const doRequest = async (retried: boolean): Promise<unknown> => {
        const config: AxiosRequestConfig = {
            url: toRequestUrl(url),
            method,
            data: body,
            headers: await authHeader(url),
            validateStatus: () => true,
            ...axiosExtra
        };
        if (binary) {
            config.responseType = 'blob';
        }
        if (isForm) {
            config.transformRequest = [
                (data, headers) => {
                    if (typeof FormData !== 'undefined' && data instanceof FormData) {
                        stripJsonContentType(headers);
                    }
                    return data;
                }
            ];
        }

        try {
            const response = await domainAxios.request(config);
            return handleResponse(response.status, response.data, response.statusText, binary, async () => {
                if (retried) {
                    const err = await readEnvelopeError(response.data, response.statusText || 'Unauthorized');
                    await useAuthStore().forceReLogin(err.message);
                    return Promise.reject(new AppError(err.message, 401, err.code, err.details));
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
}

function stripJsonContentType(headers: AxiosRequestConfig['headers']) {
    if (!headers) return;
    if (typeof (headers as { delete?: (key: string) => void }).delete === 'function') {
        (headers as { delete: (key: string) => void }).delete('Content-Type');
        return;
    }
    delete (headers as Record<string, unknown>)['Content-Type'];
    delete (headers as Record<string, unknown>)['content-type'];
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
        return { ...csrfHeaderRecord() };
    }

    const token = await auth.ensureAccessToken();
    if (token) {
        return { Authorization: `Bearer ${token}` };
    }
    return {};
}

async function readEnvelopeError(data: unknown, statusText: string): Promise<{ message: string; code?: string; details?: unknown }> {
    let payload: unknown = data;
    if (typeof Blob !== 'undefined' && data instanceof Blob) {
        try {
            const text = await data.text();
            payload = text ? JSON.parse(text) : null;
        } catch {
            payload = null;
        }
    }
    const envelope = payload && typeof payload === 'object' ? (payload as { message?: string; code?: string; details?: unknown }) : null;
    return {
        message: envelope?.message || statusText || 'Request failed',
        code: envelope?.code,
        details: envelope?.details
    };
}

async function handleResponse(
    status: number,
    data: unknown,
    statusText: string,
    binary: boolean,
    retry: () => Promise<unknown>
): Promise<unknown> {
    if (status === 401) {
        const auth = useAuthStore();
        const err = await readEnvelopeError(data, statusText || 'Unauthorized');
        if (auth.refreshToken || isAuthCookieMode()) {
            const refreshed = await auth.refreshSession();
            if (refreshed) {
                return retry();
            }
        }
        // Passe le message API (ex. idle) pour la notice login si le refresh a aussi échoué.
        await auth.forceReLogin(err.message);
        return Promise.reject(new AppError(err.message, 401, err.code, err.details));
    }

    if (status >= 400) {
        const err = await readEnvelopeError(data, statusText);
        return Promise.reject(new AppError(err.message, status, err.code, err.details));
    }

    if (status === 204 || data == null || data === '') {
        return undefined;
    }

    if (binary) {
        if (typeof Blob !== 'undefined' && data instanceof Blob) return data;
        return new Blob([data as BlobPart]);
    }

    try {
        return unwrapSpendupEnvelope(data, statusText);
    } catch (e: unknown) {
        return Promise.reject(AppError.fromUnknown(e, statusText));
    }
}
