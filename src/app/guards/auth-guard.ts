import type { NavigationGuard } from 'vue-router';
import { useAuthStore, APP_HOME_ROUTE } from '@/features/auth';

export const authGuard: NavigationGuard = async (to, _from, next) => {
    const auth = useAuthStore();
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

    if (requiresAuth) {
        if (!auth.isAuthenticated) {
            auth.returnUrl = to.fullPath;
            return next('/auth/login');
        }
        if (!auth.user) {
            try {
                await auth.fetchMe();
            } catch {
                auth.clearSession();
                auth.returnUrl = to.fullPath;
                return next('/auth/login');
            }
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
