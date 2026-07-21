import { defineStore } from 'pinia';
import { router } from '@/router';
import { authApi } from '@/features/auth/api';
import type { AuthSession, AuthTokens, Me } from '@/features/auth/types';

export const APP_HOME_ROUTE = '/app';

const REFRESH_KEY = 'spendup_refresh_token';
const ACCESS_KEY = 'spendup_access_token';

function readRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
}

function readAccessToken(): string | null {
    return sessionStorage.getItem(ACCESS_KEY);
}

export const useAuthStore = defineStore('auth', {
    state: () => ({
        accessToken: readAccessToken() as string | null,
        refreshToken: readRefreshToken() as string | null,
        twoFactorToken: null as string | null,
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
                await authApi.logout(refresh, access);
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
