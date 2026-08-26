import { router } from '@/router';
import { authApi } from '@/features/auth/api';
import { readAndClearLoginNotice, writeLoginNotice } from '@/features/auth/session-storage';
import { i18n } from '@/plugins/i18n';
import { isIdleSessionMessage } from '@/features/auth/idle-session';
import { sanitizeReturnUrl } from '@/features/auth/safe-return-url';
import { APP_HOME_ROUTE, type AuthSessionState } from '@/features/auth/stores/internal/auth-session';

function t(key: string) {
    return i18n.global.t(key);
}

/**
 * Logout, notices login, force re-login.
 * @param session État session partagé.
 * @returns Les actions de logout / navigation login.
 */
export function createAuthLogout(session: AuthSessionState) {
    const { cookieMode, accessToken, refreshToken, returnUrl, pendingIdleLogoutNotice, clearSession } = session;

    /** Appelle l’API logout serveur (ignore les erreurs). */
    async function clearServerSession() {
        try {
            if (cookieMode) {
                await authApi.logout(null, accessToken.value);
            } else if (refreshToken.value) {
                await authApi.logout(refreshToken.value, accessToken.value);
            }
        } catch {
            // Toujours effacer la session locale
        }
    }

    /** Déconnexion complète puis redirection vers `/`. */
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

    /**
     * Redirige vers la page de login avec une notice optionnelle.
     * @param message Message à afficher une fois sur /auth/login.
     */
    async function goToLogin(message?: string) {
        writeLoginNotice(message ?? null);
        await router.push('/auth/login');
    }

    /**
     * Conserve un deep-link `/app…` pour le login suivant (idle, 401, guard).
     * Ne remplace pas un `returnUrl` déjà posé (ex. par le guard).
     */
    function preserveReturnUrlForReLogin() {
        if (returnUrl.value) return;
        const fullPath = router.currentRoute?.value?.fullPath;
        if (!fullPath) return;
        returnUrl.value = sanitizeReturnUrl(fullPath, APP_HOME_ROUTE);
    }

    /**
     * Force un re-login après invalidation JWT (mdp / e-mail / idle).
     * Préserve `returnUrl` (posé par le guard ou la route courante).
     * @param message Message optionnel (sinon notice idle si applicable).
     */
    async function forceReLogin(message?: string) {
        const idleNotice = pendingIdleLogoutNotice.value || isIdleSessionMessage(message);
        pendingIdleLogoutNotice.value = false;
        preserveReturnUrlForReLogin();
        const preservedReturnUrl = returnUrl.value;
        await clearServerSession();
        clearSession();
        returnUrl.value = preservedReturnUrl;
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
