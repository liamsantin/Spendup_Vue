import { isPricingPageEnabled } from '@/utils/helpers/pricing-helpers';

const pricingRoute = {
    name: 'Pricing',
    path: 'tarifs',
    component: () => import('@/views/front-pages/PricingPage.vue')
};

const FrontPagesRoutes = {
    path: '/',
    component: () => import('@/layouts/blank/BlankLayout.vue'),
    meta: {
        requiresAuth: false
    },
    children: [
        {
            name: 'PublicHome',
            path: '',
            component: () => import('@/views/front-pages/PublicHomePage.vue')
        },
        {
            name: 'Features',
            path: 'fonctionnalites',
            component: () => import('@/views/front-pages/FeaturesPage.vue')
        },
        {
            name: 'PublicAbout',
            path: 'a-propos',
            component: () => import('@/views/front-pages/AboutPage.vue')
        },
        ...(isPricingPageEnabled() ? [pricingRoute] : []),
        {
            name: 'TermsOfUse',
            path: 'conditions-utilisation',
            component: () => import('@/views/front-pages/TermsOfUsePage.vue')
        },
        {
            name: 'PrivacyPolicy',
            path: 'politique-confidentialite',
            component: () => import('@/views/front-pages/PrivacyPolicyPage.vue')
        }
    ]
};

export default FrontPagesRoutes;
