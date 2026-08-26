import { computed, ref } from 'vue';
import { authApi } from '@/features/auth/api';
import type { AuthTokens, Me } from '@/features/auth/types';
import {
    clearLegacyPendingPassword,
    clearStoredRefreshToken,
    clearStoredTokens,
    isAccessExpired,
    readAccessToken,
    readExpiresAt,
    readPendingEmail,
    readRefreshToken,
    writePendingEmail,
    writeTokens
} from '@/features/auth/session-storage';
import { useUserSettingsStore } from '@/features/user-settings';
import { useNotificationsStore } from '@/features/notifications/stores/notifications-store';
import { useFriendsStore } from '@/features/friends/stores/friends-store';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { isIdleSessionError } from '@/features/auth/idle-session';
import { clearCsrfToken, rememberCsrfToken } from '@/features/auth/csrf';
import { isAuthCookieMode } from '@/utils/helpers/axios-helpers';

export const APP_HOME_ROUTE = '/app';

/** Mot de passe post-inscription — mémoire seule (jamais sessionStorage). */
let pendingPasswordMemory: string | null = null;

/**
 * État session + tokens (refresh, bootstrap, ensure/require).
 * @returns L’état et les helpers de session.
 */
export function createAuthSession() {
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

    /** Notice idle en attente si le refresh a échoué pour inactivité (lue par `forceReLogin`). */
    const pendingIdleLogoutNotice = { value: false };
    /** Dernier refresh en échec « transient » (réseau / 5xx) — le bootstrap peut retenter. */
    let lastRefreshTransient = false;

    /** Cookie-mode : cookies HttpOnly ; legacy : access/refresh en storage. */
    const isAuthenticated = computed(() => (cookieMode ? cookieSessionActive.value : !!accessToken.value || !!refreshToken.value));

    function isTransientRefreshError(e: unknown): boolean {
        const status =
            e && typeof e === 'object' && 'status' in e && typeof (e as { status: unknown }).status === 'number'
                ? (e as { status: number }).status
                : 0;
        return status === 0 || status >= 500;
    }

    const displayName = computed(() => {
        if (!user.value) return '';
        const parts = [user.value.firstName, user.value.name].filter(Boolean);
        if (parts.length) return parts.join(' ');
        return user.value.username || user.value.email || '';
    });

    const hasVerifiedEmail = computed(() => !!user.value?.email && user.value.emailVerified);

    /**
     * Persiste l’e-mail en attente de confirmation.
     * @param email E-mail, ou `null` pour effacer.
     */
    function setPendingEmail(email: string | null) {
        pendingEmail.value = email;
        writePendingEmail(email);
    }

    /**
     * Stocke le mot de passe temporaire (mémoire seule).
     * @param password Mot de passe, ou `null` pour effacer.
     */
    function setPendingPassword(password: string | null) {
        pendingPasswordMemory = password;
        pendingPassword.value = password;
    }

    /** Efface e-mail et mot de passe post-inscription. */
    function clearPendingRegistration() {
        setPendingEmail(null);
        setPendingPassword(null);
    }

    /**
     * Applique les tokens reçus (cookie-mode ou legacy storage).
     * @param tokens Jetons d’authentification.
     */
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

    /** Vide la session locale et reset les stores liés. */
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
        useFriendsStore().reset();
        useAccountsStore().reset();
    }

    /**
     * Rafraîchit la session (mutex partagé).
     * @returns `true` si le refresh a réussi.
     */
    async function refreshSession(): Promise<boolean> {
        if (!cookieMode && !refreshToken.value) return false;
        if (refreshInFlight) return refreshInFlight;

        refreshInFlight = (async () => {
            try {
                const tokens = await authApi.refresh(cookieMode ? null : refreshToken.value);
                lastRefreshTransient = false;
                setTokens(tokens);
                return true;
            } catch (e: unknown) {
                if (isIdleSessionError(e)) {
                    pendingIdleLogoutNotice.value = true;
                }
                lastRefreshTransient = isTransientRefreshError(e);
                if (!lastRefreshTransient) {
                    clearSession();
                }
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
                    bootstrapDone = true;
                    return;
                }
                if (cookieSessionActive.value && expiresAt.value && !isAccessExpired(expiresAt.value)) {
                    bootstrapDone = true;
                    return;
                }
                await refreshSession();
                // Échec réseau / 5xx : laisser retenter au prochain passage du guard.
                // Échec auth (401) ou succès : ne plus retenter jusqu’au prochain clearSession.
                if (!lastRefreshTransient) {
                    bootstrapDone = true;
                }
            } finally {
                bootstrapInFlight = null;
            }
        })();

        return bootstrapInFlight;
    }

    /**
     * Garantit un access token utilisable (refresh si besoin).
     * @returns Le token, ou `null` si non authentifié.
     */
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

    return {
        cookieMode,
        accessToken,
        refreshToken,
        expiresAt,
        twoFactorToken,
        pendingEmail,
        pendingPassword,
        user,
        returnUrl,
        cookieSessionActive,
        pendingIdleLogoutNotice,
        isAuthenticated,
        displayName,
        hasVerifiedEmail,
        setPendingEmail,
        setPendingPassword,
        clearPendingRegistration,
        setTokens,
        clearSession,
        refreshSession,
        bootstrapSession,
        ensureAccessToken,
        requireAccessToken
    };
}

export type AuthSessionState = ReturnType<typeof createAuthSession>;
