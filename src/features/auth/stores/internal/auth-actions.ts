import { router } from '@/router';
import { authApi } from '@/features/auth/api';
import type { AuthSession, StepUpProof } from '@/features/auth/types';
import { rememberCsrfToken } from '@/features/auth/csrf';
import { sanitizeReturnUrl } from '@/features/auth/safe-return-url';
import { i18n } from '@/plugins/i18n';
import { APP_HOME_ROUTE, type AuthSessionState } from './auth-session';
import type { AuthLogout } from './auth-logout';
import type { AuthProfile } from './auth-profile';

function t(key: string) {
    return i18n.global.t(key);
}

type ActionsDeps = Pick<AuthProfile, 'fetchMe'> & Pick<AuthLogout, 'goToLogin' | 'forceReLogin'>;

/**
 * Actions auth : login, register, 2FA, devices, applySession.
 * @param session État session partagé.
 * @param deps Profil (fetchMe) et logout (goToLogin / forceReLogin).
 * @returns Les actions d’authentification.
 */
export function createAuthActions(session: AuthSessionState, deps: ActionsDeps) {
    const {
        cookieMode,
        twoFactorToken,
        pendingPassword,
        returnUrl,
        setPendingEmail,
        setPendingPassword,
        clearPendingRegistration,
        setTokens,
        requireAccessToken
    } = session;

    const { fetchMe, goToLogin, forceReLogin } = deps;

    async function applySession(sessionPayload: AuthSession): Promise<'ok' | '2fa'> {
        if (sessionPayload.requiresTwoFactor) {
            twoFactorToken.value = sessionPayload.twoFactorToken;
            return '2fa';
        }
        rememberCsrfToken(sessionPayload.csrfToken);
        const access = sessionPayload.accessToken?.trim() || '';
        if (!cookieMode && !access) {
            throw new Error('Jeton d’accès manquant dans la réponse d’authentification.');
        }
        if (!cookieMode && !sessionPayload.refreshToken) {
            throw new Error('Jeton de rafraîchissement manquant dans la réponse d’authentification.');
        }
        // Cookie-mode : access peut être vide si uniquement dans `spendup_access`.
        setTokens({
            accessToken: access,
            refreshToken: sessionPayload.refreshToken,
            expiresAt: sessionPayload.expiresAt ?? '',
            userPublicId: sessionPayload.userPublicId ?? '',
            csrfToken: sessionPayload.csrfToken
        });
        twoFactorToken.value = null;
        await fetchMe();
        return 'ok';
    }

    async function navigateAfterLogin() {
        const target = sanitizeReturnUrl(returnUrl.value, APP_HOME_ROUTE);
        returnUrl.value = null;
        await router.push(target);
    }

    async function login(identifier: string, password: string) {
        const authSession = await authApi.login(identifier.trim(), password);
        const outcome = await applySession(authSession);
        if (outcome === '2fa') {
            await router.push('/auth/two-step');
            return;
        }
        await navigateAfterLogin();
    }

    async function loginWithGoogle(idToken: string) {
        const authSession = await authApi.google(idToken);
        const outcome = await applySession(authSession);
        if (outcome === '2fa') {
            await router.push('/auth/two-step');
            return;
        }
        await navigateAfterLogin();
    }

    async function register(payload: {
        email?: string | null;
        username?: string | null;
        password: string;
        firstName?: string | null;
        name?: string | null;
    }) {
        const result = await authApi.register(payload);
        if (result.email) {
            setPendingEmail(result.email);
            setPendingPassword(payload.password);
            // replace : le retour arrière ne ramène pas sur un formulaire d’inscription déjà consommé
            await router.replace({
                path: '/auth/confirm-email',
                query: { email: result.email }
            });
            return { outcome: 'confirm-email' as const, result };
        }
        const identifier = result.username || payload.username || payload.email;
        if (!identifier) {
            throw new Error('Identifiant manquant après inscription.');
        }
        await login(identifier, payload.password);
        return { outcome: 'logged-in' as const, result };
    }

    async function confirmEmail(email: string, code: string) {
        await authApi.confirmEmail({ email, code });
        const password = pendingPassword.value;
        clearPendingRegistration();
        if (!password) {
            await goToLogin(t('auth.notices.emailConfirmed'));
            return;
        }
        await login(email, password);
    }

    async function resendVerification(email: string) {
        await authApi.resendVerification(email);
    }

    async function forgotPassword(email: string) {
        await authApi.forgotPassword(email);
    }

    async function resetPassword(token: string, newPassword: string) {
        await authApi.resetPassword(token, newPassword);
        await goToLogin(t('auth.notices.passwordUpdated'));
    }

    async function confirmEmailChange(email: string, code: string) {
        await authApi.confirmEmailChange(email, code);
        await forceReLogin(t('auth.notices.emailUpdated'));
    }

    async function verifyTwoFactor(code: string) {
        if (!twoFactorToken.value) {
            throw new Error(t('auth.notices.twoFactorExpired'));
        }
        const tokens = await authApi.verify2fa(twoFactorToken.value, code);
        setTokens(tokens);
        twoFactorToken.value = null;
        await fetchMe();
        await navigateAfterLogin();
    }

    async function setupTwoFactor() {
        const token = await requireAccessToken();
        return authApi.setup2fa(token);
    }

    async function enableTwoFactor(code: string) {
        const token = await requireAccessToken();
        await authApi.enable2fa(token, code);
        await fetchMe();
    }

    async function disableTwoFactor(code: string) {
        const token = await requireAccessToken();
        await authApi.disable2fa(token, code);
        await fetchMe();
    }

    async function listDevices() {
        const token = await requireAccessToken();
        return authApi.listDevices(token);
    }

    async function revokeDevice(deviceIdentifier: string, stepUp?: StepUpProof) {
        const token = await requireAccessToken();
        await authApi.revokeDevice(token, deviceIdentifier, stepUp);
    }

    async function setDeviceTrust(deviceIdentifier: string, isTrusted: boolean, stepUp?: StepUpProof) {
        const token = await requireAccessToken();
        await authApi.setDeviceTrust(token, deviceIdentifier, isTrusted, stepUp);
    }

    /** Révoque toutes les sessions (y compris l’appareil courant) → force re-login. */
    async function revokeAllDevices(stepUp?: StepUpProof) {
        const token = await requireAccessToken();
        await authApi.revokeAllDevices(token, stepUp);
        await forceReLogin(t('auth.notices.allSessionsRevoked'));
    }

    return {
        applySession,
        navigateAfterLogin,
        login,
        loginWithGoogle,
        register,
        confirmEmail,
        resendVerification,
        forgotPassword,
        resetPassword,
        confirmEmailChange,
        verifyTwoFactor,
        setupTwoFactor,
        enableTwoFactor,
        disableTwoFactor,
        listDevices,
        revokeDevice,
        setDeviceTrust,
        revokeAllDevices
    };
}

export type AuthActions = ReturnType<typeof createAuthActions>;
