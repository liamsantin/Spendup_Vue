import { getDeviceInfo } from './device';
import { normalizeAuthDevices } from './normalizeDevices';
import type { ApiResponse, AuthSession, AuthTokens, Me, RegisterResult, TwoFactorSetup } from './types';

export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

function apiBaseUrl(): string {
    return (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
}

/** Low-level auth API call — does not use refresh interceptor (avoids loops). */
export async function authRequest<T>(path: string, options: RequestInit = {}, accessToken?: string | null): Promise<T> {
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
    }
    if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const res = await fetch(`${apiBaseUrl()}${path}`, { ...options, headers });

    // 204 / corps vide (ex. trust device)
    const raw = await res.text();
    if (!raw) {
        if (!res.ok) {
            throw new ApiError(res.statusText || `HTTP ${res.status}`, res.status);
        }
        return undefined as T;
    }

    let body: ApiResponse<T>;
    try {
        body = JSON.parse(raw) as ApiResponse<T>;
    } catch {
        throw new ApiError(res.statusText || `HTTP ${res.status}`, res.status);
    }

    if (!res.ok || !body.success) {
        throw new ApiError(body.message ?? `HTTP ${res.status}`, res.status);
    }

    return body.result;
}

export const authApi = {
    register(payload: {
        email?: string | null;
        username?: string | null;
        password: string;
        firstName?: string | null;
        name?: string | null;
    }) {
        return authRequest<RegisterResult>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    confirmEmail(payload: { email: string; code: string }) {
        return authRequest<null>('/api/auth/confirm-email', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    resendVerification(email: string) {
        return authRequest<null>('/api/auth/resend-verification', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },

    login(identifier: string, password: string) {
        return authRequest<AuthSession>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ identifier, password, ...getDeviceInfo() })
        });
    },

    google(idToken: string) {
        return authRequest<AuthSession>('/api/auth/google', {
            method: 'POST',
            body: JSON.stringify({ idToken, ...getDeviceInfo() })
        });
    },

    verify2fa(twoFactorToken: string, code: string) {
        return authRequest<AuthTokens>('/api/auth/2fa/verify', {
            method: 'POST',
            body: JSON.stringify({ twoFactorToken, code, ...getDeviceInfo() })
        });
    },

    refresh(refreshToken: string) {
        return authRequest<AuthTokens>('/api/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken })
        });
    },

    /**
     * Déconnexion de la session courante uniquement.
     * `refreshToken` est obligatoire côté API.
     */
    logout(refreshToken: string, accessToken?: string | null) {
        return authRequest<null>(
            '/api/auth/logout',
            {
                method: 'POST',
                body: JSON.stringify({ refreshToken })
            },
            accessToken ?? null
        );
    },

    me(accessToken: string) {
        return authRequest<Me>('/api/auth/me', { method: 'GET' }, accessToken);
    },

    setUsername(accessToken: string, username: string) {
        return authRequest<null>(
            '/api/auth/username',
            {
                method: 'PUT',
                body: JSON.stringify({ username })
            },
            accessToken
        );
    },

    forgotPassword(email: string) {
        return authRequest<null>('/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },

    resetPassword(token: string, newPassword: string) {
        return authRequest<null>('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword })
        });
    },

    changePassword(accessToken: string, currentPassword: string, newPassword: string) {
        return authRequest<null>(
            '/api/auth/password/change',
            {
                method: 'POST',
                body: JSON.stringify({ currentPassword, newPassword })
            },
            accessToken
        );
    },

    changeEmail(accessToken: string, payload: { newEmail: string; currentPassword?: string | null; googleIdToken?: string | null }) {
        return authRequest<null>(
            '/api/auth/email/change',
            {
                method: 'POST',
                body: JSON.stringify({
                    newEmail: payload.newEmail,
                    currentPassword: payload.currentPassword ?? null,
                    googleIdToken: payload.googleIdToken ?? null
                })
            },
            accessToken
        );
    },

    confirmEmailChange(email: string, code: string) {
        return authRequest<null>('/api/auth/email/confirm-change', {
            method: 'POST',
            body: JSON.stringify({ email, code })
        });
    },

    unlinkGoogle(accessToken: string, currentPassword: string) {
        return authRequest<null>(
            '/api/auth/google/unlink',
            {
                method: 'POST',
                body: JSON.stringify({ currentPassword })
            },
            accessToken
        );
    },

    deleteAccount(accessToken: string, payload: { currentPassword?: string; googleIdToken?: string }) {
        return authRequest<null>(
            '/api/auth/account',
            {
                method: 'DELETE',
                body: JSON.stringify(payload)
            },
            accessToken
        );
    },

    setup2fa(accessToken: string) {
        return authRequest<TwoFactorSetup>('/api/auth/2fa/setup', { method: 'POST' }, accessToken);
    },

    enable2fa(accessToken: string, code: string) {
        return authRequest<null>(
            '/api/auth/2fa/enable',
            {
                method: 'POST',
                body: JSON.stringify({ code })
            },
            accessToken
        );
    },

    disable2fa(accessToken: string, code: string) {
        return authRequest<null>(
            '/api/auth/2fa/disable',
            {
                method: 'POST',
                body: JSON.stringify({ code })
            },
            accessToken
        );
    },

    async listDevices(accessToken: string) {
        const result = await authRequest<unknown>('/api/auth/devices', { method: 'GET' }, accessToken);
        return normalizeAuthDevices(result);
    },

    revokeDevice(accessToken: string, deviceIdentifier: string) {
        return authRequest<null>(`/api/auth/devices/${encodeURIComponent(deviceIdentifier)}`, { method: 'DELETE' }, accessToken);
    },

    revokeAllDevices(accessToken: string) {
        return authRequest<null>('/api/auth/devices/revoke-all', { method: 'POST' }, accessToken);
    },

    trustDevice(accessToken: string, deviceIdentifier: string) {
        return authRequest<null>(`/api/auth/devices/${encodeURIComponent(deviceIdentifier)}/trust`, { method: 'POST' }, accessToken);
    }
};
