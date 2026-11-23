import {
    computeCompoundInterest,
    compoundInputIssue,
    solveCompoundGoal,
    type CompoundIssue
} from '@/features/compound-interest/calculator';
import {
    COMPOUNDINGS,
    CONTRIBUTION_FREQUENCIES,
    COMPOUND_MAX_SAVED,
    COMPOUND_NAME_MAX,
    type CompoundCalculation,
    type CompoundInterestGoal,
    type CompoundInterestRequest,
    type CompoundInterestResult,
    type Compounding,
    type ContributionFrequency,
    type SaveCompoundCalculationPayload
} from '@/features/compound-interest/types';
import { createPublicId, demoDb } from '@/features/demo/db';
import { AppError } from '@/utils/errors/app-error';

const MESSAGES: Record<CompoundIssue, string> = {
    empty: 'Saisissez un capital de départ ou un versement.',
    amount: 'Le capital et le versement doivent être compris entre 0 et 1 000 000 000.',
    rate: 'Le rendement annuel doit être compris entre -100 et 100 %.',
    years: 'La durée doit être comprise entre 1 et 50 ans.',
    growth: 'La hausse annuelle des versements doit être comprise entre 0 et 100 %.',
    fee: 'Les frais annuels doivent être compris entre 0 et 20 %.',
    inflation: "L'inflation annuelle doit être comprise entre 0 et 100 %.",
    overflow: 'Le résultat dépasse les limites du calcul : réduisez le rendement ou la durée.'
};

function invalid(message: string): never {
    throw new AppError(message, 400);
}

const round2 = (value: number): number => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

function choice<T extends string>(raw: string | null | undefined, allowed: T[], fallback: T, message: string): T {
    if (!raw || !String(raw).trim()) return fallback;
    const value = String(raw).trim().toLowerCase() as T;
    return allowed.includes(value) ? value : invalid(message);
}

/** Paramètres arrondis et complétés (versements et capitalisation mensuels par défaut), comme l’API. */
function normalize(body: Partial<CompoundInterestRequest>): CompoundInterestRequest {
    return {
        initialAmount: round2(body.initialAmount ?? 0),
        contributionAmount: round2(body.contributionAmount ?? 0),
        annualRatePercent: round2(body.annualRatePercent ?? 0),
        years: Number(body.years),
        contributionFrequency: choice<ContributionFrequency>(
            body.contributionFrequency,
            CONTRIBUTION_FREQUENCIES,
            'monthly',
            'La fréquence des versements est invalide (monthly, quarterly, yearly).'
        ),
        contributionAtStart: body.contributionAtStart === true,
        contributionGrowthPercent: round2(body.contributionGrowthPercent ?? 0),
        compounding: choice<Compounding>(
            body.compounding,
            COMPOUNDINGS,
            'monthly',
            'La capitalisation est invalide (daily, monthly, quarterly, yearly).'
        ),
        annualFeePercent: round2(body.annualFeePercent ?? 0),
        inflationPercent: round2(body.inflationPercent ?? 0)
    };
}

function compute(input: CompoundInterestRequest): CompoundInterestResult {
    const issue = compoundInputIssue(input);
    if (issue) invalid(MESSAGES[issue]);
    return computeCompoundInterest(input) ?? invalid(MESSAGES.overflow);
}

/** Calcul sans enregistrement : mêmes limites que l’API, même méthode que la page. */
export function demoCompoundSimulate(body: Partial<CompoundInterestRequest>): CompoundInterestResult {
    return compute(normalize(body));
}

/** Calcul inverse sans enregistrement : versement ou durée pour atteindre un montant visé, comme l’API. */
export function demoCompoundGoal(body: {
    targetAmount: number;
    solve: string;
    input: Partial<CompoundInterestRequest>;
}): CompoundInterestGoal {
    const target = round2(body.targetAmount);
    if (!(target > 0) || target > 1_000_000_000) invalid('Le montant visé doit être compris entre 0,01 et 1 000 000 000.');
    const solve = String(body.solve ?? '')
        .trim()
        .toLowerCase();
    if (solve !== 'contribution' && solve !== 'years') invalid('Le calcul inverse est invalide (contribution, years).');

    const solveContribution = solve === 'contribution';
    const input = normalize(solveContribution ? { ...body.input, contributionAmount: 1 } : { ...body.input, years: 50 });
    const issue = compoundInputIssue(input);
    if (issue) invalid(MESSAGES[issue]);
    const solution = solveCompoundGoal(input, target, solveContribution ? 'contribution' : 'years');
    if (!solution || (solution.contribution === null && solution.months === null)) {
        return { solve, reachable: false, targetAmount: target, contributionAmount: null, months: null, result: null };
    }
    const final = solveContribution
        ? { ...input, contributionAmount: solution.contribution ?? 0 }
        : { ...input, years: Math.max(1, Math.ceil((solution.months ?? 12) / 12)) };
    return {
        solve,
        reachable: true,
        targetAmount: target,
        contributionAmount: solution.contribution,
        months: solution.months,
        result: compute(final)
    };
}

function name(raw: string | null | undefined): string {
    const value = (raw ?? '').trim();
    if (!value) invalid('Le nom du calcul est obligatoire.');
    if (value.length > COMPOUND_NAME_MAX) invalid(`Le nom du calcul dépasse ${COMPOUND_NAME_MAX} caractères.`);
    return value;
}

function find(id: string): CompoundCalculation {
    const item = demoDb().compoundCalculations.find((row) => row.publicId === id);
    if (!item) throw new AppError('Calcul introuvable.', 404);
    return item;
}

function withValue(item: CompoundCalculation): CompoundCalculation {
    return { ...item, finalValue: compute(item.input).finalValue };
}

export function demoCompoundList(): { items: CompoundCalculation[]; totalCount: number } {
    const items = [...demoDb().compoundCalculations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(withValue);
    return { items, totalCount: items.length };
}

export function demoCompoundGet(id: string): CompoundCalculation {
    return withValue(find(id));
}

export function demoCompoundCreate(body: SaveCompoundCalculationPayload): CompoundCalculation {
    const label = name(body.name);
    const input = normalize(body.input);
    const result = compute(input);
    if (demoDb().compoundCalculations.length >= COMPOUND_MAX_SAVED) {
        invalid(`Vous avez atteint la limite de ${COMPOUND_MAX_SAVED} calculs enregistrés. Supprimez-en un pour continuer.`);
    }
    const created: CompoundCalculation = {
        publicId: createPublicId(),
        name: label,
        currency: body.currency?.trim().toUpperCase() || demoDb().settings.defaultCurrency,
        input,
        finalValue: result.finalValue,
        createdAt: new Date().toISOString(),
        updatedAt: null
    };
    demoDb().compoundCalculations.push(created);
    return created;
}

export function demoCompoundUpdate(id: string, body: SaveCompoundCalculationPayload): CompoundCalculation {
    const item = find(id);
    const label = name(body.name);
    const input = normalize(body.input);
    const result = compute(input);
    item.name = label;
    item.input = input;
    item.finalValue = result.finalValue;
    item.updatedAt = new Date().toISOString();
    return item;
}

export function demoCompoundRemove(id: string): void {
    find(id);
    const db = demoDb();
    db.compoundCalculations = db.compoundCalculations.filter((row) => row.publicId !== id);
}
