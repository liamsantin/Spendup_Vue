import {
    RETIREMENT_AMOUNT_MAX,
    RETIREMENT_CONVERSION_RATE_MAX,
    RETIREMENT_DEFAULT_SPREAD_YEARS,
    RETIREMENT_MAX_SPREAD_YEARS,
    RETIREMENT_MIN_AGE,
    RETIREMENT_MIN_BIRTH_YEAR,
    RETIREMENT_RETURN_MAX,
    type RetirementGender,
    type RetirementInput,
    type RetirementReferenceAge,
    type RetirementResult,
    type RetirementSavingsNeed,
    type RetirementWarning
} from '@/features/retirement/types';

/** Bornes et taux de l’année (paramètres légaux, M0). */
export interface RetirementLegal {
    year: number;
    avsPensionMin: number;
    avsPensionMax: number;
    lppMinConversionRatePercent: number;
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Âge de référence AVS : 65 ans pour les hommes ; pour les femmes 64 ans jusqu’en 1960, 64 ans + 3, 6 ou 9 mois pour 1961,
 * 1962, 1963, puis 65 ans dès 1964. Même règle que l’API.
 */
export function referenceAge(gender: RetirementGender, birthYear: number): RetirementReferenceAge {
    if (gender !== 'female') return { years: 65, extraMonths: 0 };
    if (birthYear <= 1960) return { years: 64, extraMonths: 0 };
    if (birthYear === 1961) return { years: 64, extraMonths: 3 };
    if (birthYear === 1962) return { years: 64, extraMonths: 6 };
    if (birthYear === 1963) return { years: 64, extraMonths: 9 };
    return { years: 65, extraMonths: 0 };
}

/** Mois entre `today` et le mois de l’âge de référence (né en janvier, estimation prudente) ; 0 si déjà atteint. */
export function monthsToRetirement(input: RetirementInput, today: Date): number {
    const age = referenceAge(input.gender, input.birthYear);
    const target = (input.birthYear + age.years) * 12 + age.extraMonths;
    return Math.max(0, target - (today.getFullYear() * 12 + today.getMonth()));
}

/** Message d’erreur de l’API, ou null si la saisie est acceptée. */
export function retirementInputIssue(input: RetirementInput, today: Date): string | null {
    const amounts = [input.avsMonthlyPension, input.lppAnnualPension, input.lppCapital, input.pillar3aCapital];
    if (input.monthlyExpensesOverride !== null) amounts.push(input.monthlyExpensesOverride);
    if (
        !Number.isInteger(input.birthYear) ||
        input.birthYear < RETIREMENT_MIN_BIRTH_YEAR ||
        input.birthYear > today.getFullYear() - RETIREMENT_MIN_AGE
    ) {
        return `L'année de naissance doit être comprise entre ${RETIREMENT_MIN_BIRTH_YEAR} et ${today.getFullYear() - RETIREMENT_MIN_AGE}.`;
    }
    if (input.gender !== 'female' && input.gender !== 'male') {
        return 'Le sexe doit être « female » ou « male » (il ne sert qu’à l’âge de référence).';
    }
    if (amounts.some((value) => !Number.isFinite(value) || value < 0 || value > RETIREMENT_AMOUNT_MAX)) {
        return 'Saisissez un montant compris entre 0 et 1 000 000 000.';
    }
    const rate = input.lppConversionRatePercent;
    if (!Number.isFinite(rate) || rate < 0 || rate > RETIREMENT_CONVERSION_RATE_MAX) {
        return `Le taux de conversion doit être compris entre 0 et ${RETIREMENT_CONVERSION_RATE_MAX} %.`;
    }
    if (input.lppCapital > 0 && input.lppAnnualPension === 0 && rate === 0) {
        return 'Saisissez le taux de conversion de votre caisse de pension, ou la rente annuelle de votre certificat LPP.';
    }
    const expected = input.expectedReturnPercent;
    if (!Number.isFinite(expected) || expected < 0 || expected > RETIREMENT_RETURN_MAX) {
        return `Le rendement doit être compris entre 0 et ${RETIREMENT_RETURN_MAX} %.`;
    }
    const spread = input.pillar3aSpreadYears ?? RETIREMENT_DEFAULT_SPREAD_YEARS;
    if (!Number.isInteger(spread) || spread < 1 || spread > RETIREMENT_MAX_SPREAD_YEARS) {
        return `La répartition doit être comprise entre 1 et ${RETIREMENT_MAX_SPREAD_YEARS} ans.`;
    }
    return null;
}

function savingsNeed(gap: number, spreadYears: number, months: number, returnPercent: number): RetirementSavingsNeed {
    const required = round2(gap * 12 * spreadYears);
    if (months === 0) return { requiredCapital: required, monthsToRetirement: 0, returnPercent, monthlySavings: null };
    const monthlyRate = Math.pow(1 + returnPercent / 100, 1 / 12) - 1;
    const monthly = monthlyRate < 1e-12 ? required / months : (required * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1);
    return { requiredCapital: required, monthsToRetirement: months, returnPercent, monthlySavings: round2(monthly) };
}

/**
 * Rente totale mensuelle = AVS × 13 / 12 + LPP / 12 + capital 3a réparti sur N années, comparée aux dépenses mensuelles.
 * Même calcul que l’API (`RetirementCalculator`) ; sert au mode démo. `expensesAverage` : moyenne constatée, ignorée si une
 * dépense est saisie.
 */
export function computeRetirement(
    input: RetirementInput,
    legal: RetirementLegal,
    currency: string,
    expensesAverage: { amount: number; monthsUsed: number } | null,
    today: Date
): RetirementResult {
    const spread = input.pillar3aSpreadYears ?? RETIREMENT_DEFAULT_SPREAD_YEARS;
    const age = referenceAge(input.gender, input.birthYear);
    const months = monthsToRetirement(input, today);

    const avsMonthly = round2((input.avsMonthlyPension * 13) / 12);
    const lppYearly = input.lppAnnualPension > 0 ? input.lppAnnualPension : (input.lppCapital * input.lppConversionRatePercent) / 100;
    const lppMonthly = round2(lppYearly / 12);
    const pillar3aMonthly = round2(input.pillar3aCapital / (spread * 12));
    const total = round2(avsMonthly + lppMonthly + pillar3aMonthly);

    const warnings: RetirementWarning[] = [];
    if (input.avsMonthlyPension > legal.avsPensionMax) warnings.push('avsAboveMax');
    else if (input.avsMonthlyPension > 0 && input.avsMonthlyPension < legal.avsPensionMin) warnings.push('avsBelowMin');
    if (input.lppAnnualPension === 0 && input.lppCapital > 0 && input.lppConversionRatePercent < legal.lppMinConversionRatePercent) {
        warnings.push('lppRateBelowMinimum');
    }

    let expenses = 0;
    let source: RetirementResult['expensesSource'] = 'none';
    let monthsUsed = 0;
    if (input.monthlyExpensesOverride !== null) {
        expenses = input.monthlyExpensesOverride;
        source = 'input';
    } else if (expensesAverage && expensesAverage.monthsUsed > 0) {
        expenses = round2(expensesAverage.amount);
        source = 'average';
        monthsUsed = expensesAverage.monthsUsed;
    }
    if (expenses === 0) warnings.push('noExpenses');

    const gap = round2(expenses - total);
    return {
        input,
        currency,
        legalYear: legal.year,
        referenceAge: age,
        alreadyRetired: months === 0,
        avsMonthly,
        lppMonthly,
        pillar3aMonthly,
        totalMonthly: total,
        monthlyExpenses: expenses,
        expensesSource: source,
        expensesMonthsUsed: monthsUsed,
        gap,
        coverageRate: expenses > 0 ? Math.round((total / expenses) * 10000) / 10000 : null,
        savings: gap > 0 ? savingsNeed(gap, spread, months, input.expectedReturnPercent) : null,
        avsPensionMin: legal.avsPensionMin,
        avsPensionMax: legal.avsPensionMax,
        lppMinConversionRatePercent: legal.lppMinConversionRatePercent,
        warnings
    };
}
