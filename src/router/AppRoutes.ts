/**
 * Routes authentifiées — préfixe /app, layout FullLayout (sidebar + header).
 * Guard via meta.requiresAuth (session JWT / refresh).
 *
 * Les vues :
 *   dashboard / notifications → views/app/<page>/
 *   Paramètres               → views/app/parametres/
 *   Finances (à venir)       → views/app/finances/
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
            name: 'AppAccounts',
            path: 'comptes',
            component: () => import('@/views/app/parametres/accounts/AppAccountsPage.vue')
        },
        {
            name: 'AppNotifications',
            path: 'notifications',
            component: () => import('@/views/app/notifications/AppNotificationsPage.vue')
        },
        {
            name: 'AppFriends',
            path: 'friends',
            component: () => import('@/views/app/friends/AppFriendsPage.vue')
        },
        {
            name: 'AppComptes',
            path: 'finances/comptes',
            component: () => import('@/views/app/finances/comptes/AppComptesPage.vue')
        },
        {
            name: 'AppPaymentMethods',
            path: 'finances/moyens-de-paiement',
            component: () => import('@/views/app/finances/payment-methods/AppPaymentMethodsPage.vue')
        },
        {
            path: 'applications',
            redirect: '/app/comptes'
        }
    ]
};

export default AppRoutes;
