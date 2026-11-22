import {
    SAVINGS_PROJECTION_AMOUNT_MAX,
    SAVINGS_PROJECTION_MAX_YEARS,
    SAVINGS_PROJECTION_RATE_MAX,
    SAVINGS_PROJECTION_RATE_MIN,
    computeSavingsProjection,
    type SavingsProjection
} from '@/features/savings-goals/projection';
import type { SavingsGoal } from '@/features/savings-goals/types';
import { AppError } from '@/utils/errors/app-error';

function invalid(message: string): never {
    throw new AppError(message, 400);
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

function optionalNumber(query: URLSearchParams, key: string): number | null {
    const raw = query.get(key);
    if (raw === null || raw.trim() === '') return null;
    const value = Number(raw);
    if (!Number.isFinite(value)) invalid('Paramètre invalide.');
    return value;
}

/** Rythme mensuel des trois derniers mois à partir des contributions de l’objectif (jamais négatif). */
function recentMonthly(goal: SavingsGoal): number {
    const since = new Date();
    since.setMonth(since.getMonth() - 3);
    const limit = since.toISOString().slice(0, 10);
    const recent = goal.contributions.filter((c) => c.operationDate >= limit).reduce((sum, c) => sum + c.amount, 0);
    return Math.max(round2(recent / 3), 0);
}

/** Projection d’épargne de la démo : mêmes limites que l’API, même calcul que la fiche. */
export function demoSavingsProjection(goal: SavingsGoal, query: URLSearchParams): SavingsProjection {
    const years = optionalNumber(query, 'years') ?? SAVINGS_PROJECTION_MAX_YEARS;
    if (!Number.isInteger(years) || years < 1 || years > SAVINGS_PROJECTION_MAX_YEARS) {
        invalid(`L’horizon doit être compris entre 1 et ${SAVINGS_PROJECTION_MAX_YEARS} ans.`);
    }
    const given = optionalNumber(query, 'monthly');
    const monthly = given === null ? recentMonthly(goal) : round2(given);
    if (!(monthly >= 0 && monthly <= SAVINGS_PROJECTION_AMOUNT_MAX))
        invalid('Le versement mensuel doit être compris entre 0 et 1 000 000 000.');
    const rate = round2(optionalNumber(query, 'ratePercent') ?? goal.expectedReturnRate ?? 0);
    if (!(rate >= SAVINGS_PROJECTION_RATE_MIN && rate <= SAVINGS_PROJECTION_RATE_MAX))
        invalid('Le rendement annuel doit être compris entre -100 et 100 %.');
    const start = Math.max(round2(goal.currentAmount), 0);
    return {
        currency: goal.currency,
        startAmount: start,
        monthlyContribution: monthly,
        annualRatePercent: rate,
        monthlyFromHistory: given === null,
        points: computeSavingsProjection(start, monthly, rate, years)
    };
}
