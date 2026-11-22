import { demoDb } from '@/features/demo/db';
import { demoLegalParameters } from '@/features/demo/legal-parameters';
import { computeRetirement, retirementInputIssue, type RetirementLegal } from '@/features/retirement/calculator';
import {
    RETIREMENT_DEFAULT_SPREAD_YEARS,
    type RetirementInput,
    type RetirementProfile,
    type RetirementResult
} from '@/features/retirement/types';
import { AppError } from '@/utils/errors/app-error';

const round2 = (value: number): number => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/** Saisie arrondie et complétée (répartition de 20 ans par défaut), comme l’API. */
function normalize(body: Partial<RetirementInput>): RetirementInput {
    const gender = String(body.gender ?? '')
        .trim()
        .toLowerCase();
    return {
        birthYear: Number(body.birthYear),
        gender: gender as RetirementInput['gender'],
        avsMonthlyPension: round2(body.avsMonthlyPension ?? 0),
        lppAnnualPension: round2(body.lppAnnualPension ?? 0),
        lppCapital: round2(body.lppCapital ?? 0),
        lppConversionRatePercent: round2(body.lppConversionRatePercent ?? 0),
        pillar3aCapital: round2(body.pillar3aCapital ?? 0),
        pillar3aSpreadYears: body.pillar3aSpreadYears ?? RETIREMENT_DEFAULT_SPREAD_YEARS,
        monthlyExpensesOverride:
            body.monthlyExpensesOverride === null || body.monthlyExpensesOverride === undefined
                ? null
                : round2(body.monthlyExpensesOverride),
        expectedReturnPercent: round2(body.expectedReturnPercent ?? 0)
    };
}

function checked(body: Partial<RetirementInput>): RetirementInput {
    const input = normalize(body);
    const issue = retirementInputIssue(input, new Date());
    if (issue) throw new AppError(issue, 400);
    return input;
}

function legal(): RetirementLegal {
    const parameters = demoLegalParameters(null);
    const value = (key: string): number => parameters.items.find((item) => item.key === key)?.value ?? 0;
    return {
        year: parameters.year,
        avsPensionMin: value('avsPensionMin'),
        avsPensionMax: value('avsPensionMax'),
        lppMinConversionRatePercent: value('lppMinConversionRate')
    };
}

/** Estimation de la démo : sans transactions chiffrées, les dépenses viennent de la saisie seulement. */
export function demoRetirementSimulate(body: Partial<RetirementInput>): RetirementResult {
    return computeRetirement(checked(body), legal(), demoDb().settings.defaultCurrency, null, new Date());
}

export function demoRetirementGet(): RetirementProfile {
    const db = demoDb();
    return { input: db.retirementProfile?.input ?? null, updatedAt: db.retirementProfile?.updatedAt ?? null };
}

export function demoRetirementSave(body: Partial<RetirementInput>): RetirementProfile {
    const profile: RetirementProfile = { input: checked(body), updatedAt: new Date().toISOString() };
    demoDb().retirementProfile = profile;
    return profile;
}

export function demoRetirementRemove(): void {
    demoDb().retirementProfile = null;
}
