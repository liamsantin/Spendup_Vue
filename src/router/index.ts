import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import AppRoutes from './AppRoutes';
import AuthRoutes from './AuthRoutes';
import FrontPagesRoutes from './FrontPagesRoutes';
import { authGuard } from '@/app/guards/auth-guard';
import { isTauri } from '@/utils/helpers/platform-helpers';
import { SECURITY_PATHS } from '@/features/user-settings/settings-paths';

const tauriHomeRedirect: RouteRecordRaw = {
    path: '/',
    redirect: '/auth'
};

/**
 * Chemins logiques `/security/…` envoyés par l’API (e-mail et notification à l’ouverture d’un
 * accès technique) : redirigés vers les pages `/app` correspondantes, qui portent le guard auth.
 */
const securityAliasRoutes: RouteRecordRaw[] = [
    { path: SECURITY_PATHS.accessLogAlias, redirect: SECURITY_PATHS.accessLog },
    { path: SECURITY_PATHS.transparencyAlias, redirect: SECURITY_PATHS.transparency }
];

export const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) return savedPosition;
        // Ancres des landings (`/#fonctionnalites`, `#journey-01`…) : défilement vers la section, sous le header fixe.
        if (to.hash) return { el: to.hash, top: 90, behavior: 'smooth' };
        if (from.path.startsWith('/auth/') && to.path.startsWith('/auth/')) return false;
        return { top: 0, left: 0 };
    },
    routes: [
        ...(isTauri() ? [tauriHomeRedirect] : [FrontPagesRoutes]),
        AppRoutes,
        AuthRoutes,
        ...securityAliasRoutes,
        {
            path: '/:pathMatch(.*)*',
            component: () => import('@/views/authentication/Error.vue')
        }
    ]
});

router.beforeEach(authGuard);
