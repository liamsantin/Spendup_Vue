const AuthRoutes = {
    path: '/auth',
    component: () => import('@/layouts/blank/BlankLayout.vue'),
    meta: {
        requiresAuth: false
    },
    children: [
        {
            name: 'AuthGate',
            path: '',
            component: () => import('@/views/authentication/AuthGatePage.vue')
        },
        {
            path: 'login',
            redirect: '/auth'
        },
        {
            path: 'register',
            redirect: '/auth?tab=register'
        },
        {
            name: 'Side Forgot Password',
            path: '/auth/forgot-password',
            component: () => import('@/views/authentication/SideForgotPassword.vue')
        },
        {
            name: 'Side Two Steps',
            path: '/auth/two-step',
            component: () => import('@/views/authentication/SideTwoStep.vue')
        },
        {
            name: 'Confirm Email',
            path: '/auth/confirm-email',
            component: () => import('@/views/authentication/SideConfirmEmail.vue')
        },
        {
            name: 'Reset Password',
            path: '/auth/reset-password',
            component: () => import('@/views/authentication/SideForgotPassword.vue')
        },
        {
            name: 'Confirm Email Change',
            path: '/auth/confirm-email-change',
            component: () => import('@/views/authentication/SideConfirmEmailChange.vue')
        },
        {
            name: 'Error',
            path: '/auth/404',
            component: () => import('@/views/authentication/Error.vue')
        },
        {
            name: 'Maintenance',
            path: '/auth/maintenance',
            component: () => import('@/views/authentication/Maintenance.vue')
        }
    ]
};

export default AuthRoutes;
