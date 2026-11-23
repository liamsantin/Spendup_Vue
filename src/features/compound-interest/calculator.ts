import {
    COMPOUND_AMOUNT_MAX,
    COMPOUND_FEE_MAX,
    COMPOUND_MAX_YEARS,
    COMPOUND_PERCENT_MAX,
    COMPOUND_RATE_MAX,
    COMPOUND_RATE_MIN,
    COMPOUND_SCENARIO_STEP,
    type Compounding,
    type CompoundInterestPoint,
    type CompoundInterestRequest,
    type CompoundInterestResult,
    type CompoundInterestScenario
} from '@/features/compound-interest/types';

/**
 * Intérêts composés avec versements réguliers, même méthode que l’API : le calcul avance mois par mois, taux net = rendement - frais,
 * facteur mensuel = (1 + taux net / m)^(m / 12) où m = capitalisations par an (365 pour « daily »). Un versement « au début » entre
 * avant les intérêts du mois, « à la fin » après. Trimestriel : mois 1, 4, 7, 10 (début) ou 3, 6, 9, 12 (fin) ; annuel : mois 1 ou 12.
 */
export type CompoundIssue = 'empty' | 'amount' | 'rate' | 'years' | 'growth' | 'fee' | 'inflation' | 'overflow';

/** Au-delà, un résultat n’est plus représentable côté API (decimal) : on refuse plutôt que d’afficher n’importe quoi. */
const VALUE_LIMIT = 1e27;

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/** Premier problème des paramètres, ou `null` s’ils sont calculables (mêmes limites que l’API). */
export function compoundInputIssue(input: CompoundInterestRequest): CompoundIssue | null {
    const amounts = [input.initialAmount, input.contributionAmount];
    if (amounts.some((a) => !Number.isFinite(a) || a < 0 || a > COMPOUND_AMOUNT_MAX)) return 'amount';
    if (input.initialAmount === 0 && input.contributionAmount === 0) return 'empty';
    if (
        !Number.isFinite(input.annualRatePercent) ||
        input.annualRatePercent < COMPOUND_RATE_MIN ||
        input.annualRatePercent > COMPOUND_RATE_MAX
    ) {
        return 'rate';
    }
    if (!Number.isInteger(input.years) || input.years < 1 || input.years > COMPOUND_MAX_YEARS) return 'years';
    if (
        !Number.isFinite(input.contributionGrowthPercent) ||
        input.contributionGrowthPercent < 0 ||
        input.contributionGrowthPercent > COMPOUND_PERCENT_MAX
    ) {
        return 'growth';
    }
    if (!Number.isFinite(input.annualFeePercent) || input.annualFeePercent < 0 || input.annualFeePercent > COMPOUND_FEE_MAX) return 'fee';
    if (!Number.isFinite(input.inflationPercent) || input.inflationPercent < 0 || input.inflationPercent > COMPOUND_PERCENT_MAX)
        return 'inflation';
    return null;
}

function periodsPerYear(compounding: Compounding): number {
    if (compounding === 'daily') return 365;
    if (compounding === 'quarterly') return 4;
    if (compounding === 'yearly') return 1;
    return 12;
}

interface YearEnd {
    year: number;
    contributed: number;
    value: number;
}

function* months(
    input: CompoundInterestRequest,
    annualRatePercent: number,
    annualFeePercent: number
): Generator<{ month: number; contributed: number; value: number }> {
    const net = Math.max(annualRatePercent - annualFeePercent, COMPOUND_RATE_MIN);
    const perYear = periodsPerYear(input.compounding);
    const monthlyFactor = Math.pow(1 + net / 100 / perYear, perYear / 12);
    const every = input.contributionFrequency === 'quarterly' ? 3 : input.contributionFrequency === 'yearly' ? 12 : 1;

    let value = input.initialAmount;
    let contributed = value;

    for (let month = 1; month <= input.years * 12; month += 1) {
        const year = Math.floor((month - 1) / 12) + 1;
        const due = input.contributionAtStart ? (month - 1) % every === 0 : month % every === 0;
        const amount = due ? input.contributionAmount * Math.pow(1 + input.contributionGrowthPercent / 100, year - 1) : 0;

        if (input.contributionAtStart) value += amount;
        value *= monthlyFactor;
        if (!input.contributionAtStart) value += amount;
        contributed += amount;

        yield { month, contributed, value };
    }
}

function run(input: CompoundInterestRequest, annualRatePercent: number, annualFeePercent: number): YearEnd[] {
    const years: YearEnd[] = [];
    for (const { month, contributed, value } of months(input, annualRatePercent, annualFeePercent)) {
        if (month % 12 === 0) years.push({ year: month / 12, contributed, value });
    }
    return years;
}

export type CompoundGoalSolve = 'contribution' | 'years';

export interface CompoundGoalSolution {
    /** Versement trouvé (mode `contribution`), arrondi au centime supérieur. */
    contribution: number | null;
    /** Nombre de mois trouvé (mode `years`). */
    months: number | null;
}

/**
 * Calcul inverse, même méthode que l’API : versement qui atteint `target` au bout de `input.years`, ou durée (50 ans au plus,
 * versement de `input`) qui l’atteint. `null` si les paramètres sont invalides ou le montant visé est hors limites ;
 * `{ contribution: null, months: null }` si l’objectif est inatteignable.
 */
export function solveCompoundGoal(input: CompoundInterestRequest, target: number, solve: CompoundGoalSolve): CompoundGoalSolution | null {
    if (!Number.isFinite(target) || target <= 0 || target > COMPOUND_AMOUNT_MAX) return null;
    const solveContribution = solve === 'contribution';
    const probe = solveContribution ? { ...input, contributionAmount: 1 } : { ...input, years: COMPOUND_MAX_YEARS };
    if (compoundInputIssue(probe)) return null;

    const rate = input.annualRatePercent;
    const fee = input.annualFeePercent;
    if (!solveContribution) {
        for (const { month, value } of months(probe, rate, fee)) {
            if (!Number.isFinite(value) || Math.abs(value) > VALUE_LIMIT) break;
            if (value >= target) return { contribution: null, months: month };
        }
        return { contribution: null, months: null };
    }

    // Valeur finale linéaire en fonction du versement : valeur(c) = valeur(0) + c × (valeur(1) - valeur(0)).
    const last = (request: CompoundInterestRequest): number => {
        let value = 0;
        for (const row of months(request, rate, fee)) value = row.value;
        return value;
    };
    const zero = last({ ...input, contributionAmount: 0 });
    if (zero >= target) return { contribution: 0, months: null };
    const perUnit = last({ ...input, contributionAmount: 1 }) - zero;
    if (!Number.isFinite(perUnit) || perUnit <= 1e-9) return { contribution: null, months: null };
    const needed = Math.ceil(((target - zero) / perUnit) * 100) / 100;
    return needed > COMPOUND_AMOUNT_MAX ? { contribution: null, months: null } : { contribution: needed, months: null };
}

/**
 * Résultat complet : total, une ligne par année, coût des frais et trois rendements comparés (saisi, -2 et +2 points quand
 * ils restent dans les limites). `null` si les paramètres sont invalides ou si le résultat dépasse les limites du calcul.
 */
export function computeCompoundInterest(input: CompoundInterestRequest): CompoundInterestResult | null {
    if (compoundInputIssue(input)) return null;

    const main = run(input, input.annualRatePercent, input.annualFeePercent);
    const withoutFees = input.annualFeePercent > 0 ? run(input, input.annualRatePercent, 0) : main;
    const last = main[main.length - 1];
    if (!last || ![...main, ...withoutFees].every((row) => Number.isFinite(row.value) && Math.abs(row.value) <= VALUE_LIMIT)) return null;

    const scenarios: CompoundInterestScenario[] = [];
    for (const delta of [-COMPOUND_SCENARIO_STEP, 0, COMPOUND_SCENARIO_STEP]) {
        const rate = input.annualRatePercent + delta;
        if (rate < COMPOUND_RATE_MIN || rate > COMPOUND_RATE_MAX) continue;
        const end = delta === 0 ? last : run(input, rate, input.annualFeePercent).slice(-1)[0];
        if (!end || !Number.isFinite(end.value) || Math.abs(end.value) > VALUE_LIMIT) return null;
        scenarios.push({ annualRatePercent: rate, finalValue: round2(end.value), totalInterest: round2(end.value - end.contributed) });
    }

    const points: CompoundInterestPoint[] = [];
    let previous = input.initialAmount;
    let previousContributed = input.initialAmount;
    for (const row of main) {
        const contributedThisYear = row.contributed - previousContributed;
        points.push({
            year: row.year,
            contributed: round2(row.contributed),
            value: round2(row.value),
            interest: round2(row.value - row.contributed),
            yearInterest: round2(row.value - previous - contributedThisYear),
            realValue: round2(row.value / Math.pow(1 + input.inflationPercent / 100, row.year))
        });
        previous = row.value;
        previousContributed = row.contributed;
    }

    return {
        input,
        finalValue: round2(last.value),
        totalContributed: round2(last.contributed),
        totalInterest: round2(last.value - last.contributed),
        finalRealValue: points[points.length - 1]?.realValue ?? 0,
        feeCost: round2(withoutFees[withoutFees.length - 1].value - last.value),
        points,
        scenarios
    };
}
