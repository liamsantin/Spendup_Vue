import { router } from '@/router';
import { authApi } from '@/features/auth/api';
import type { AuthSession, StepUpProof } from '@/features/auth/types';
import { rememberCsrfToken } from '@/features/auth/csrf';
import { sanitizeReturnUrl } from '@/features/auth/safe-return-url';
import { i18n } from '@/plugins/i18n';
import { APP_HOME_ROUTE, type AuthSessionState } from '@/features/auth/stores/internal/auth-session';
import type { AuthLogout } from '@/features/auth/stores/internal/auth-logout';
import type { AuthProfile } from '@/features/auth/stores/internal/auth-profile';

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

    /**
     * Applique une réponse d’auth (tokens ou challenge 2FA).
     * @param sessionPayload Session renvoyée par l’API.
     * @returns `'ok'` ou `'2fa'`.
     */
    async function applySession(sessionPayload: AuthSession): Promise<'ok' | '2fa'> {
        if (sessionPayload.requiresTwoFactor) {
            // Drop any prior session so /app isn't reachable with old tokens during the challenge.
            session.accessToken.value = null;
            session.refreshToken.value = null;
            session.expiresAt.value = null;
            session.cookieSessionActive.value = false;
            session.user.value = null;
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

    /** Navigue vers `returnUrl` sanitisé (ou l’accueil app). */
    async function navigateAfterLogin() {
        const target = sanitizeReturnUrl(returnUrl.value, APP_HOME_ROUTE);
        returnUrl.value = null;
        await router.push(target);
    }

    /**
     * Connexion e-mail/username + mot de passe.
     * @param identifier E-mail ou username.
     * @param password Mot de passe.
     */
    async function login(identifier: string, password: string) {
        const authSession = await authApi.login(identifier.trim(), password);
        const outcome = await applySession(authSession);
        if (outcome === '2fa') {
            await router.push('/auth/two-step');
            return;
        }
        await navigateAfterLogin();
    }

    /**
     * Connexion via Google One Tap / bouton.
     * @param idToken Jeton d’identité Google.
     */
    async function loginWithGoogle(idToken: string) {
        const authSession = await authApi.google(idToken);
        const outcome = await applySession(authSession);
        if (outcome === '2fa') {
            await router.push('/auth/two-step');
            return;
        }
        await navigateAfterLogin();
    }

    /**
     * Inscription ; redirige vers confirm-email ou connecte directement.
     * @param payload Données d’inscription.
     */
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

    /**
     * Confirme l’e-mail d’inscription puis login auto si mot de passe en mémoire.
     * @param email E-mail à confirmer.
     * @param code Code de vérification.
     */
    async function confirmEmail(email: string, code: string) {
        await authApi.confirmEmail({ email, code });
        const password = pendingPassword.value;
        if (!password) {
            clearPendingRegistration();
            await goToLogin(t('auth.notices.emailConfirmed'));
            return;
        }
        try {
            await login(email, password);
            clearPendingRegistration();
        } catch (e: unknown) {
            // E-mail déjà confirmé : garder le mot de passe en mémoire pour un retry / login manuel.
            setPendingEmail(null);
            throw e;
        }
    }

    /**
     * Renvoie l’e-mail de vérification.
     * @param email Destinataire.
     */
    async function resendVerification(email: string) {
        await authApi.resendVerification(email);
    }

    /**
     * Déclenche le flux mot de passe oublié.
     * @param email Destinataire.
     */
    async function forgotPassword(email: string) {
        await authApi.forgotPassword(email);
    }

    /**
     * Réinitialise le mot de passe via token e-mail.
     * @param token Token de reset.
     * @param newPassword Nouveau mot de passe.
     */
    async function resetPassword(token: string, newPassword: string) {
        await authApi.resetPassword(token, newPassword);
        await goToLogin(t('auth.notices.passwordUpdated'));
    }

    /**
     * Confirme un changement d’e-mail puis force un re-login.
     * @param email Nouvel e-mail.
     * @param code Code de vérification.
     */
    async function confirmEmailChange(email: string, code: string) {
        await authApi.confirmEmailChange(email, code);
        await forceReLogin(t('auth.notices.emailUpdated'));
    }

    /**
     * Valide le code 2FA et finalise la session.
     * @param code Code TOTP / SMS.
     */
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

    /** Démarre la configuration 2FA (QR / secret). */
    async function setupTwoFactor() {
        const token = await requireAccessToken();
        return authApi.setup2fa(token);
    }

    /**
     * Active la 2FA avec un code de confirmation.
     * @param code Code TOTP.
     */
    async function enableTwoFactor(code: string) {
        const token = await requireAccessToken();
        await authApi.enable2fa(token, code);
        await fetchMe();
    }

    /**
     * Désactive la 2FA.
     * @param code Code TOTP.
     */
    async function disableTwoFactor(code: string) {
        const token = await requireAccessToken();
        await authApi.disable2fa(token, code);
        await fetchMe();
    }

    /** Liste les appareils / sessions connus. */
    async function listDevices() {
        const token = await requireAccessToken();
        return authApi.listDevices(token);
    }

    /**
     * Révoque un appareil.
     * @param deviceIdentifier Identifiant de l’appareil.
     * @param stepUp Preuve step-up optionnelle.
     */
    async function revokeDevice(deviceIdentifier: string, stepUp?: StepUpProof) {
        const token = await requireAccessToken();
        await authApi.revokeDevice(token, deviceIdentifier, stepUp);
    }

    /**
     * Marque un appareil comme de confiance (ou non).
     * @param deviceIdentifier Identifiant de l’appareil.
     * @param isTrusted Nouvelle valeur.
     * @param stepUp Preuve step-up optionnelle.
     */
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
