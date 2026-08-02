/**
 * Routes authentifiées — préfixe /app, layout FullLayout (sidebar + header).
 * Guard via meta.requiresAuth (session JWT / refresh).
 *
 * Les vues suivent les headers sidebarItem :
 *   Spend.Up   → views/app/spendup/
 *   Finances   → views/app/finances/
 *   Paramètres → views/app/parametres/
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
            component: () => import('@/views/app/spendup/dashboard/AppDashboardView.vue')
        },
        {
            name: 'AppAccounts',
            path: 'comptes',
            component: () => import('@/views/app/parametres/accounts/AppAccountsPage.vue')
        },
        {
            path: 'applications',
            redirect: '/app/comptes'
        }
    ]
};

export default AppRoutes;
