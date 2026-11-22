/** Calculateur d’intérêts composés (`/api/compound-interest`). Hypothèse seule : sans impôts, ni garantie de rendement. */
export const COMPOUND_INTEREST_PATH = '/app/planning/interets-composes';

export const COMPOUND_MAX_YEARS = 50;
export const COMPOUND_AMOUNT_MAX = 1_000_000_000;
export const COMPOUND_RATE_MIN = -100;
export const COMPOUND_RATE_MAX = 100;
export const COMPOUND_FEE_MAX = 20;
export const COMPOUND_PERCENT_MAX = 100;
/** Écart des rendements comparés (saisi - 2 points, saisi, saisi + 2 points). */
export const COMPOUND_SCENARIO_STEP = 2;
/** Nombre maximal de calculs enregistrés par utilisateur. */
export const COMPOUND_MAX_SAVED = 50;
export const COMPOUND_NAME_MAX = 150;

export type ContributionFrequency = 'monthly' | 'quarterly' | 'yearly';
export type Compounding = 'daily' | 'monthly' | 'quarterly' | 'yearly';

export const CONTRIBUTION_FREQUENCIES: ContributionFrequency[] = ['monthly', 'quarterly', 'yearly'];
export const COMPOUNDINGS: Compounding[] = ['daily', 'monthly', 'quarterly', 'yearly'];

export interface CompoundInterestRequest {
    initialAmount: number;
    contributionAmount: number;
    annualRatePercent: number;
    years: number;
    contributionFrequency: ContributionFrequency;
    /** `false` = versement en fin de période, `true` = au début. */
    contributionAtStart: boolean;
    contributionGrowthPercent: number;
    compounding: Compounding;
    annualFeePercent: number;
    inflationPercent: number;
}

export interface CompoundInterestPoint {
    year: number;
    /** Capital de départ + versements cumulés. */
    contributed: number;
    value: number;
    /** `value` - `contributed`. */
    interest: number;
    /** Intérêts gagnés pendant l’année. */
    yearInterest: number;
    /** Valeur en pouvoir d’achat d’aujourd’hui. */
    realValue: number;
}

export interface CompoundInterestScenario {
    annualRatePercent: number;
    finalValue: number;
    totalInterest: number;
}

export interface CompoundInterestResult {
    input: CompoundInterestRequest;
    finalValue: number;
    totalContributed: number;
    totalInterest: number;
    finalRealValue: number;
    /** Ce que les frais retirent de la valeur finale. */
    feeCost: number;
    points: CompoundInterestPoint[];
    scenarios: CompoundInterestScenario[];
}

export interface SaveCompoundCalculationPayload {
    name: string;
    input: CompoundInterestRequest;
    currency?: string | null;
}

export interface CompoundCalculation {
    publicId: string;
    name: string;
    currency: string;
    input: CompoundInterestRequest;
    finalValue: number;
    createdAt: string;
    updatedAt: string | null;
}

export interface CompoundCalculationList {
    items: CompoundCalculation[];
    totalCount: number;
}
