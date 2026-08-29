import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ensureAccessToken, refreshSession, accessTokenRef } = vi.hoisted(() => {
    const accessTokenRef = { value: null as string | null };
    return {
        accessTokenRef,
        ensureAccessToken: vi.fn(async () => accessTokenRef.value),
        refreshSession: vi.fn(async () => false)
    };
});

vi.mock('@/features/auth', () => ({
    useAuthStore: () => ({
        ensureAccessToken,
        refreshSession,
        get accessToken() {
            return accessTokenRef.value;
        }
    })
}));

vi.mock('@/utils/helpers/axios-helpers', () => ({
    getApiBaseUrl: () => 'http://localhost:5124',
    isAuthCookieMode: () => true
}));

vi.mock('@microsoft/signalr', () => {
    class HubConnectionBuilder {
        withUrl() {
            return this;
        }
        withAutomaticReconnect() {
            return this;
        }
        configureLogging() {
            return this;
        }
        build() {
            return {
                state: 0,
                on: vi.fn(),
                off: vi.fn(),
                onreconnected: vi.fn(),
                start: vi.fn().mockResolvedValue(undefined),
                stop: vi.fn().mockResolvedValue(undefined)
            };
        }
    }
    return {
        HubConnectionBuilder,
        HubConnectionState: { Connected: 1, Disconnected: 0 },
        LogLevel: { Information: 1, Warning: 2 }
    };
});

describe('notifications hub access token', () => {
    beforeEach(() => {
        vi.resetModules();
        accessTokenRef.value = null;
        ensureAccessToken.mockReset().mockImplementation(async () => accessTokenRef.value);
        refreshSession.mockReset().mockResolvedValue(false);
    });

    it('échoue clairement sans JWT mémoire (cookie Path=/api hors /hubs)', async () => {
        const { startNotificationsHub, HUB_ACCESS_TOKEN_REQUIRED } = await import('../hub');
        await expect(startNotificationsHub()).rejects.toThrow(HUB_ACCESS_TOKEN_REQUIRED);
    });

    it('utilise le token renvoyé après refresh', async () => {
        ensureAccessToken.mockResolvedValueOnce(null);
        refreshSession.mockResolvedValueOnce(true);
        accessTokenRef.value = 'hub-jwt';
        // Après refresh, ensureAccessToken n’est plus rappelé dans factory — lit auth.accessToken
        const { startNotificationsHub } = await import('../hub');
        await expect(startNotificationsHub()).resolves.toBeUndefined();
        expect(refreshSession).toHaveBeenCalled();
    });
});
