import type { RouteRecordRaw } from 'vue-router';
import AppRoutes from './AppRoutes';

/** Pages ouvrables dans la démo. Le reste affiche une invitation à créer un compte. */
const OPEN_DEMO_PATHS = new Set([
    '',
    'calendrier',
    'friends',
    'finances/comptes',
    'finances/transactions',
    'finances/mois',
    'planning/previsions',
    'finances/imports',
    'finances/imports/modeles',
    'finances/imports/:publicId',
    'finances/recurrences',
    'finances/recurrences/charges',
    'finances/recurrences/revenus',
    'finances/recurrences/echeances',
    'finances/recurrences/charges/:publicId',
    'finances/recurrences/revenus/:publicId',
    'finances/banques',
    'finances/moyens-de-paiement',
    'gestion/categories',
    'gestion/files/:publicId?',
    'gestion/tiers/:publicId?',
    'planning/budgets/:publicId?',
    'planning/objectifs/:publicId?',
    'patrimoine',
    'patrimoine/actifs/:publicId?',
    'patrimoine/immobilier/:publicId?',
    'patrimoine/placements/:accountPublicId?',
    'patrimoine/dettes/prets/:publicId?',
    'patrimoine/dettes/amis/:publicId?',
    'patrimoine/dettes/:publicId?',
    'planning/impots/:publicId?',
    'planning/provision-impots',
    'planning/comparateur-lamal',
    'planning/simulateur-remboursement'
]);

function toDemoChild(child: RouteRecordRaw): RouteRecordRaw {
    const name = child.name == null ? undefined : `Demo${String(child.name)}`;
    if (child.redirect != null || OPEN_DEMO_PATHS.has(child.path)) {
        return (name == null ? child : { ...child, name }) as RouteRecordRaw;
    }
    return {
        path: child.path,
        name,
        meta: child.meta,
        component: () => import('@/features/demo/DemoLockedPage.vue')
    };
}

/** Même shell que `/app`, préfixe `/demo`. */
const DemoRoutes: RouteRecordRaw = {
    path: '/demo',
    meta: { requiresAuth: true, demo: true },
    component: () => import('@/layouts/full/FullLayout.vue'),
    children: (AppRoutes.children ?? []).map(toDemoChild)
};

export default DemoRoutes;
