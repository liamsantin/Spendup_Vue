import type { NavigationGuard } from 'vue-router';
import { useAuthStore, APP_HOME_ROUTE } from '@/features/auth';
import { useUserSettingsStore } from '@/features/user-settings';
import { isDevAppEnv } from '@/utils/helpers/env-helpers';

export const authGuard: NavigationGuard = async (to, _from, next) => {
    const auth = useAuthStore();
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
    const devOnly = to.matched.some((record) => record.meta.devOnly);

    if (devOnly && !isDevAppEnv()) {
        return next('/auth/404');
    }

    if (requiresAuth) {
        if (!auth.isAuthenticated) {
            auth.returnUrl = to.fullPath;
            return next('/auth/login');
        }
        if (!auth.user) {
            try {
                const me = await auth.fetchMe();
                if (!me || !auth.isAuthenticated) {
                    auth.clearSession();
                    auth.returnUrl = to.fullPath;
                    return next('/auth/login');
                }
            } catch {
                auth.clearSession();
                auth.returnUrl = to.fullPath;
                return next('/auth/login');
            }
        }
        try {
            await useUserSettingsStore().ensureLoaded();
        } catch {
            // Settings non bloquants : l’app reste accessible
        }
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
