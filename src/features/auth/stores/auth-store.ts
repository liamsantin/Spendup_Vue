import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { router } from '@/router';
import { authApi, ApiError } from '@/features/auth/api';
import type { AuthSession, AuthTokens, Me, UpdateProfilePayload } from '@/features/auth/types';
import {
    clearLegacyPendingPassword,
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
import { sanitizeReturnUrl } from '@/features/auth/safe-return-url';

function t(key: string) {
    return i18n.global.t(key);
}

export const APP_HOME_ROUTE = '/app';

/** Mot de passe post-inscription — mémoire seule (jamais sessionStorage). */
let pendingPasswordMemory: string | null = null;

export const useAuthStore = defineStore('auth', () => {
    clearLegacyPendingPassword();

    const accessToken = ref<string | null>(readAccessToken());
    const refreshToken = ref<string | null>(readRefreshToken());
    const expiresAt = ref<string | null>(readExpiresAt());
    const twoFactorToken = ref<string | null>(null);
    /** E-mail en attente de confirmation après inscription. */
    const pendingEmail = ref<string | null>(readPendingEmail());
    /** Mot de passe temporaire pour login auto après confirm-email (mémoire seule). */
    const pendingPassword = ref<string | null>(pendingPasswordMemory);
    const user = ref<Me | null>(null);
    const returnUrl = ref<string | null>(null);

    /** Mutex partagé store ↔ fetchWrapper — un seul refresh à la fois. */
    let refreshInFlight: Promise<boolean> | null = null;

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
        pendingPasswordMemory = password;
        pendingPassword.value = password;
    }

    function clearPendingRegistration() {
        setPendingEmail(null);
        setPendingPassword(null);
    }

    function setTokens(tokens: AuthTokens) {
        accessToken.value = tokens.accessToken;
        refreshToken.value = tokens.refreshToken;
        expiresAt.value = tokens.expiresAt || null;
        writeTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresAt || null);
    }

    function clearSession() {
        accessToken.value = null;
        refreshToken.value = null;
        expiresAt.value = null;
        twoFactorToken.value = null;
        clearPendingRegistration();
        user.value = null;
        clearStoredTokens();
        useUserSettingsStore().reset();
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
        await forceReLogin(t('auth.notices.allSessionsRevoked'));
    }

    async function refreshSession(): Promise<boolean> {
        if (!refreshToken.value) return false;
        if (refreshInFlight) return refreshInFlight;

        refreshInFlight = (async () => {
            try {
                const tokens = await authApi.refresh(refreshToken.value!);
                setTokens(tokens);
                return true;
            } catch {
                clearSession();
                return false;
            } finally {
                refreshInFlight = null;
            }
        })();

        return refreshInFlight;
    }

    async function fetchMe() {
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

    async function changeEmail(payload: { newEmail: string; currentPassword?: string | null; googleIdToken?: string | null }) {
        const token = await requireAccessToken();
        await authApi.changeEmail(token, payload);
        await fetchMe();
    }

    async function changePassword(currentPassword: string | null, newPassword: string, reLoginMessage?: string) {
        const token = await requireAccessToken();
        await authApi.changePassword(token, currentPassword, newPassword);
        await forceReLogin(reLoginMessage ?? t('auth.notices.passwordUpdatedRelogin'));
    }

    async function unlinkGoogle(currentPassword: string) {
        const token = await requireAccessToken();
        await authApi.unlinkGoogle(token, currentPassword);
        await fetchMe();
    }

    async function deleteAccount(payload: { currentPassword?: string; googleIdToken?: string }) {
        const token = await requireAccessToken();
        await authApi.deleteAccount(token, {
            currentPassword: payload.currentPassword,
            googleIdToken: payload.googleIdToken
        });
        await forceReLogin(t('auth.notices.accountDeleted'));
    }

    async function ensureAccessToken(): Promise<string | null> {
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
