import { router } from '@/router';
import { authApi } from '@/features/auth/api';
import type { AuthSession, StepUpProof } from '@/features/auth/types';
import { rememberCsrfToken } from '@/features/auth/csrf';
import { sanitizeReturnUrl } from '@/features/auth/safe-return-url';
import { clearStoredTokens } from '@/features/auth/session-storage';
import { i18n } from '@/plugins/i18n';
import { APP_HOME_ROUTE, type AuthSessionState } from '@/features/auth/stores/internal/auth-session';
import type { AuthLogout } from '@/features/auth/stores/internal/auth-logout';
import type { AuthProfile } from '@/features/auth/stores/internal/auth-profile';
import { useVaultStore } from '@/features/vault/stores/vault-store';
import type { VaultWrapRequest } from '@/features/vault/types';

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

    function assertBearerTokens(access: string, refresh: string | null | undefined) {
        if (cookieMode) return;
        if (!access) {
            throw new Error('Jeton d’accès manquant dans la réponse d’authentification.');
        }
        if (!refresh) {
            throw new Error('Jeton de rafraîchissement manquant dans la réponse d’authentification.');
        }
    }

    /**
     * Applique une réponse d’auth (tokens ou challenge 2FA).
     * @param sessionPayload Session renvoyée par l’API.
     * @returns `'ok'` ou `'2fa'`.
     */
    async function applySession(sessionPayload: AuthSession): Promise<'ok' | '2fa'> {
        if (sessionPayload.requiresTwoFactor) {
            // Drop any prior local session so /app isn't reachable with old tokens during the challenge.
            // HttpOnly cookies d’une ancienne session : `bootstrapSession` ignore le refresh tant que
            // `twoFactorToken` est posé (voir auth-session).
            clearStoredTokens();
            session.accessToken.value = null;
            session.refreshToken.value = null;
            session.expiresAt.value = null;
            session.cookieSessionActive.value = false;
            session.user.value = null;
            twoFactorToken.value = sessionPayload.twoFactorToken;
            return '2fa';
        }
        if (cookieMode) {
            rememberCsrfToken(sessionPayload.csrfToken);
        }
        const access = sessionPayload.accessToken?.trim() || '';
        assertBearerTokens(access, sessionPayload.refreshToken);
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
        const vault = useVaultStore();
        if (outcome === '2fa') {
            // Le Coffre s’ouvre après la validation du code : on garde le mot de passe en mémoire.
            vault.rememberPassword(password);
            await router.push('/auth/two-step');
            return;
        }
        await openVaultAfterLogin(password);
        await navigateAfterLogin();
    }

    /**
     * Coffre silencieux : déballe la DEK avec le mot de passe (ou garde les clés préparées à
     * l’inscription), puis lance la migration en arrière-plan. Ne bloque jamais la connexion.
     * @param password Mot de passe saisi, ou `undefined` après la 2FA (gardé par le store).
     */
    async function openVaultAfterLogin(password?: string) {
        const vault = useVaultStore();
        try {
            await vault.unlockWithPassword(password);
        } catch {
            // Coffre indisponible : l’app fonctionne en clair.
        }
        vault.startBackgroundMigration();
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
        // Pas de mot de passe : clés déjà sur l’appareil, sinon la phrase de Coffre est demandée (hôte `/app`).
        const vault = useVaultStore();
        vault.startBackgroundMigration();
        vault.requestPhraseUnlock();
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
        // Coffre silencieux : DEK et sel générés ici, DEK emballée par le mot de passe saisi.
        const vault = useVaultStore();
        const vaultSetup = await vault.prepareRegistration(payload.password);
        let result: Awaited<ReturnType<typeof authApi.register>>;
        try {
            result = await authApi.register(vaultSetup ? { ...payload, vault: vaultSetup } : payload);
        } catch (e: unknown) {
            vault.discardRegistration();
            throw e;
        }
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
            // E-mail déjà confirmé : garder le mot de passe pour `retryPendingLogin` (UI).
            setPendingEmail(null);
            throw e;
        }
    }

    /**
     * Relance le login auto après confirm-email si le mot de passe est encore en mémoire.
     * @param email E-mail confirmé.
     */
    async function retryPendingLogin(email: string) {
        const password = pendingPassword.value;
        if (!password) {
            throw new Error(t('auth.confirmEmail.errors.missingEmail'));
        }
        await login(email.trim(), password);
        clearPendingRegistration();
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
    async function resetPassword(token: string, newPassword: string, vaultWrap?: VaultWrapRequest | null) {
        await authApi.resetPassword(token, newPassword, vaultWrap);
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
        assertBearerTokens(tokens.accessToken?.trim() || '', tokens.refreshToken);
        setTokens(tokens);
        twoFactorToken.value = null;
        await fetchMe();
        await openVaultAfterLogin();
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

    /** État du code d’assistance courant (actif, expiration, utilisé). */
    async function getSupportCodeStatus() {
        const token = await requireAccessToken();
        return authApi.getSupportCodeStatus(token);
    }

    /** Génère un code d’assistance (montré une seule fois, remplace le précédent). */
    async function generateSupportCode() {
        const token = await requireAccessToken();
        return authApi.generateSupportCode(token);
    }

    /** Accès techniques subis par l’utilisateur (page 1 = la plus récente). */
    async function getAccessLog(page: number, pageSize: number) {
        const token = await requireAccessToken();
        return authApi.getAccessLog(page, pageSize, token);
    }

    /** Registre de transparence de l’opérateur. */
    async function getTransparency() {
        const token = await requireAccessToken();
        return authApi.getTransparency(token);
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
        retryPendingLogin,
        resendVerification,
        forgotPassword,
        resetPassword,
        confirmEmailChange,
        verifyTwoFactor,
        setupTwoFactor,
        enableTwoFactor,
        disableTwoFactor,
        getSupportCodeStatus,
        generateSupportCode,
        getAccessLog,
        getTransparency,
        listDevices,
        revokeDevice,
        setDeviceTrust,
        revokeAllDevices
    };
}

export type AuthActions = ReturnType<typeof createAuthActions>;
