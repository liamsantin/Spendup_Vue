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

/**
 * Plan de démarrage orienté Suisse romande :
 * logement (loyer / hypothèque), LAMal, CFF, impôts, 3e pilier, 13e salaire…
 */
export const DEFAULT_CATEGORY_PLAN: readonly CategoryPlanNodeDef[] = [
    {
        nameKey: 'logement',
        type: 'depense',
        color: '#2A9D8F',
        icone: 'home',
        children: [
            { nameKey: 'loyer', icone: 'home' },
            { nameKey: 'hypotheque', icone: 'building-bank' },
            { nameKey: 'charges', icone: 'bolt' },
            { nameKey: 'entretienLogement', icone: 'tools' },
            { nameKey: 'assuranceMenage', icone: 'receipt' }
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
        icone: 'bus',
        children: [
            { nameKey: 'transportsPublics', icone: 'bus' },
            { nameKey: 'carburant', icone: 'flame' },
            { nameKey: 'parking', icone: 'map-pin' },
            { nameKey: 'entretienVehicule', icone: 'tools' },
            { nameKey: 'assuranceVehicule', icone: 'car' }
        ]
    },
    {
        nameKey: 'sante',
        type: 'depense',
        color: '#EF4444',
        icone: 'heart',
        children: [
            { nameKey: 'assuranceMaladie', icone: 'heart' },
            { nameKey: 'assuranceComplementaire', icone: 'star' },
            { nameKey: 'franchiseSoins', icone: 'receipt' },
            { nameKey: 'pharmacie', icone: 'droplet' },
            { nameKey: 'dentiste', icone: 'user' }
        ]
    },
    {
        nameKey: 'impots',
        type: 'depense',
        color: '#78716C',
        icone: 'building-bank',
        children: [
            { nameKey: 'impotsRevenu', icone: 'receipt' },
            { nameKey: 'acomptesProvisionnels', icone: 'chart-bar' },
            { nameKey: 'taxesAmendes', icone: 'tag' }
        ]
    },
    {
        nameKey: 'loisirs',
        type: 'depense',
        color: '#8B5CF6',
        icone: 'movie',
        children: [
            { nameKey: 'sorties', icone: 'music' },
            { nameKey: 'sport', icone: 'barbell' },
            { nameKey: 'vacances', icone: 'plane' },
            { nameKey: 'culture', icone: 'book' }
        ]
    },
    {
        nameKey: 'shopping',
        type: 'depense',
        color: '#EC4899',
        icone: 'shopping-cart',
        children: [
            { nameKey: 'vetements', icone: 'shirt' },
            { nameKey: 'maisonEquipement', icone: 'home' },
            { nameKey: 'electronique', icone: 'device-mobile' }
        ]
    },
    {
        nameKey: 'abonnements',
        type: 'depense',
        color: '#4F46E5',
        icone: 'wifi',
        children: [
            { nameKey: 'telecom', icone: 'device-mobile' },
            { nameKey: 'streaming', icone: 'movie' },
            { nameKey: 'logiciels', icone: 'wifi' }
        ]
    },
    {
        nameKey: 'famille',
        type: 'depense',
        color: '#F472B6',
        icone: 'baby-carriage',
        children: [
            { nameKey: 'gardeEnfants', icone: 'baby-carriage' },
            { nameKey: 'ecoleActivites', icone: 'school' },
            { nameKey: 'animaux', icone: 'paw' }
        ]
    },
    {
        nameKey: 'banque',
        type: 'depense',
        color: '#64748B',
        icone: 'credit-card',
        children: [
            { nameKey: 'fraisBancaires', icone: 'credit-card' },
            { nameKey: 'dons', icone: 'gift' }
        ]
    },
    {
        nameKey: 'revenus',
        type: 'revenu',
        color: '#10B981',
        icone: 'briefcase',
        children: [
            { nameKey: 'salaire', icone: 'cash' },
            { nameKey: 'treiziemeBonus', icone: 'star' },
            { nameKey: 'independant', icone: 'briefcase' },
            { nameKey: 'allocations', icone: 'users' },
            { nameKey: 'rentes', icone: 'wallet' },
            { nameKey: 'autresRevenus', icone: 'gift' }
        ]
    },
    {
        nameKey: 'epargne',
        type: 'transfert',
        color: '#0D9488',
        icone: 'pig-money',
        children: [
            { nameKey: 'troisiemePilier', icone: 'pig-money' },
            { nameKey: 'epargneCourante', icone: 'wallet' },
            { nameKey: 'virementInterne', icone: 'arrows-exchange' }
        ]
    }
] as const;
