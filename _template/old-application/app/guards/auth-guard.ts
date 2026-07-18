import type { NavigationGuard } from 'vue-router';
import { useAuthStore, APP_HOME_ROUTE } from '@/app/stores/auth-store';

export const authGuard: NavigationGuard = (to, _from, next) => {
    const auth = useAuthStore();
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

    if (requiresAuth) {
        if (!auth.user) {
            auth.returnUrl = to.fullPath;
            return next('/auth/login');
        }
        return next();
    }

    if (auth.user && to.path === '/auth/login') {
        return next(APP_HOME_ROUTE);
    }

    next();
};
