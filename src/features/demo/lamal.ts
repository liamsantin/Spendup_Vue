import { demoDb, type DemoDb } from '@/features/demo/db';
import type { LamalComparison, LamalComparisonRequest, LamalContext, LamalOption, LamalSavedComparison } from '@/features/insurance/lamal';
import { AppError } from '@/utils/errors/app-error';

/**
 * Comparateur LAMal de la démo : mêmes règles que l'API (franchises, taux de 10 % et plafond de 700 CHF de 2026 pour un adulte,
 * franchises de 0 à 600 et plafond de 350 CHF pour un enfant).
 * Coût = 12 primes + min(frais, franchise) + min(plafond, 10 % × max(0, frais − franchise)).
 */
const FRANCHISES = [300, 500, 1000, 1500, 2000, 2500];
const CHILD_FRANCHISES = [0, 100, 200, 300, 400, 500, 600];
const RATE = 10;
const MAX_SHARE = 700;
const MAX_SHARE_CHILD = 350;
const LEGAL_YEAR = 2026;
const MAX_QUOTES = 10;
const FACTORS: Record<string, number> = { quotidien: 365, hebdomadaire: 52, mensuel: 12, trimestriel: 4, semestriel: 2, annuel: 1 };

function round(value: number): number {
    return Math.round(value * 100) / 100;
}

function invalid(message: string): never {
    throw new AppError(message, 400);
}

export function demoLamalContext(db: DemoDb, year: number | null, child = false): LamalContext {
    const target = year ?? new Date().getFullYear();
    const saved = db.lamalSaved.find((row) => row.year === target && row.child === child) ?? null;
    const base = {
        year: target,
        legalYear: LEGAL_YEAR,
        isFallback: target !== LEGAL_YEAR,
        quotePartRate: RATE,
        currency: 'CHF',
        child,
        saved
    };
    if (child) {
        return {
            ...base,
            franchises: CHILD_FRANCHISES,
            quotePartMax: MAX_SHARE_CHILD,
            insurancePublicId: null,
            insuranceName: null,
            currentFranchise: null,
            currentMonthlyPremium: null,
            expectedCosts: null,
            expectedCostsYear: null
        };
    }
    const insurance = db.recurringExpenses.find(
        (e) => e.expenseType === 'assurance' && e.insurance?.insuranceType === 'healthBasic' && e.isActive !== false
    );
    const perPeriod = insurance?.insurance?.grossPremium ?? insurance?.plannedAmount ?? null;
    const factor = insurance ? (FACTORS[String(insurance.frequency)] ?? null) : null;
    return {
        ...base,
        franchises: FRANCHISES,
        quotePartMax: MAX_SHARE,
        insurancePublicId: insurance?.publicId ?? null,
        insuranceName: insurance?.name ?? null,
        currentFranchise: insurance?.insurance?.franchise ?? null,
        currentMonthlyPremium: perPeriod !== null && factor ? round((perPeriod * factor) / 12) : null,
        expectedCosts: null,
        expectedCostsYear: null
    };
}

export function demoLamalCompare(request: LamalComparisonRequest): LamalComparison {
    const child = request.child === true;
    const allowed = child ? CHILD_FRANCHISES : FRANCHISES;
    const maxShare = child ? MAX_SHARE_CHILD : MAX_SHARE;
    const expected = round(request.expectedCosts);
    if (!Number.isFinite(expected) || expected < 0) invalid('Les frais de santé prévus doivent être positifs.');
    if (!request.quotes?.length) invalid('Saisissez au moins une prime mensuelle.');
    if (request.quotes.length > MAX_QUOTES) invalid(`Au plus ${MAX_QUOTES} devis par comparaison.`);
    const seen = new Set<number>();
    const rows = request.quotes.map((quote) => {
        const franchise = round(quote.franchise);
        if (!allowed.includes(franchise)) invalid('Franchise invalide.');
        if (seen.has(franchise)) invalid('Une franchise est saisie deux fois.');
        seen.add(franchise);
        const premium = round(quote.monthlyPremium);
        if (!(premium > 0 && premium <= 5000)) invalid('La prime mensuelle est invalide.');
        const share = Math.min(maxShare, round((RATE / 100) * Math.max(0, expected - franchise)));
        return {
            franchise,
            premium,
            share,
            cost: 12 * premium + Math.min(expected, franchise) + share,
            max: 12 * premium + franchise + maxShare
        };
    });
    rows.sort((a, b) => a.franchise - b.franchise);
    const cheapest = [...rows].sort((a, b) => a.cost - b.cost || a.max - b.max || a.franchise - b.franchise)[0];
    const current = request.currentFranchise === null || request.currentFranchise === undefined ? null : round(request.currentFranchise);
    const currentCost = current === null ? null : (rows.find((r) => r.franchise === current)?.cost ?? null);
    const options: LamalOption[] = rows.map((r) => ({
        franchise: r.franchise,
        monthlyPremium: r.premium,
        annualPremium: 12 * r.premium,
        expectedCostSharing: r.share,
        expectedCost: r.cost,
        maxCost: r.max,
        savingVsCurrent: currentCost === null ? null : round(currentCost - r.cost),
        isCurrent: current === r.franchise,
        isCheapest: r.franchise === cheapest.franchise
    }));
    return {
        year: request.year ?? new Date().getFullYear(),
        legalYear: LEGAL_YEAR,
        isFallback: (request.year ?? new Date().getFullYear()) !== LEGAL_YEAR,
        expectedCosts: expected,
        currentFranchise: current,
        recommendedFranchise: cheapest.franchise,
        savingVsCurrent: currentCost === null ? null : round(currentCost - cheapest.cost),
        options,
        currency: 'CHF',
        child
    };
}

/** Enregistre (crée ou remplace) la comparaison de l'année et du profil : saisies validées et arrondies, comme l'API. */
export function demoLamalSave(request: LamalComparisonRequest): LamalSavedComparison {
    const result = demoLamalCompare(request);
    const saved: LamalSavedComparison = {
        year: result.year,
        child: result.child,
        expectedCosts: result.expectedCosts,
        currentFranchise: result.currentFranchise,
        quotes: result.options.map((o) => ({ franchise: o.franchise, monthlyPremium: o.monthlyPremium })),
        updatedAt: new Date().toISOString()
    };
    const db = demoDb();
    db.lamalSaved = [...db.lamalSaved.filter((row) => !(row.year === saved.year && row.child === saved.child)), saved];
    return saved;
}

export function demoLamalDeleteSaved(year: number | null, child: boolean): void {
    const target = year ?? new Date().getFullYear();
    const db = demoDb();
    db.lamalSaved = db.lamalSaved.filter((row) => !(row.year === target && row.child === child));
}
