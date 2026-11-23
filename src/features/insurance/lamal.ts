import { fetchWrapper } from '@/utils/helpers/fetch-helpers';

/**
 * Comparateur de franchises LAMal (`/api/insurance/lamal-comparison`) : le coût de l'année pour chaque franchise, d'après les
 * primes du devis et les frais de santé prévus. Estimation non contractuelle ; franchises et quote-part viennent de l'API.
 */
export const LAMAL_COMPARISON_PATH = '/app/planning/comparateur-lamal';

export interface LamalContext {
    year: number;
    legalYear: number;
    isFallback: boolean;
    franchises: number[];
    quotePartRate: number;
    quotePartMax: number;
    insurancePublicId: string | null;
    insuranceName: string | null;
    currentFranchise: number | null;
    currentMonthlyPremium: number | null;
    expectedCosts: number | null;
    expectedCostsYear: number | null;
    currency: string;
    /** Profil du comparateur : `true` pour un enfant (franchises 0 à 600, quote-part plafonnée à 350). */
    child: boolean;
    /** Comparaison enregistrée pour l'année et le profil, `null` s'il n'y en a pas. */
    saved: LamalSavedComparison | null;
}

export interface LamalSavedComparison {
    year: number;
    child: boolean;
    expectedCosts: number;
    currentFranchise: number | null;
    quotes: LamalQuote[];
    updatedAt: string;
}

export interface LamalQuote {
    franchise: number;
    monthlyPremium: number;
}

export interface LamalComparisonRequest {
    expectedCosts: number;
    quotes: LamalQuote[];
    currentFranchise: number | null;
    year: number | null;
    child?: boolean;
}

export interface LamalOption {
    franchise: number;
    monthlyPremium: number;
    annualPremium: number;
    expectedCostSharing: number;
    expectedCost: number;
    maxCost: number;
    /** Économie par rapport à la franchise actuelle (négatif : plus cher) ; `null` sans franchise actuelle comparable. */
    savingVsCurrent: number | null;
    isCurrent: boolean;
    isCheapest: boolean;
}

export interface LamalComparison {
    year: number;
    legalYear: number;
    isFallback: boolean;
    expectedCosts: number;
    currentFranchise: number | null;
    recommendedFranchise: number | null;
    savingVsCurrent: number | null;
    options: LamalOption[];
    currency: string;
    child: boolean;
}

export const lamalApi = {
    context(year?: number, child = false) {
        const params = new URLSearchParams();
        if (year) params.set('year', String(year));
        if (child) params.set('child', 'true');
        const query = params.size ? `?${params.toString()}` : '';
        return fetchWrapper.get(`/api/insurance/lamal-comparison/context${query}`) as Promise<LamalContext>;
    },
    compare(request: LamalComparisonRequest) {
        return fetchWrapper.post('/api/insurance/lamal-comparison', request) as Promise<LamalComparison>;
    },
    /** Enregistre (crée ou remplace) la comparaison de l'année et du profil. */
    save(request: LamalComparisonRequest) {
        return fetchWrapper.put('/api/insurance/lamal-comparison/saved', request) as Promise<LamalSavedComparison>;
    },
    deleteSaved(year: number, child: boolean) {
        return fetchWrapper.delete(`/api/insurance/lamal-comparison/saved?year=${year}${child ? '&child=true' : ''}`) as Promise<void>;
    }
};
