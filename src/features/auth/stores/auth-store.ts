import { defineStore } from 'pinia';
import { router } from '@/router';
import { authApi } from '@/features/auth/api';
import type { AuthSession, AuthTokens, Me, UpdateProfilePayload } from '@/features/auth/types';

export const APP_HOME_ROUTE = '/app';

const REFRESH_KEY = 'spendup_refresh_token';
const ACCESS_KEY = 'spendup_access_token';
const PENDING_EMAIL_KEY = 'spendup_pending_email';
const PENDING_PASSWORD_KEY = 'spendup_pending_password';

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

export const useAuthStore = defineStore('auth', {
    state: () => ({
        accessToken: readAccessToken() as string | null,
        refreshToken: readRefreshToken() as string | null,
        twoFactorToken: null as string | null,
        /** E-mail en attente de confirmation après inscription. */
        pendingEmail: readPendingEmail() as string | null,
        /** Mot de passe temporaire pour login auto après confirm-email (sessionStorage). */
        pendingPassword: readPendingPassword() as string | null,
        user: null as Me | null,
        returnUrl: null as string | null
    }),
    getters: {
        isAuthenticated: (state) => !!state.refreshToken || !!state.accessToken,
        displayName: (state) => {
            if (!state.user) return '';
            const parts = [state.user.firstName, state.user.name].filter(Boolean);
            if (parts.length) return parts.join(' ');
            return state.user.username || state.user.email || '';
        },
        hasVerifiedEmail: (state) => !!state.user?.email && state.user.emailVerified
    },
    actions: {
        setPendingEmail(email: string | null) {
            this.pendingEmail = email;
            writePendingEmail(email);
        },

        setPendingPassword(password: string | null) {
            this.pendingPassword = password;
            writePendingPassword(password);
        },

        clearPendingRegistration() {
            this.setPendingEmail(null);
            this.setPendingPassword(null);
        },

        setTokens(tokens: AuthTokens) {
            this.accessToken = tokens.accessToken;
            this.refreshToken = tokens.refreshToken;
            sessionStorage.setItem(ACCESS_KEY, tokens.accessToken);
            localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
        },

        clearSession() {
            this.accessToken = null;
            this.refreshToken = null;
            this.twoFactorToken = null;
            this.clearPendingRegistration();
            this.user = null;
            sessionStorage.removeItem(ACCESS_KEY);
            localStorage.removeItem(REFRESH_KEY);
        },

        async applySession(session: AuthSession): Promise<'ok' | '2fa'> {
            if (session.requiresTwoFactor) {
                this.twoFactorToken = session.twoFactorToken;
                return '2fa';
            }
            if (!session.accessToken || !session.refreshToken) {
                throw new Error('Jetons manquants dans la réponse d’authentification.');
            }
            this.setTokens({
                accessToken: session.accessToken,
                refreshToken: session.refreshToken,
                expiresAt: session.expiresAt ?? '',
                userPublicId: session.userPublicId ?? ''
            });
            this.twoFactorToken = null;
            await this.fetchMe();
            return 'ok';
        },

        async navigateAfterLogin() {
            const target = this.returnUrl || APP_HOME_ROUTE;
            this.returnUrl = null;
            await router.push(target);
        },

        async login(identifier: string, password: string) {
            const session = await authApi.login(identifier.trim(), password);
            const outcome = await this.applySession(session);
            if (outcome === '2fa') {
                await router.push('/auth/two-step');
                return;
            }
            await this.navigateAfterLogin();
        },

        async loginWithGoogle(idToken: string) {
            const session = await authApi.google(idToken);
            const outcome = await this.applySession(session);
            if (outcome === '2fa') {
                await router.push('/auth/two-step');
                return;
            }
            await this.navigateAfterLogin();
        },

        async register(payload: {
            email?: string | null;
            username?: string | null;
            password: string;
            firstName?: string | null;
            name?: string | null;
        }) {
            const result = await authApi.register(payload);
            if (result.email) {
                this.setPendingEmail(result.email);
                this.setPendingPassword(payload.password);
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
            await this.login(identifier, payload.password);
            return { outcome: 'logged-in' as const, result };
        },

        async confirmEmail(email: string, code: string) {
            await authApi.confirmEmail({ email, code });
            const password = this.pendingPassword;
            this.clearPendingRegistration();
            if (!password) {
                await router.push({
                    path: '/auth/login',
                    query: { notice: 'E-mail confirmé. Veuillez vous connecter.' }
                });
                return;
            }
            await this.login(email, password);
        },

        async resendVerification(email: string) {
            await authApi.resendVerification(email);
        },

        async forgotPassword(email: string) {
            await authApi.forgotPassword(email);
        },

        async resetPassword(token: string, newPassword: string) {
            await authApi.resetPassword(token, newPassword);
            await router.push({
                path: '/auth/login',
                query: { notice: 'Mot de passe mis à jour. Veuillez vous connecter.' }
            });
        },

        async confirmEmailChange(email: string, code: string) {
            await authApi.confirmEmailChange(email, code);
            await this.forceReLogin('E-mail mis à jour. Veuillez vous reconnecter.');
        },

        async verifyTwoFactor(code: string) {
            if (!this.twoFactorToken) {
                throw new Error('Session 2FA expirée. Veuillez vous reconnecter.');
            }
            const tokens = await authApi.verify2fa(this.twoFactorToken, code);
            this.setTokens(tokens);
            this.twoFactorToken = null;
            await this.fetchMe();
            await this.navigateAfterLogin();
        },

        async setupTwoFactor() {
            const token = await this.requireAccessToken();
            return authApi.setup2fa(token);
        },

        async enableTwoFactor(code: string) {
            const token = await this.requireAccessToken();
            await authApi.enable2fa(token, code);
            await this.fetchMe();
        },

        async disableTwoFactor(code: string) {
            const token = await this.requireAccessToken();
            await authApi.disable2fa(token, code);
            await this.fetchMe();
        },

        async listDevices() {
            const token = await this.requireAccessToken();
            return authApi.listDevices(token);
        },

        async revokeDevice(deviceIdentifier: string) {
            const token = await this.requireAccessToken();
            await authApi.revokeDevice(token, deviceIdentifier);
        },

        async setDeviceTrust(deviceIdentifier: string, isTrusted: boolean) {
            const token = await this.requireAccessToken();
            await authApi.setDeviceTrust(token, deviceIdentifier, isTrusted);
        },

        /** Révoque toutes les sessions (y compris l’appareil courant) → force re-login. */
        async revokeAllDevices() {
            const token = await this.requireAccessToken();
            await authApi.revokeAllDevices(token);
            await this.forceReLogin('Toutes les sessions ont été déconnectées. Veuillez vous reconnecter.');
        },

        async refreshSession(): Promise<boolean> {
            if (!this.refreshToken) return false;
            try {
                const tokens = await authApi.refresh(this.refreshToken);
                this.setTokens(tokens);
                return true;
            } catch {
                this.clearSession();
                return false;
            }
        },

        async fetchMe() {
            const token = await this.ensureAccessToken();
            if (!token) {
                this.user = null;
                return null;
            }
            this.user = await authApi.me(token);
            return this.user;
        },

        async updateProfile(payload: UpdateProfilePayload) {
            const token = await this.requireAccessToken();
            await authApi.updateProfile(token, payload);
            await this.fetchMe();
        },

        async setUsername(username: string) {
            const token = await this.requireAccessToken();
            await authApi.setUsername(token, username);
            await this.fetchMe();
        },

        async changeEmail(payload: { newEmail: string; currentPassword?: string | null; googleIdToken?: string | null }) {
            const token = await this.requireAccessToken();
            await authApi.changeEmail(token, payload);
            await this.fetchMe();
        },

        async changePassword(currentPassword: string, newPassword: string) {
            const token = await this.requireAccessToken();
            await authApi.changePassword(token, currentPassword, newPassword);
            await this.forceReLogin('Mot de passe mis à jour. Veuillez vous reconnecter.');
        },

        async deleteAccount(payload: { currentPassword?: string; googleIdToken?: string }) {
            const token = await this.requireAccessToken();
            await authApi.deleteAccount(token, {
                currentPassword: payload.currentPassword,
                googleIdToken: payload.googleIdToken
            });
            await this.forceReLogin('Votre compte a été définitivement supprimé.');
        },

        async ensureAccessToken(): Promise<string | null> {
            if (this.accessToken) return this.accessToken;
            if (!this.refreshToken) return null;
            const ok = await this.refreshSession();
            return ok ? this.accessToken : null;
        },

        async requireAccessToken(): Promise<string> {
            const token = await this.ensureAccessToken();
            if (!token) {
                throw new Error('Non authentifié.');
            }
            return token;
        },

        async logout() {
            const refresh = this.refreshToken;
            const access = this.accessToken;
            try {
                if (refresh) {
                    await authApi.logout(refresh, access);
                }
            } catch {
                // Always clear local session
            }
            this.clearSession();
            this.returnUrl = null;
            await router.push('/');
        },

        /** Force re-login after password/email change invalidates JWT. */
        async forceReLogin(message?: string) {
            this.clearSession();
            this.returnUrl = null;
            await router.push({
                path: '/auth/login',
                query: message ? { notice: message } : undefined
            });
        }
    }
});
