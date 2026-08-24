import { router } from '@/router';
import { authApi } from '@/features/auth/api';
import {
    readAndClearLoginNotice,
    writeLoginNotice
} from '@/features/auth/session-storage';
import { i18n } from '@/plugins/i18n';
import { isIdleSessionMessage } from '@/features/auth/idle-session';
import type { AuthSessionState } from '@/features/auth/stores/internal/auth-session';

function t(key: string) {
    return i18n.global.t(key);
}

/**
 * Logout, notices login, force re-login.
 * @param session État session partagé.
 * @returns Les actions de logout / navigation login.
 */
export function createAuthLogout(session: AuthSessionState) {
    const {
        cookieMode,
        accessToken,
        refreshToken,
        returnUrl,
        pendingIdleLogoutNotice,
        clearSession
    } = session;

    async function clearServerSession() {
        try {
            if (cookieMode) {
                await authApi.logout(null, accessToken.value);
            } else if (refreshToken.value) {
                await authApi.logout(refreshToken.value, accessToken.value);
            }
        } catch {
            // Always clear local session
        }
    }

    async function logout() {
        await clearServerSession();
        clearSession();
        returnUrl.value = null;
        await router.push('/');
    }

    /** Notice affichée une fois sur /auth/login (sessionStorage, pas dans l’URL). */
    function consumeLoginNotice(): string | null {
        return readAndClearLoginNotice();
    }

    async function goToLogin(message?: string) {
        writeLoginNotice(message ?? null);
        await router.push('/auth/login');
    }

    /** Force re-login after password/email change invalidates JWT. */
    async function forceReLogin(message?: string) {
        const idleNotice = pendingIdleLogoutNotice.value || isIdleSessionMessage(message);
        pendingIdleLogoutNotice.value = false;
        await clearServerSession();
        clearSession();
        returnUrl.value = null;
        await goToLogin(idleNotice ? t('security.session.idleLogoutNotice') : message);
    }

    return {
        clearServerSession,
        logout,
        consumeLoginNotice,
        goToLogin,
        forceReLogin
    };
}

export type AuthLogout = ReturnType<typeof createAuthLogout>;
