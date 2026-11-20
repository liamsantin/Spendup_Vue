import { afterEach, describe, expect, it, vi } from 'vitest';

const { build, ensureAccessToken } = vi.hoisted(() => ({
    build: vi.fn(),
    ensureAccessToken: vi.fn(async () => 'demo')
}));

vi.mock('@/features/auth', () => ({
    useAuthStore: () => ({ ensureAccessToken, refreshSession: vi.fn(async () => false), accessToken: 'demo' })
}));

vi.mock('@/utils/helpers/axios-helpers', () => ({
    getApiBaseUrl: () => 'http://localhost:5124',
    isAuthCookieMode: () => false
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
            return build();
        }
    }
    return {
        HubConnectionBuilder,
        HubConnectionState: {
            Disconnected: 'Disconnected',
            Connecting: 'Connecting',
            Connected: 'Connected',
            Reconnecting: 'Reconnecting'
        },
        LogLevel: { Information: 1, Warning: 2 }
    };
});

import { startNotificationsHub } from '@/features/notifications/hub';
import { clearDemoSession, markDemoSession } from '@/features/demo/session';

/** Verrou réseau de la démo (chantier D1) : le temps réel ne s'ouvre pas. */
describe('notifications hub en démo', () => {
    afterEach(() => clearDemoSession());

    it('n’ouvre aucune connexion et ne demande aucun jeton', async () => {
        markDemoSession();
        await startNotificationsHub();
        expect(build).not.toHaveBeenCalled();
        expect(ensureAccessToken).not.toHaveBeenCalled();
    });
});
