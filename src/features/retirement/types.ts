/**
 * Simulateur retraite simplifié (`/api/retirement`). Estimation à partir de documents officiels (extrait AVS, certificat LPP,
 * avoirs 3a) : les caisses AVS et LPP font foi. Tous les montants du résultat sont mensuels.
 */
export const RETIREMENT_PATH = '/app/planning/retraite';

export const RETIREMENT_DEFAULT_SPREAD_YEARS = 20;
export const RETIREMENT_MAX_SPREAD_YEARS = 40;
export const RETIREMENT_AMOUNT_MAX = 1_000_000_000;
export const RETIREMENT_CONVERSION_RATE_MAX = 15;
export const RETIREMENT_RETURN_MAX = 20;
export const RETIREMENT_MIN_BIRTH_YEAR = 1920;
export const RETIREMENT_MIN_AGE = 18;

export type RetirementGender = 'female' | 'male';
export const RETIREMENT_GENDERS: RetirementGender[] = ['female', 'male'];

export type RetirementWarning = 'avsAboveMax' | 'avsBelowMin' | 'lppRateBelowMinimum' | 'noExpenses';
export type RetirementExpensesSource = 'input' | 'average' | 'none';

export interface RetirementInput {
    birthYear: number;
    gender: RetirementGender;
    /** Rente mensuelle estimée de l’extrait de compte AVS. */
    avsMonthlyPension: number;
    /** Rente annuelle projetée du certificat LPP ; 0 = déduite du capital et du taux de conversion. */
    lppAnnualPension: number;
    lppCapital: number;
    lppConversionRatePercent: number;
    pillar3aCapital: number;
    /** Années sur lesquelles le capital 3a (et le capital manquant) est réparti. */
    pillar3aSpreadYears: number | null;
    /** Dépenses mensuelles saisies ; null = moyenne des mois écoulés. */
    monthlyExpensesOverride: number | null;
    expectedReturnPercent: number;
}

export interface RetirementReferenceAge {
    years: number;
    extraMonths: number;
}

export interface RetirementSavingsNeed {
    requiredCapital: number;
    monthsToRetirement: number;
    returnPercent: number;
    /** null si l’utilisateur a déjà atteint l’âge de référence. */
    monthlySavings: number | null;
}

export interface RetirementResult {
    input: RetirementInput;
    currency: string;
    legalYear: number;
    referenceAge: RetirementReferenceAge;
    alreadyRetired: boolean;
    avsMonthly: number;
    lppMonthly: number;
    pillar3aMonthly: number;
    totalMonthly: number;
    monthlyExpenses: number;
    expensesSource: RetirementExpensesSource;
    expensesMonthsUsed: number;
    /** Dépenses - rente totale : positif = manque, négatif = surplus. */
    gap: number;
    coverageRate: number | null;
    savings: RetirementSavingsNeed | null;
    avsPensionMin: number;
    avsPensionMax: number;
    lppMinConversionRatePercent: number;
    warnings: RetirementWarning[];
}

export interface RetirementProfile {
    input: RetirementInput | null;
    updatedAt: string | null;
}
