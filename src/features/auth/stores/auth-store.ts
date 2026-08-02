import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { router } from '@/router';
import { authApi } from '@/features/auth/api';
import type { AuthSession, AuthTokens, Me, UpdateProfilePayload } from '@/features/auth/types';

export const APP_HOME_ROUTE = '/app';

const REFRESH_KEY = 'spendup_refresh_token';
const ACCESS_KEY = 'spendup_access_token';
const PENDING_EMAIL_KEY = 'spendup_pending_email';
const PENDING_PASSWORD_KEY = 'spendup_pending_password';
const LOGIN_NOTICE_KEY = 'spendup_login_notice';

function readRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
}

function readAccessToken(): string | null {
    return sessionStorage.getItem(ACCESS_KEY);
}

function readPendingEmail(): string | null {
    return sessionStorage.getItem(PENDING_EMAIL_KEY);
}

function writePendingEmail(email: string | null) {
    if (email) {
        sessionStorage.setItem(PENDING_EMAIL_KEY, email);
    } else {
        sessionStorage.removeItem(PENDING_EMAIL_KEY);
    }
}

function readPendingPassword(): string | null {
    return sessionStorage.getItem(PENDING_PASSWORD_KEY);
}

function writePendingPassword(password: string | null) {
    if (password) {
        sessionStorage.setItem(PENDING_PASSWORD_KEY, password);
    } else {
        sessionStorage.removeItem(PENDING_PASSWORD_KEY);
    }
}

function writeLoginNotice(message: string | null) {
    if (message) {
        sessionStorage.setItem(LOGIN_NOTICE_KEY, message);
    } else {
        sessionStorage.removeItem(LOGIN_NOTICE_KEY);
    }
}

function readAndClearLoginNotice(): string | null {
    const message = sessionStorage.getItem(LOGIN_NOTICE_KEY);
    sessionStorage.removeItem(LOGIN_NOTICE_KEY);
    return message;
}

export const useAuthStore = defineStore('auth', () => {
    const accessToken = ref<string | null>(readAccessToken());
    const refreshToken = ref<string | null>(readRefreshToken());
    const twoFactorToken = ref<string | null>(null);
    /** E-mail en attente de confirmation après inscription. */
    const pendingEmail = ref<string | null>(readPendingEmail());
    /** Mot de passe temporaire pour login auto après confirm-email (sessionStorage). */
    const pendingPassword = ref<string | null>(readPendingPassword());
    const user = ref<Me | null>(null);
    const returnUrl = ref<string | null>(null);

    const isAuthenticated = computed(() => !!refreshToken.value || !!accessToken.value);

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
        pendingPassword.value = password;
        writePendingPassword(password);
    }

    function clearPendingRegistration() {
        setPendingEmail(null);
        setPendingPassword(null);
    }

    function setTokens(tokens: AuthTokens) {
        accessToken.value = tokens.accessToken;
        refreshToken.value = tokens.refreshToken;
        sessionStorage.setItem(ACCESS_KEY, tokens.accessToken);
        localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    }

    function clearSession() {
        accessToken.value = null;
        refreshToken.value = null;
        twoFactorToken.value = null;
        clearPendingRegistration();
        user.value = null;
        sessionStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
    }

    async function applySession(session: AuthSession): Promise<'ok' | '2fa'> {
        if (session.requiresTwoFactor) {
            twoFactorToken.value = session.twoFactorToken;
            return '2fa';
        }
        if (!session.accessToken || !session.refreshToken) {
            throw new Error('Jetons manquants dans la réponse d’authentification.');
        }
        setTokens({
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            expiresAt: session.expiresAt ?? '',
            userPublicId: session.userPublicId ?? ''
        });
        twoFactorToken.value = null;
        await fetchMe();
        return 'ok';
    }

    async function navigateAfterLogin() {
        const target = returnUrl.value || APP_HOME_ROUTE;
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
            await goToLogin('E-mail confirmé. Veuillez vous connecter.');
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
        await goToLogin('Mot de passe mis à jour. Veuillez vous connecter.');
    }

    async function confirmEmailChange(email: string, code: string) {
        await authApi.confirmEmailChange(email, code);
        await forceReLogin('E-mail mis à jour. Veuillez vous reconnecter.');
    }

    async function verifyTwoFactor(code: string) {
        if (!twoFactorToken.value) {
            throw new Error('Session 2FA expirée. Veuillez vous reconnecter.');
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

    async function revokeDevice(deviceIdentifier: string) {
        const token = await requireAccessToken();
        await authApi.revokeDevice(token, deviceIdentifier);
    }

    async function setDeviceTrust(deviceIdentifier: string, isTrusted: boolean) {
        const token = await requireAccessToken();
        await authApi.setDeviceTrust(token, deviceIdentifier, isTrusted);
    }

    /** Révoque toutes les sessions (y compris l’appareil courant) → force re-login. */
    async function revokeAllDevices() {
        const token = await requireAccessToken();
        await authApi.revokeAllDevices(token);
        await forceReLogin('Toutes les sessions ont été déconnectées. Veuillez vous reconnecter.');
    }

    async function refreshSession(): Promise<boolean> {
        if (!refreshToken.value) return false;
        try {
            const tokens = await authApi.refresh(refreshToken.value);
            setTokens(tokens);
            return true;
        } catch {
            clearSession();
            return false;
        }
    }

    async function fetchMe() {
        const token = await ensureAccessToken();
        if (!token) {
            user.value = null;
            return null;
        }
        user.value = await authApi.me(token);
        return user.value;
    }

    async function updateProfile(payload: UpdateProfilePayload) {
        const token = await requireAccessToken();
        await authApi.updateProfile(token, payload);
        await fetchMe();
    }

    async function setUsername(username: string) {
        const token = await requireAccessToken();
        await authApi.setUsername(token, username);
        await fetchMe();
    }

    async function changeEmail(payload: { newEmail: string; currentPassword?: string | null; googleIdToken?: string | null }) {
        const token = await requireAccessToken();
        await authApi.changeEmail(token, payload);
        await fetchMe();
    }

    async function changePassword(currentPassword: string | null, newPassword: string, reLoginMessage?: string) {
        const token = await requireAccessToken();
        await authApi.changePassword(token, currentPassword, newPassword);
        await forceReLogin(reLoginMessage ?? 'Mot de passe mis à jour. Veuillez vous reconnecter.');
    }

    async function deleteAccount(payload: { currentPassword?: string; googleIdToken?: string }) {
        const token = await requireAccessToken();
        await authApi.deleteAccount(token, {
            currentPassword: payload.currentPassword,
            googleIdToken: payload.googleIdToken
        });
        await forceReLogin('Votre compte a été définitivement supprimé.');
    }

    async function ensureAccessToken(): Promise<string | null> {
        if (accessToken.value) return accessToken.value;
        if (!refreshToken.value) return null;
        const ok = await refreshSession();
        return ok ? accessToken.value : null;
    }

    async function requireAccessToken(): Promise<string> {
        const token = await ensureAccessToken();
        if (!token) {
            throw new Error('Non authentifié.');
        }
        return token;
    }

    async function logout() {
        const refresh = refreshToken.value;
        const access = accessToken.value;
        try {
            if (refresh) {
                await authApi.logout(refresh, access);
            }
        } catch {
            // Always clear local session
        }
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
        clearSession();
        returnUrl.value = null;
        await goToLogin(message);
    }

    return {
        accessToken,
        refreshToken,
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
        fetchMe,
        updateProfile,
        setUsername,
        changeEmail,
        changePassword,
        deleteAccount,
        ensureAccessToken,
        requireAccessToken,
        logout,
        consumeLoginNotice,
        goToLogin,
        forceReLogin
    };
});
