import { isPricingPageEnabled } from '@/utils/helpers/pricing-helpers';
import { isDevAppEnv } from '@/utils/helpers/env-helpers';

const pricingRoute = {
    name: 'Pricing',
    path: 'tarifs',
    component: () => import('@/views/front-pages/PricingPage.vue')
};

/** Showcase composants — uniquement si `VITE_APP_ENV=development` (pas de lien UI). */
const componentsShowcaseRoute = {
    name: 'ComponentsShowcase',
    path: 'components',
    meta: {
        requiresAuth: false,
        devOnly: true
    },
    component: () => import('@/views/dev/ComponentsShowcasePage.vue')
};

/** Galerie des maquettes marketing — dev uniquement, comme le showcase. */
const mockupsGalleryRoute = {
    name: 'MockupsGallery',
    path: 'components/maquettes',
    meta: {
        requiresAuth: false,
        devOnly: true
    },
    component: () => import('@/views/dev/MockupsGalleryPage.vue')
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
        {
            name: 'PublicContact',
            path: 'contact',
            component: () => import('@/views/front-pages/ContactPage.vue')
        },
        ...(isPricingPageEnabled() ? [pricingRoute] : []),
        ...(isDevAppEnv() ? [componentsShowcaseRoute, mockupsGalleryRoute] : []),
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
