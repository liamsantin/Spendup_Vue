import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const { logoutApi, push } = vi.hoisted(() => ({
    logoutApi: vi.fn(async () => null),
    push: vi.fn(async () => undefined)
}));

vi.mock('@/router', () => ({ router: { push, currentRoute: { value: { fullPath: '/demo' } } } }));
vi.mock('@/features/auth/api', () => ({ authApi: { logout: logoutApi } }));
vi.mock('@/plugins/i18n', () => ({ i18n: { global: { t: (key: string) => key } } }));
vi.mock('@/features/auth/stores/internal/auth-session', () => ({ APP_HOME_ROUTE: '/app', AUTH_ROUTE: '/auth' }));

import { createAuthLogout } from '@/features/auth/stores/internal/auth-logout';
import type { AuthSessionState } from '@/features/auth/stores/internal/auth-session';
import { clearDemoSession, markDemoSession } from '@/features/demo/session';

function sessionFor(cookieMode: boolean) {
    const clearSession = vi.fn();
    const session = {
        cookieMode,
        accessToken: ref<string | null>('demo'),
        refreshToken: ref<string | null>(cookieMode ? null : 'refresh'),
        returnUrl: ref<string | null>(null),
        returnUrlOwner: ref<string | null>(null),
        user: ref(null),
        pendingIdleLogoutNotice: ref(false),
        clearSession
    } as unknown as AuthSessionState;
    return { session, clearSession };
}

/** Verrou réseau de la démo (chantier D1) : se déconnecter ne parle pas à l'API. */
describe('déconnexion en démo', () => {
    beforeEach(() => {
        logoutApi.mockClear();
        push.mockClear();
    });

    afterEach(() => clearDemoSession());

    it.each([true, false])('n’appelle pas l’API (mode cookies : %s)', async (cookieMode) => {
        markDemoSession();
        const { session, clearSession } = sessionFor(cookieMode);

        await createAuthLogout(session).logout();

        expect(logoutApi).not.toHaveBeenCalled();
        expect(clearSession).toHaveBeenCalled();
    });

    it('révoque toujours la session serveur hors démo', async () => {
        const { session } = sessionFor(true);
        await createAuthLogout(session).logout();
        expect(logoutApi).toHaveBeenCalledTimes(1);
    });
});
