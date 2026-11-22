/**
 * Projection d’une épargne régulière : versements en fin de mois, taux mensuel = taux annuel / 12, capitalisation mensuelle.
 * Même méthode que l’API (`GET /api/savings-goals/{id}/projection`). Hypothèse : sans frais, impôts ni inflation.
 */
export const SAVINGS_PROJECTION_MAX_YEARS = 10;
export const SAVINGS_PROJECTION_RATE_MIN = -100;
export const SAVINGS_PROJECTION_RATE_MAX = 100;
export const SAVINGS_PROJECTION_AMOUNT_MAX = 1_000_000_000;

export type SavingsProjectionPoint = {
    year: number;
    /** Départ + versements cumulés. */
    contributed: number;
    value: number;
    /** `value` - `contributed` (négatif si le rendement est négatif). */
    interest: number;
};

export type SavingsProjection = {
    currency: string;
    startAmount: number;
    monthlyContribution: number;
    annualRatePercent: number;
    /** Vrai quand le versement est le rythme des trois derniers mois. */
    monthlyFromHistory: boolean;
    points: SavingsProjectionPoint[];
};

export type SavingsProjectionQuery = {
    years?: number;
    monthly?: number;
    ratePercent?: number;
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Une ligne par année, de 1 à `years`. Un départ négatif est ramené à 0. */
export function computeSavingsProjection(
    startAmount: number,
    monthly: number,
    annualRatePercent: number,
    years: number
): SavingsProjectionPoint[] {
    const monthlyRate = annualRatePercent / 1200;
    const start = Math.max(startAmount, 0);
    let value = start;
    let contributed = start;
    const points: SavingsProjectionPoint[] = [];
    for (let month = 1; month <= years * 12; month++) {
        value = value * (1 + monthlyRate) + monthly;
        contributed += monthly;
        if (month % 12 === 0) {
            const rounded = round2(value);
            const paid = round2(contributed);
            points.push({ year: month / 12, contributed: paid, value: rounded, interest: round2(rounded - paid) });
        }
    }
    return points;
}
