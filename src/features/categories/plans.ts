import type { CategoryIconKey } from '@/features/categories/icons';
import type { TaxNatureCode } from '@/features/categories/tax-natures';
import type { CategoryType, SpendingKind } from '@/features/categories/types';

/** Nœud du plan (clés i18n sous `categoriesPage.plan.nodes.*`). */
export type CategoryPlanNodeDef = {
    nameKey: string;
    type: CategoryType;
    color?: string;
    icone?: CategoryIconKey;
    /** Type de dépense de la racine, hérité par les enfants qui n'en ont pas. */
    spendingKind?: SpendingKind;
    children?: Array<{
        nameKey: string;
        type?: CategoryType;
        color?: string;
        icone?: CategoryIconKey;
        /** Nature fiscale par défaut, jamais héritée du parent. */
        taxNature?: TaxNatureCode;
        /** Exception au type de dépense de la racine. */
        spendingKind?: SpendingKind;
    }>;
};

/**
 * Plan de démarrage orienté Suisse romande :
 * logement (loyer / hypothèque), LAMal, CFF, impôts, 3e pilier, 13e salaire…
 */
export const DEFAULT_CATEGORY_PLAN: readonly CategoryPlanNodeDef[] = [
    {
        nameKey: 'logement',
        spendingKind: 'obligatoire',
        type: 'depense',
        color: '#2A9D8F',
        icone: 'home',
        children: [
            { nameKey: 'loyer', icone: 'home' },
            { nameKey: 'hypotheque', icone: 'building-bank', taxNature: 'debtInterest' },
            { nameKey: 'charges', icone: 'bolt' },
            { nameKey: 'entretienLogement', icone: 'tools' },
            { nameKey: 'assuranceMenage', icone: 'receipt' }
        ]
    },
    {
        nameKey: 'alimentation',
        spendingKind: 'obligatoire',
        type: 'depense',
        color: '#F59E0B',
        icone: 'utensils',
        children: [
            { nameKey: 'courses', icone: 'shopping-cart' },
            { nameKey: 'restaurants', icone: 'utensils', spendingKind: 'plaisir' },
            { nameKey: 'cafes', icone: 'coffee', spendingKind: 'plaisir' }
        ]
    },
    {
        nameKey: 'transport',
        spendingKind: 'obligatoire',
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
        spendingKind: 'obligatoire',
        type: 'depense',
        color: '#EF4444',
        icone: 'heart',
        children: [
            { nameKey: 'assuranceMaladie', icone: 'heart', taxNature: 'healthInsurancePremium' },
            { nameKey: 'assuranceComplementaire', icone: 'star', taxNature: 'healthInsurancePremium' },
            { nameKey: 'franchiseSoins', icone: 'receipt', taxNature: 'medicalExpense' },
            { nameKey: 'pharmacie', icone: 'droplet', taxNature: 'medicalExpense' },
            { nameKey: 'dentiste', icone: 'user', taxNature: 'medicalExpense' }
        ]
    },
    {
        nameKey: 'impots',
        spendingKind: 'obligatoire',
        type: 'depense',
        color: '#78716C',
        icone: 'building-bank',
        children: [
            { nameKey: 'impotsRevenu', icone: 'receipt', taxNature: 'taxPayment' },
            { nameKey: 'acomptesProvisionnels', icone: 'chart-bar', taxNature: 'taxPayment' },
            { nameKey: 'taxesAmendes', icone: 'tag' }
        ]
    },
    {
        nameKey: 'loisirs',
        spendingKind: 'plaisir',
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
        spendingKind: 'plaisir',
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
        spendingKind: 'plaisir',
        type: 'depense',
        color: '#4F46E5',
        icone: 'wifi',
        children: [
            { nameKey: 'telecom', icone: 'device-mobile', spendingKind: 'obligatoire' },
            { nameKey: 'streaming', icone: 'movie' },
            { nameKey: 'logiciels', icone: 'wifi' }
        ]
    },
    {
        nameKey: 'famille',
        spendingKind: 'obligatoire',
        type: 'depense',
        color: '#F472B6',
        icone: 'baby-carriage',
        children: [
            { nameKey: 'gardeEnfants', icone: 'baby-carriage', taxNature: 'childcare' },
            { nameKey: 'ecoleActivites', icone: 'school' },
            { nameKey: 'animaux', icone: 'paw' }
        ]
    },
    {
        nameKey: 'banque',
        spendingKind: 'obligatoire',
        type: 'depense',
        color: '#64748B',
        icone: 'credit-card',
        children: [
            { nameKey: 'fraisBancaires', icone: 'credit-card' },
            { nameKey: 'dons', icone: 'gift', taxNature: 'donation', spendingKind: 'plaisir' }
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
            { nameKey: 'remboursementsSante', icone: 'heart', taxNature: 'medicalReimbursement' },
            { nameKey: 'autresRevenus', icone: 'gift' }
        ]
    },
    {
        nameKey: 'epargne',
        spendingKind: 'epargne',
        type: 'transfert',
        color: '#0D9488',
        icone: 'pig-money',
        children: [
            { nameKey: 'troisiemePilier', icone: 'pig-money', taxNature: 'pillar3aContribution' },
            { nameKey: 'epargneCourante', icone: 'wallet' },
            { nameKey: 'virementInterne', icone: 'arrows-exchange' }
        ]
    }
] as const;
