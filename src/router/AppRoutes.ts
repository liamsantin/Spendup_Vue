/**
 * Routes authentifiées — préfixe /app, layout FullLayout (sidebar + header).
 * Guard via meta.requiresAuth (session JWT / refresh).
 *
 * Les vues :
 *   dashboard / notifications → views/app/<page>/
 *   Paramètres               → views/app/parametres/
 *   Finances                 → views/app/finances/
 */
import type { RouteRecordRaw } from 'vue-router';
import { SETTINGS_PATHS, resolveLegacySettingsRedirect } from '@/features/user-settings/settings-paths';

const AppRoutes: RouteRecordRaw = {
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
            path: 'parametres',
            redirect: SETTINGS_PATHS.account
        },
        {
            name: 'AppSettingsAccount',
            path: 'parametres/compte',
            component: () => import('@/views/app/parametres/compte/AppSettingsAccountPage.vue')
        },
        {
            name: 'AppSettingsPreferences',
            path: 'parametres/preferences',
            component: () => import('@/views/app/parametres/preferences/AppSettingsPreferencesPage.vue')
        },
        {
            name: 'AppSettingsNotifications',
            path: 'parametres/notifications',
            component: () => import('@/views/app/parametres/notifications/AppSettingsNotificationsPage.vue')
        },
        {
            name: 'AppSettingsSecurity',
            path: 'parametres/securite',
            component: () => import('@/views/app/parametres/securite/AppSettingsSecurityPage.vue')
        },
        {
            path: 'comptes',
            redirect: (to) => resolveLegacySettingsRedirect(to)
        },
        {
            path: 'applications',
            redirect: SETTINGS_PATHS.account
        }
    ]
};

export default AppRoutes;
