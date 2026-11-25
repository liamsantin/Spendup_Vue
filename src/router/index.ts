import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import AppRoutes from './AppRoutes';
import AuthRoutes from './AuthRoutes';
import DemoRoutes from './DemoRoutes';
import FrontPagesRoutes from './FrontPagesRoutes';
import { authGuard } from '@/app/guards/auth-guard';
import { appToDemoPath, isDemoSession } from '@/features/demo/session';
import { isTauri } from '@/utils/helpers/platform-helpers';
import { SECURITY_PATHS } from '@/features/user-settings/settings-paths';
import { APP_TARGET, crossHref } from '@/utils/helpers/app-target';

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

const notFoundRoute: RouteRecordRaw = {
    path: '/:pathMatch(.*)*',
    component: () => import('@/views/authentication/Error.vue')
};

/** Routes embarquées selon la cible du build (`VITE_TARGET`) : les autres ne sont pas dans le bundle. */
function routesForTarget(): RouteRecordRaw[] {
    switch (APP_TARGET) {
        case 'landing':
            return [FrontPagesRoutes, notFoundRoute];
        case 'demo':
            return [DemoRoutes, notFoundRoute];
        case 'app':
            return [tauriHomeRedirect, AppRoutes, AuthRoutes, ...securityAliasRoutes, notFoundRoute];
        default:
            return [
                ...(isTauri() ? [tauriHomeRedirect] : [FrontPagesRoutes]),
                AppRoutes,
                DemoRoutes,
                AuthRoutes,
                ...securityAliasRoutes,
                notFoundRoute
            ];
    }
}

export const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) return savedPosition;
        // Ancres des landings (`/#fonctionnalites`, `#journey-01`…) : défilement vers la section, sous le header fixe.
        if (to.hash) return { el: to.hash, top: 90, behavior: 'smooth' };
        if (from.path.startsWith('/auth/') && to.path.startsWith('/auth/')) return false;
        return { top: 0, left: 0 };
    },
    routes: routesForTarget()
});

router.beforeEach((to) => {
    if (!isDemoSession()) return;
    if (to.path !== '/app' && !to.path.startsWith('/app/')) return;
    return {
        path: appToDemoPath(to.path),
        query: to.query,
        hash: to.hash,
        replace: true
    };
});

if (APP_TARGET === 'landing') {
    // Anciennes adresses (e-mails, favoris) : /auth, /app, /demo, /security vivent sur d'autres domaines.
    router.beforeEach((to) => {
        const first = to.path.split('/')[1];
        const target = first === 'demo' ? 'demo' : first === 'auth' || first === 'app' || first === 'security' ? 'app' : null;
        if (!target) return;
        window.location.replace(crossHref(target, to.fullPath));
        return false;
    });
} else {
    router.beforeEach(authGuard);
}
