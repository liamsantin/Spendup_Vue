import axios, { type AxiosRequestConfig, type Method } from 'axios';
import { authAxios, shouldSendBearerAuth } from '@/utils/helpers/axios-helpers';
import { getDeviceInfo } from './device';
import { normalizeAuthDevices } from './normalizeDevices';
import type {
    ApiResponse,
    AuthSession,
    AuthTokens,
    Me,
    RegisterResult,
    StepUpProof,
    TwoFactorSetup,
    UpdateProfilePayload,
    UploadAvatarResult
} from './types';

function bearerHeaders(accessToken: string | null | undefined): Record<string, string> | undefined {
    if (!shouldSendBearerAuth() || !accessToken) return undefined;
    return { Authorization: `Bearer ${accessToken}` };
}

export class ApiError extends Error {
    status: number;
    code?: string;
    details?: unknown;

    constructor(message: string, status: number, code?: string, details?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

function pickBool(source: Record<string, unknown>, ...keys: string[]): boolean | null | undefined {
    for (const key of keys) {
        const value = source[key];
        if (typeof value === 'boolean') return value;
    }
    return undefined;
}

/** Normalise /me (camelCase / snake_case) pour les flags d’auth. */
function normalizeMe(raw: Me | null | undefined): Me {
    if (!raw || typeof raw !== 'object') {
        throw new ApiError('Profil utilisateur invalide.', 0);
    }
    const source = raw as Me & Record<string, unknown>;
    const hasPassword = pickBool(source, 'hasPassword', 'has_password', 'HasPassword');
    const hasGoogle = pickBool(source, 'hasGoogle', 'has_google', 'HasGoogle', 'googleLinked', 'google_linked', 'GoogleLinked');
    return {
        ...raw,
        ...(hasPassword !== undefined ? { hasPassword } : {}),
        ...(hasGoogle !== undefined ? { hasGoogle } : {})
    };
}

/**
 * Exécute un appel auth Axios et dépaquete `{ success, message, result }`.
 * Sans interceptor refresh (évite les boucles login/refresh).
 */
async function request<T>(method: Method, path: string, data?: unknown, accessToken?: string | null): Promise<T> {
    const axiosConfig: AxiosRequestConfig = {
        url: path,
        method,
        data,
        validateStatus: () => true,
        headers: bearerHeaders(accessToken)
    };

    try {
        const res = await authAxios.request<ApiResponse<T> | '' | null>(axiosConfig);
        const status = res.status;
        const payload = res.data;

        if (payload == null || payload === '') {
            if (status >= 400) {
                throw new ApiError(res.statusText || `HTTP ${status}`, status);
            }
            return undefined as T;
        }

        if (typeof payload !== 'object') {
            throw new ApiError(res.statusText || `HTTP ${status}`, status);
        }

        const body = payload as ApiResponse<T>;
        if (status >= 400 || !body.success) {
            throw new ApiError(body.message ?? `HTTP ${status}`, status, body.code ?? undefined, body.details);
        }

        return body.result;
    } catch (e: unknown) {
        if (e instanceof ApiError) throw e;
        if (axios.isAxiosError(e)) {
            const status = e.response?.status ?? 0;
            const data = e.response?.data as { message?: string; code?: string; details?: unknown } | undefined;
            const message = data?.message || e.message || `HTTP ${status}`;
            throw new ApiError(message, status, data?.code, data?.details);
        }
        throw e;
    }
}

/**
 * Client HTTP auth — mêmes verbes qu’Axios : `.get` / `.post` / `.put` / `.delete`.
 * Signature : `(path, data?, accessToken?)` — `data` omis pour GET.
 */
export const authHttp = {
    get<T>(path: string, accessToken?: string | null) {
        return request<T>('GET', path, undefined, accessToken);
    },
    post<T>(path: string, data?: unknown, accessToken?: string | null) {
        return request<T>('POST', path, data, accessToken);
    },
    put<T>(path: string, data?: unknown, accessToken?: string | null) {
        return request<T>('PUT', path, data, accessToken);
    },
    delete<T>(path: string, data?: unknown, accessToken?: string | null) {
        return request<T>('DELETE', path, data, accessToken);
    }
};

/** @deprecated Préférer `authHttp.get/post/put/delete`. */
export function authRequest<T>(path: string, config: { method?: Method; data?: unknown } = {}, accessToken?: string | null): Promise<T> {
    return request<T>(config.method ?? 'GET', path, config.data, accessToken);
}

export const authApi = {
    register(payload: {
        email?: string | null;
        username?: string | null;
        password: string;
        firstName?: string | null;
        name?: string | null;
    }) {
        return authHttp.post<RegisterResult>('/api/auth/register', payload);
    },

    confirmEmail(payload: { email: string; code: string }) {
        return authHttp.post<null>('/api/auth/confirm-email', payload);
    },

    resendVerification(email: string) {
        return authHttp.post<null>('/api/auth/resend-verification', { email });
    },

    login(identifier: string, password: string) {
        return authHttp.post<AuthSession>('/api/auth/login', { identifier, password, ...getDeviceInfo() });
    },

    google(idToken: string) {
        return authHttp.post<AuthSession>('/api/auth/google', { idToken, ...getDeviceInfo() });
    },

    verify2fa(twoFactorToken: string, code: string) {
        return authHttp.post<AuthTokens>('/api/auth/2fa/verify', { twoFactorToken, code, ...getDeviceInfo() });
    },

    /**
     * Refresh : cookie HttpOnly et/ou body `refreshToken`.
     * `deviceIdentifier` optionnel — s’il est envoyé, doit matcher la session (sinon 401).
     */
    refresh(refreshToken?: string | null) {
        const device = getDeviceInfo();
        return authHttp.post<AuthTokens>('/api/auth/refresh', {
            ...(refreshToken ? { refreshToken } : {}),
            deviceIdentifier: device.deviceIdentifier
        });
    },

    /** Session courante — body refresh optionnel en mode cookie. */
    logout(refreshToken?: string | null, accessToken?: string | null) {
        return authHttp.post<null>('/api/auth/logout', refreshToken ? { refreshToken } : {}, accessToken);
    },

    me(accessToken?: string | null) {
        return authHttp.get<Me>('/api/auth/me', accessToken).then(normalizeMe);
    },

    updateProfile(accessToken: string | null | undefined, payload: UpdateProfilePayload) {
        return authHttp.put<null>('/api/auth/profile', payload, accessToken);
    },

    /** Avatar catalogue — `PUT /api/auth/me/avatar`. */
    setCatalogAvatar(accessToken: string | null | undefined, profilePicture: string) {
        return authHttp.put<null>('/api/auth/me/avatar', { profilePicture }, accessToken);
    },

    /** Upload multipart — champ `file` (JPEG/PNG/WebP, max 2 Mo). */
    async uploadAvatar(accessToken: string | null | undefined, file: File): Promise<UploadAvatarResult> {
        const form = new FormData();
        form.append('file', file);

        try {
            const res = await authAxios.request<ApiResponse<UploadAvatarResult> | '' | null>({
                url: '/api/auth/me/avatar',
                method: 'POST',
                data: form,
                validateStatus: () => true,
                headers: bearerHeaders(accessToken),
                // Retire le Content-Type JSON par défaut pour laisser le navigateur poser la boundary multipart.
                transformRequest: [
                    (data, headers) => {
                        if (data instanceof FormData) {
                            if (headers && typeof (headers as { delete?: (key: string) => void }).delete === 'function') {
                                (headers as { delete: (key: string) => void }).delete('Content-Type');
                            } else if (headers) {
                                delete (headers as Record<string, unknown>)['Content-Type'];
                            }
                        }
                        return data;
                    }
                ]
            });

            const status = res.status;
            const payload = res.data;

            if (payload == null || payload === '') {
                if (status >= 400) {
                    throw new ApiError(res.statusText || `HTTP ${status}`, status);
                }
                throw new ApiError('Réponse upload vide.', status);
            }

            if (typeof payload !== 'object') {
                throw new ApiError(res.statusText || `HTTP ${status}`, status);
            }

            const body = payload as ApiResponse<UploadAvatarResult>;
            if (status >= 400 || !body.success) {
                throw new ApiError(body.message ?? `HTTP ${status}`, status);
            }

            const result = body.result as UploadAvatarResult & Record<string, unknown>;
            const profilePicture =
                (typeof result?.profilePicture === 'string' && result.profilePicture) ||
                (typeof result?.ProfilePicture === 'string' && (result.ProfilePicture as string)) ||
                '';
            if (!profilePicture) {
                throw new ApiError('Hash de photo manquant dans la réponse.', status);
            }
            return { profilePicture };
        } catch (e: unknown) {
            if (e instanceof ApiError) throw e;
            if (axios.isAxiosError(e)) {
                const status = e.response?.status ?? 0;
                const message = (e.response?.data as { message?: string } | undefined)?.message || e.message || `HTTP ${status}`;
                throw new ApiError(message, status);
            }
            throw e;
        }
    },

    /** Binaire de la photo uploadée — uniquement si `profilePicture` est un hash. */
    async getAvatarBlob(accessToken: string | null | undefined): Promise<Blob> {
        try {
            const res = await authAxios.request<Blob>({
                url: '/api/auth/me/avatar',
                method: 'GET',
                responseType: 'blob',
                validateStatus: () => true,
                headers: bearerHeaders(accessToken)
            });

            if (res.status >= 400) {
                let message = res.statusText || `HTTP ${res.status}`;
                if (res.data instanceof Blob && res.data.type.includes('json')) {
                    try {
                        const json = JSON.parse(await res.data.text()) as { message?: string };
                        if (json.message) message = json.message;
                    } catch {
                        // ignore
                    }
                }
                throw new ApiError(message, res.status);
            }

            return res.data;
        } catch (e: unknown) {
            if (e instanceof ApiError) throw e;
            if (axios.isAxiosError(e)) {
                const status = e.response?.status ?? 0;
                throw new ApiError(e.message || `HTTP ${status}`, status);
            }
            throw e;
        }
    },

    deleteAvatar(accessToken: string | null | undefined) {
        return authHttp.delete<null>('/api/auth/me/avatar', undefined, accessToken);
    },

    setUsername(accessToken: string | null | undefined, username: string) {
        return authHttp.put<null>('/api/auth/username', { username }, accessToken);
    },

    forgotPassword(email: string) {
        return authHttp.post<null>('/api/auth/forgot-password', { email });
    },

    resetPassword(token: string, newPassword: string) {
        return authHttp.post<null>('/api/auth/reset-password', { token, newPassword });
    },

    changePassword(accessToken: string | null | undefined, currentPassword: string | null, newPassword: string, stepUp?: StepUpProof) {
        return authHttp.post<null>(
            '/api/auth/password/change',
            {
                currentPassword: currentPassword ?? null,
                newPassword,
                ...(stepUp ? { stepUp } : {})
            },
            accessToken
        );
    },

    changeEmail(
        accessToken: string | null | undefined,
        payload: { newEmail: string; currentPassword?: string | null; googleIdToken?: string | null; stepUp?: StepUpProof }
    ) {
        return authHttp.post<null>(
            '/api/auth/email/change',
            {
                newEmail: payload.newEmail,
                currentPassword: payload.currentPassword ?? null,
                googleIdToken: payload.googleIdToken ?? null,
                ...(payload.stepUp ? { stepUp: payload.stepUp } : {})
            },
            accessToken
        );
    },

    confirmEmailChange(email: string, code: string) {
        return authHttp.post<null>('/api/auth/email/confirm-change', { email, code });
    },

    unlinkGoogle(accessToken: string | null | undefined, currentPassword: string, stepUp?: StepUpProof) {
        return authHttp.post<null>(
            '/api/auth/google/unlink',
            {
                currentPassword,
                ...(stepUp ? { stepUp } : {})
            },
            accessToken
        );
    },

    deleteAccount(
        accessToken: string | null | undefined,
        payload: { currentPassword?: string; googleIdToken?: string; stepUp?: StepUpProof }
    ) {
        return authHttp.delete<null>('/api/auth/account', payload, accessToken);
    },

    setup2fa(accessToken: string | null | undefined) {
        return authHttp.post<TwoFactorSetup>('/api/auth/2fa/setup', undefined, accessToken);
    },

    enable2fa(accessToken: string | null | undefined, code: string) {
        return authHttp.post<null>('/api/auth/2fa/enable', { code }, accessToken);
    },

    disable2fa(accessToken: string | null | undefined, code: string) {
        return authHttp.post<null>('/api/auth/2fa/disable', { code }, accessToken);
    },

    async listDevices(accessToken: string | null | undefined) {
        const result = await authHttp.get<unknown>('/api/auth/devices', accessToken);
        return normalizeAuthDevices(result);
    },

    revokeDevice(accessToken: string | null | undefined, deviceIdentifier: string, stepUp?: StepUpProof) {
        return authHttp.delete<null>(`/api/auth/devices/${encodeURIComponent(deviceIdentifier)}`, stepUp ? { stepUp } : {}, accessToken);
    },

    revokeAllDevices(accessToken: string | null | undefined, stepUp?: StepUpProof) {
        return authHttp.post<null>('/api/auth/devices/revoke-all', stepUp ? { stepUp } : {}, accessToken);
    },

    setDeviceTrust(accessToken: string | null | undefined, deviceIdentifier: string, isTrusted: boolean, stepUp?: StepUpProof) {
        return authHttp.put<null>(
            `/api/auth/devices/${encodeURIComponent(deviceIdentifier)}/trust`,
            {
                isTrusted,
                ...(stepUp ? { stepUp } : {})
            },
            accessToken
        );
    }
};
