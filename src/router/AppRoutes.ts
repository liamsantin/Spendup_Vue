/**
 * Routes authentifiées — préfixe /app, layout FullLayout (sidebar + header).
 * JWT à brancher plus tard ; guard via meta.requiresAuth.
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
        }
    ]
};

export default AppRoutes;
