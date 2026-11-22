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
}

export const lamalApi = {
    context(year?: number) {
        const query = year ? `?year=${year}` : '';
        return fetchWrapper.get(`/api/insurance/lamal-comparison/context${query}`) as Promise<LamalContext>;
    },
    compare(request: LamalComparisonRequest) {
        return fetchWrapper.post('/api/insurance/lamal-comparison', request) as Promise<LamalComparison>;
    }
};
