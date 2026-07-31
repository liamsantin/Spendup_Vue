/**
 * Routes authentifiées — préfixe /app, layout FullLayout (sidebar + header).
 * Guard via meta.requiresAuth (session JWT / refresh).
 */
const AppRoutes = {
    path: '/app',
    meta: {
        requiresAuth: true
    },
    redirect: '/app',
    component: () => import('@/layouts/full/FullLayout.vue'),
    children: [
        {
            name: 'AppDashboard',
            path: '',
            component: () => import('@/views/app/dashboard/AppDashboardView.vue')
        },
        {
            name: 'AppSettings',
            path: 'parametres',
            component: () => import('@/views/app/settings/AppSettingsPage.vue')
        }
    ]
};

export default AppRoutes;
