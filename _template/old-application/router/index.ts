import { createRouter, createWebHistory } from 'vue-router';
import AppRoutes from './AppRoutes';
import AuthRoutes from './AuthRoutes';
import FrontPagesRoutes from './FrontPagesRoutes';
import { authGuard } from '@/app/guards/auth-guard';

export const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    scrollBehavior() {
        return { top: 0, left: 0 };
    },
    routes: [
        FrontPagesRoutes,
        AppRoutes,
        AuthRoutes,
        {
            path: '/:pathMatch(.*)*',
            component: () => import('@/views/authentication/Error.vue')
        }
    ]
});

router.beforeEach(authGuard);
