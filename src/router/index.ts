import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import AppRoutes from './AppRoutes';
import AuthRoutes from './AuthRoutes';
import FrontPagesRoutes from './FrontPagesRoutes';
import { authGuard } from '@/app/guards/auth-guard';
import { isTauri } from '@/utils/helpers/platform-helpers';

const tauriHomeRedirect: RouteRecordRaw = {
    path: '/',
    redirect: '/auth/login'
};

export const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    scrollBehavior(to, _from, savedPosition) {
        if (savedPosition) return savedPosition;
        // Ancres des landings (`/#fonctionnalites`, `#journey-01`…) : défilement vers la section, sous le header fixe.
        if (to.hash) return { el: to.hash, top: 90, behavior: 'smooth' };
        return { top: 0, left: 0 };
    },
    routes: [
        ...(isTauri() ? [tauriHomeRedirect] : [FrontPagesRoutes]),
        AppRoutes,
        AuthRoutes,
        {
            path: '/:pathMatch(.*)*',
            component: () => import('@/views/authentication/Error.vue')
        }
    ]
});

router.beforeEach(authGuard);
