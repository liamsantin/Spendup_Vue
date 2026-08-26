import type { NavigationGuard } from 'vue-router';
import { useAuthStore, APP_HOME_ROUTE } from '@/features/auth';
import { sanitizeReturnUrl } from '@/features/auth/safe-return-url';
import { useFriendsStore } from '@/features/friends';
import { useAccountsStore } from '@/features/accounts';
import { useNotificationsStore } from '@/features/notifications';
import { useUserSettingsStore } from '@/features/user-settings';
import { isDevAppEnv } from '@/utils/helpers/env-helpers';

export const authGuard: NavigationGuard = async (to, _from, next) => {
    const auth = useAuthStore();
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
    const devOnly = to.matched.some((record) => record.meta.devOnly);

    if (devOnly && !isDevAppEnv()) {
        return next('/auth/404');
    }

    // Mode cookie : restaure l’access via refresh HttpOnly avant les checks auth.
    await auth.bootstrapSession();

    if (requiresAuth) {
        if (!auth.isAuthenticated) {
            auth.returnUrl = sanitizeReturnUrl(to.fullPath, APP_HOME_ROUTE);
            return next('/auth/login');
        }
        if (!auth.user) {
            try {
                const me = await auth.fetchMe();
                if (!me || !auth.isAuthenticated) {
                    auth.returnUrl = sanitizeReturnUrl(to.fullPath, APP_HOME_ROUTE);
                    await auth.forceReLogin();
                    // `forceReLogin` a déjà navigué vers /auth/login — annuler la nav courante.
                    return next(false);
                }
            } catch {
                auth.returnUrl = sanitizeReturnUrl(to.fullPath, APP_HOME_ROUTE);
                await auth.forceReLogin();
                return next(false);
            }
        }
        try {
            await useUserSettingsStore().ensureLoaded();
        } catch {
            // Settings non bloquants : l’app reste accessible
        }
        try {
            await useNotificationsStore().onAuthenticatedSession();
        } catch {
            // Hub / badge non bloquants
        }
        useFriendsStore().onAuthenticatedSession();
        useAccountsStore().onAuthenticatedSession();
        return next();
    }

    if (auth.isAuthenticated && (to.path === '/auth/login' || to.path === '/auth/register')) {
        return next(APP_HOME_ROUTE);
    }

    if (to.path === '/auth/two-step' && !auth.twoFactorToken) {
        return next('/auth/login');
    }

    next();
};
