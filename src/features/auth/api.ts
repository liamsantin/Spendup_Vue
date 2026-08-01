import axios, { type AxiosRequestConfig, type Method } from 'axios';
import { authAxios } from '@/utils/helpers/axios-helpers';
import { getDeviceInfo } from './device';
import { normalizeAuthDevices } from './normalizeDevices';
import type { ApiResponse, AuthSession, AuthTokens, Me, RegisterResult, TwoFactorSetup, UpdateProfilePayload } from './types';

export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
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
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
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
            throw new ApiError(body.message ?? `HTTP ${status}`, status);
        }

        return body.result;
    } catch (e: unknown) {
        if (e instanceof ApiError) throw e;
        if (axios.isAxiosError(e)) {
            const status = e.response?.status ?? 0;
            const message = (e.response?.data as { message?: string } | undefined)?.message || e.message || `HTTP ${status}`;
            throw new ApiError(message, status);
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

    refresh(refreshToken: string) {
        return authHttp.post<AuthTokens>('/api/auth/refresh', { refreshToken });
    },

    /** Session courante uniquement — `refreshToken` obligatoire. */
    logout(refreshToken: string, accessToken?: string | null) {
        return authHttp.post<null>('/api/auth/logout', { refreshToken }, accessToken);
    },

    me(accessToken: string) {
        return authHttp.get<Me>('/api/auth/me', accessToken);
    },

    updateProfile(accessToken: string, payload: UpdateProfilePayload) {
        return authHttp.put<null>('/api/auth/profile', payload, accessToken);
    },

    setUsername(accessToken: string, username: string) {
        return authHttp.put<null>('/api/auth/username', { username }, accessToken);
    },

    forgotPassword(email: string) {
        return authHttp.post<null>('/api/auth/forgot-password', { email });
    },

    resetPassword(token: string, newPassword: string) {
        return authHttp.post<null>('/api/auth/reset-password', { token, newPassword });
    },

    changePassword(accessToken: string, currentPassword: string, newPassword: string) {
        return authHttp.post<null>('/api/auth/password/change', { currentPassword, newPassword }, accessToken);
    },

    changeEmail(accessToken: string, payload: { newEmail: string; currentPassword?: string | null; googleIdToken?: string | null }) {
        return authHttp.post<null>(
            '/api/auth/email/change',
            {
                newEmail: payload.newEmail,
                currentPassword: payload.currentPassword ?? null,
                googleIdToken: payload.googleIdToken ?? null
            },
            accessToken
        );
    },

    confirmEmailChange(email: string, code: string) {
        return authHttp.post<null>('/api/auth/email/confirm-change', { email, code });
    },

    unlinkGoogle(accessToken: string, currentPassword: string) {
        return authHttp.post<null>('/api/auth/google/unlink', { currentPassword }, accessToken);
    },

    deleteAccount(accessToken: string, payload: { currentPassword?: string; googleIdToken?: string }) {
        return authHttp.delete<null>('/api/auth/account', payload, accessToken);
    },

    setup2fa(accessToken: string) {
        return authHttp.post<TwoFactorSetup>('/api/auth/2fa/setup', undefined, accessToken);
    },

    enable2fa(accessToken: string, code: string) {
        return authHttp.post<null>('/api/auth/2fa/enable', { code }, accessToken);
    },

    disable2fa(accessToken: string, code: string) {
        return authHttp.post<null>('/api/auth/2fa/disable', { code }, accessToken);
    },

    async listDevices(accessToken: string) {
        const result = await authHttp.get<unknown>('/api/auth/devices', accessToken);
        return normalizeAuthDevices(result);
    },

    revokeDevice(accessToken: string, deviceIdentifier: string) {
        return authHttp.delete<null>(`/api/auth/devices/${encodeURIComponent(deviceIdentifier)}`, undefined, accessToken);
    },

    revokeAllDevices(accessToken: string) {
        return authHttp.post<null>('/api/auth/devices/revoke-all', undefined, accessToken);
    },

    setDeviceTrust(accessToken: string, deviceIdentifier: string, isTrusted: boolean) {
        return authHttp.put<null>(`/api/auth/devices/${encodeURIComponent(deviceIdentifier)}/trust`, { isTrusted }, accessToken);
    }
};
