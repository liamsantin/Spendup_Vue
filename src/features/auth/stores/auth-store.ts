import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { router } from '@/router';
import { authApi, ApiError } from '@/features/auth/api';
import type { AuthSession, AuthTokens, Me, StepUpProof, UpdateProfilePayload } from '@/features/auth/types';
import {
    clearLegacyPendingPassword,
    clearStoredRefreshToken,
    clearStoredTokens,
    isAccessExpired,
    readAccessToken,
    readAndClearLoginNotice,
    readExpiresAt,
    readPendingEmail,
    readRefreshToken,
    writeLoginNotice,
    writePendingEmail,
    writeTokens
} from '@/features/auth/session-storage';
import { i18n } from '@/plugins/i18n';
import { useUserSettingsStore } from '@/features/user-settings';
import { useNotificationsStore } from '@/features/notifications/stores/notifications-store';
import { sanitizeReturnUrl } from '@/features/auth/safe-return-url';
import { isIdleSessionError, isIdleSessionMessage } from '@/features/auth/idle-session';
import { clearCsrfToken, rememberCsrfToken } from '@/features/auth/csrf';
import { isAuthCookieMode } from '@/utils/helpers/axios-helpers';

function t(key: string) {
    return i18n.global.t(key);
}

export const APP_HOME_ROUTE = '/app';

/** Mot de passe post-inscription — mémoire seule (jamais sessionStorage). */
let pendingPasswordMemory: string | null = null;

export const useAuthStore = defineStore('auth', () => {
    clearLegacyPendingPassword();

    const cookieMode = isAuthCookieMode();
    if (cookieMode) {
        clearStoredRefreshToken();
        // Access mémoire seule : purger un éventuel access legacy en sessionStorage.
        clearStoredTokens();
    }

    const accessToken = ref<string | null>(cookieMode ? null : readAccessToken());
    const refreshToken = ref<string | null>(cookieMode ? null : readRefreshToken());
    const expiresAt = ref<string | null>(cookieMode ? null : readExpiresAt());
    const twoFactorToken = ref<string | null>(null);
    /** E-mail en attente de confirmation après inscription. */
    const pendingEmail = ref<string | null>(readPendingEmail());
    /** Mot de passe temporaire pour login auto après confirm-email (mémoire seule). */
    const pendingPassword = ref<string | null>(pendingPasswordMemory);
    const user = ref<Me | null>(null);
    const returnUrl = ref<string | null>(null);

    /** Mutex partagé store ↔ fetchWrapper — un seul refresh à la fois. */
    let refreshInFlight: Promise<boolean> | null = null;
    /** Bootstrap cookie : un seul essai refresh silencieux au chargement. */
    let bootstrapInFlight: Promise<void> | null = null;
    let bootstrapDone = false;
    /**
     * Cookie-mode : session établie (cookies HttpOnly posés), même si l’access
     * n’est plus renvoyé dans le JSON (`ReturnAccessTokenInBody=false`).
     */
    const cookieSessionActive = ref(false);

    /** Cookie-mode : cookies HttpOnly ; legacy : access/refresh en storage. */
    const isAuthenticated = computed(() => (cookieMode ? cookieSessionActive.value : !!accessToken.value || !!refreshToken.value));

    const displayName = computed(() => {
        if (!user.value) return '';
        const parts = [user.value.firstName, user.value.name].filter(Boolean);
        if (parts.length) return parts.join(' ');
        return user.value.username || user.value.email || '';
    });

    const hasVerifiedEmail = computed(() => !!user.value?.email && user.value.emailVerified);

    function setPendingEmail(email: string | null) {
        pendingEmail.value = email;
        writePendingEmail(email);
    }

    function setPendingPassword(password: string | null) {
        pendingPasswordMemory = password;
        pendingPassword.value = password;
    }

    function clearPendingRegistration() {
        setPendingEmail(null);
        setPendingPassword(null);
    }

    function setTokens(tokens: AuthTokens) {
        const access = tokens.accessToken?.trim() ? tokens.accessToken.trim() : null;
        accessToken.value = access;
        expiresAt.value = tokens.expiresAt || null;
        if (cookieMode) {
            rememberCsrfToken(tokens.csrfToken);
            refreshToken.value = null;
            cookieSessionActive.value = true;
            writeTokens(access ?? '', null, tokens.expiresAt || null, {
                persistRefresh: false,
                persistAccess: false
            });
        } else {
            refreshToken.value = tokens.refreshToken ?? null;
            writeTokens(tokens.accessToken, tokens.refreshToken ?? null, tokens.expiresAt || null, {
                persistRefresh: true,
                persistAccess: true
            });
        }
    }

    function clearSession() {
        accessToken.value = null;
        refreshToken.value = null;
        expiresAt.value = null;
        twoFactorToken.value = null;
        cookieSessionActive.value = false;
        clearPendingRegistration();
        user.value = null;
        clearStoredTokens();
        clearCsrfToken();
        bootstrapDone = false;
        bootstrapInFlight = null;
        useUserSettingsStore().reset();
        useNotificationsStore().reset();
    }

    async function applySession(session: AuthSession): Promise<'ok' | '2fa'> {
        if (session.requiresTwoFactor) {
            twoFactorToken.value = session.twoFactorToken;
            return '2fa';
        }
        rememberCsrfToken(session.csrfToken);
        const access = session.accessToken?.trim() || '';
        if (!cookieMode && !access) {
            throw new Error('Jeton d’accès manquant dans la réponse d’authentification.');
        }
        if (!cookieMode && !session.refreshToken) {
            throw new Error('Jeton de rafraîchissement manquant dans la réponse d’authentification.');
        }
        // Cookie-mode : access peut être vide si uniquement dans `spendup_access`.
        setTokens({
            accessToken: access,
            refreshToken: session.refreshToken,
            expiresAt: session.expiresAt ?? '',
            userPublicId: session.userPublicId ?? '',
            csrfToken: session.csrfToken
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
        const session = await authApi.login(identifier.trim(), password);
        const outcome = await applySession(session);
        if (outcome === '2fa') {
            await router.push('/auth/two-step');
            return;
        }
        await navigateAfterLogin();
    }

    async function loginWithGoogle(idToken: string) {
        const session = await authApi.google(idToken);
        const outcome = await applySession(session);
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

    /** Notice idle en attente si le refresh a échoué pour inactivité (lue par `forceReLogin`). */
    let pendingIdleLogoutNotice = false;

    async function refreshSession(): Promise<boolean> {
        if (!cookieMode && !refreshToken.value) return false;
        if (refreshInFlight) return refreshInFlight;

        refreshInFlight = (async () => {
            try {
                const tokens = await authApi.refresh(cookieMode ? null : refreshToken.value);
                setTokens(tokens);
                return true;
            } catch (e: unknown) {
                if (isIdleSessionError(e)) {
                    pendingIdleLogoutNotice = true;
                }
                clearSession();
                return false;
            } finally {
                refreshInFlight = null;
            }
        })();

        return refreshInFlight;
    }

    /**
     * Mode cookie : tente un refresh silencieux (cookie HttpOnly) si pas d’access utilisable.
     * À appeler depuis le guard avant de décider login /app.
     */
    async function bootstrapSession(): Promise<void> {
        if (!cookieMode) return;
        if (bootstrapDone) return;
        if (bootstrapInFlight) return bootstrapInFlight;

        bootstrapInFlight = (async () => {
            try {
                const hasUsableAccess = !!accessToken.value && !isAccessExpired(expiresAt.value);
                if (hasUsableAccess) {
                    cookieSessionActive.value = true;
                    return;
                }
                if (cookieSessionActive.value && expiresAt.value && !isAccessExpired(expiresAt.value)) {
                    return;
                }
                await refreshSession();
            } finally {
                bootstrapDone = true;
                bootstrapInFlight = null;
            }
        })();

        return bootstrapInFlight;
    }

    async function fetchMe() {
        if (cookieMode) {
            const token = await ensureAccessToken();
            if (!cookieSessionActive.value) {
                user.value = null;
                return null;
            }
            try {
                user.value = await authApi.me(token);
                return user.value;
            } catch (e: unknown) {
                if (e instanceof ApiError && e.status === 401) {
                    const ok = await refreshSession();
                    if (ok && cookieSessionActive.value) {
                        user.value = await authApi.me(accessToken.value);
                        return user.value;
                    }
                }
                throw e;
            }
        }

        const token = await ensureAccessToken();
        if (!token) {
            user.value = null;
            return null;
        }
        try {
            user.value = await authApi.me(token);
            return user.value;
        } catch (e: unknown) {
            if (e instanceof ApiError && e.status === 401 && refreshToken.value) {
                const ok = await refreshSession();
                if (ok && accessToken.value) {
                    user.value = await authApi.me(accessToken.value);
                    return user.value;
                }
            }
            throw e;
        }
    }

    async function updateProfile(payload: UpdateProfilePayload) {
        const token = await requireAccessToken();
        await authApi.updateProfile(token, payload);
        await fetchMe();
    }

    async function setCatalogAvatar(profilePicture: string) {
        const token = await requireAccessToken();
        await authApi.setCatalogAvatar(token, profilePicture);
        await fetchMe();
    }

    async function uploadAvatar(file: File) {
        const token = await requireAccessToken();
        const result = await authApi.uploadAvatar(token, file);
        await fetchMe();
        return result;
    }

    async function deleteAvatar() {
        const token = await requireAccessToken();
        await authApi.deleteAvatar(token);
        await fetchMe();
    }

    async function fetchAvatarBlob() {
        const token = await requireAccessToken();
        return authApi.getAvatarBlob(token);
    }

    async function setUsername(username: string) {
        const token = await requireAccessToken();
        await authApi.setUsername(token, username);
        await fetchMe();
    }

    async function changeEmail(payload: {
        newEmail: string;
        currentPassword?: string | null;
        googleIdToken?: string | null;
        stepUp?: StepUpProof;
    }) {
        const token = await requireAccessToken();
        await authApi.changeEmail(token, payload);
        await fetchMe();
    }

    async function changePassword(currentPassword: string | null, newPassword: string, reLoginMessage?: string, stepUp?: StepUpProof) {
        const token = await requireAccessToken();
        await authApi.changePassword(token, currentPassword, newPassword, stepUp);
        await forceReLogin(reLoginMessage ?? t('auth.notices.passwordUpdatedRelogin'));
    }

    async function unlinkGoogle(currentPassword: string, stepUp?: StepUpProof) {
        const token = await requireAccessToken();
        await authApi.unlinkGoogle(token, currentPassword, stepUp);
        await fetchMe();
    }

    async function deleteAccount(payload: { currentPassword?: string; googleIdToken?: string; stepUp?: StepUpProof }) {
        const token = await requireAccessToken();
        await authApi.deleteAccount(token, payload);
        await forceReLogin(t('auth.notices.accountDeleted'));
    }

    async function ensureAccessToken(): Promise<string | null> {
        if (cookieMode) {
            const expired = !!expiresAt.value && isAccessExpired(expiresAt.value);
            const needsRefresh = !cookieSessionActive.value || expired;
            if (needsRefresh) {
                const ok = await refreshSession();
                return ok ? accessToken.value : null;
            }
            return accessToken.value;
        }

        const hasUsableAccess = !!accessToken.value && !isAccessExpired(expiresAt.value);
        if (hasUsableAccess) return accessToken.value;

        if (!refreshToken.value) {
            if (accessToken.value && isAccessExpired(expiresAt.value)) {
                clearSession();
            }
            return null;
        }

        const ok = await refreshSession();
        return ok ? accessToken.value : null;
    }

    /**
     * Garantit une session utilisable.
     * Cookie-mode : peut renvoyer `null` (auth via cookie HttpOnly, pas de Bearer).
     */
    async function requireAccessToken(): Promise<string | null> {
        if (cookieMode) {
            await ensureAccessToken();
            if (!cookieSessionActive.value) {
                throw new Error('Non authentifié.');
            }
            return accessToken.value;
        }
        const token = await ensureAccessToken();
        if (!token) {
            throw new Error('Non authentifié.');
        }
        return token;
    }

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
        const idleNotice = pendingIdleLogoutNotice || isIdleSessionMessage(message);
        pendingIdleLogoutNotice = false;
        await clearServerSession();
        clearSession();
        returnUrl.value = null;
        await goToLogin(idleNotice ? t('security.session.idleLogoutNotice') : message);
    }

    return {
        accessToken,
        refreshToken,
        expiresAt,
        twoFactorToken,
        pendingEmail,
        pendingPassword,
        user,
        returnUrl,
        isAuthenticated,
        displayName,
        hasVerifiedEmail,
        setPendingEmail,
        setPendingPassword,
        clearPendingRegistration,
        setTokens,
        clearSession,
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
        revokeAllDevices,
        refreshSession,
        bootstrapSession,
        fetchMe,
        updateProfile,
        setCatalogAvatar,
        uploadAvatar,
        deleteAvatar,
        fetchAvatarBlob,
        setUsername,
        changeEmail,
        changePassword,
        unlinkGoogle,
        deleteAccount,
        ensureAccessToken,
        requireAccessToken,
        logout,
        consumeLoginNotice,
        goToLogin,
        forceReLogin
    };
});
