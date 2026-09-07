import type { CategoryIconKey } from '@/features/categories/icons';
import type { CategoryType } from '@/features/categories/types';

/** Nœud du plan (clés i18n sous `categoriesPage.plan.nodes.*`). */
export type CategoryPlanNodeDef = {
    nameKey: string;
    type: CategoryType;
    color?: string;
    icone?: CategoryIconKey;
    children?: Array<{
        nameKey: string;
        type?: CategoryType;
        color?: string;
        icone?: CategoryIconKey;
    }>;
};

/** Plan de démarrage : domaines courants + sous-catégories. */
export const DEFAULT_CATEGORY_PLAN: readonly CategoryPlanNodeDef[] = [
    {
        nameKey: 'logement',
        type: 'depense',
        color: '#2A9D8F',
        icone: 'home',
        children: [
            { nameKey: 'loyer', icone: 'home' },
            { nameKey: 'charges', icone: 'bolt' },
            { nameKey: 'assuranceHabitation', icone: 'receipt' }
        ]
    },
    {
        nameKey: 'alimentation',
        type: 'depense',
        color: '#F59E0B',
        icone: 'utensils',
        children: [
            { nameKey: 'courses', icone: 'shopping-cart' },
            { nameKey: 'restaurants', icone: 'utensils' },
            { nameKey: 'cafes', icone: 'coffee' }
        ]
    },
    {
        nameKey: 'transport',
        type: 'depense',
        color: '#0EA5E9',
        icone: 'car',
        children: [
            { nameKey: 'carburant', icone: 'flame' },
            { nameKey: 'transportsCommun', icone: 'bus' },
            { nameKey: 'entretienVehicule', icone: 'tools' }
        ]
    },
    {
        nameKey: 'sante',
        type: 'depense',
        color: '#EF4444',
        icone: 'heart',
        children: [
            { nameKey: 'pharmacie', icone: 'heart' },
            { nameKey: 'soins', icone: 'heart' }
        ]
    },
    {
        nameKey: 'loisirs',
        type: 'depense',
        color: '#8B5CF6',
        icone: 'movie',
        children: [
            { nameKey: 'sorties', icone: 'music' },
            { nameKey: 'streaming', icone: 'device-mobile' },
            { nameKey: 'sport', icone: 'barbell' }
        ]
    },
    {
        nameKey: 'shopping',
        type: 'depense',
        color: '#64748B',
        icone: 'shopping-cart',
        children: [
            { nameKey: 'vetements', icone: 'shirt' },
            { nameKey: 'divers', icone: 'tag' }
        ]
    },
    {
        nameKey: 'abonnements',
        type: 'depense',
        color: '#4F46E5',
        icone: 'wifi',
        children: [
            { nameKey: 'telecom', icone: 'device-mobile' },
            { nameKey: 'logiciels', icone: 'wifi' }
        ]
    },
    {
        nameKey: 'revenus',
        type: 'revenu',
        color: '#10B981',
        icone: 'briefcase',
        children: [
            { nameKey: 'salaire', icone: 'cash' },
            { nameKey: 'autresRevenus', icone: 'gift' }
        ]
    },
    {
        nameKey: 'epargne',
        type: 'transfert',
        color: '#4F46E5',
        icone: 'pig-money',
        children: [
            { nameKey: 'miseDeCote', icone: 'pig-money' },
            { nameKey: 'virementInterne', icone: 'arrows-exchange' }
        ]
    }
] as const;
