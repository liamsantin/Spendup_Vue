import type { LamalContext, LamalOption } from '@/features/insurance/lamal';

/**
 * Calcul local du comparateur LAMal, utilisé par la page pour répondre pendant la saisie (même formule que l'API) :
 * coût de l'année = 12 primes + frais jusqu'à la franchise + quote-part plafonnée.
 */
export interface LamalRowInput {
    franchise: number;
    /** Prime mensuelle saisie ; `null` : pas de devis pour cette franchise (la ligne n'est pas comparée). */
    premium: number | null;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

export function lamalCost(premium: number, franchise: number, costs: number, ratePercent: number, maxShare: number) {
    const share = Math.min(maxShare, round2((ratePercent / 100) * Math.max(0, costs - franchise)));
    return {
        share,
        cost: round2(12 * premium + Math.min(costs, franchise) + share),
        max: round2(12 * premium + franchise + maxShare)
    };
}

/**
 * Compare les lignes qui ont une prime valide. Égalité de coût : coût maximal le plus bas, puis franchise la plus basse.
 * L'écart avec la franchise actuelle n'existe que si cette franchise a elle aussi une prime.
 */
export function compareRows(
    context: Pick<LamalContext, 'quotePartRate' | 'quotePartMax'>,
    rows: LamalRowInput[],
    costs: number,
    currentFranchise: number | null
): LamalOption[] {
    const priced = rows
        .filter((r): r is { franchise: number; premium: number } => r.premium !== null && Number.isFinite(r.premium) && r.premium > 0)
        .map((r) => ({ ...r, ...lamalCost(r.premium, r.franchise, costs, context.quotePartRate, context.quotePartMax) }))
        .sort((a, b) => a.franchise - b.franchise);
    const best = [...priced].sort((a, b) => a.cost - b.cost || a.max - b.max || a.franchise - b.franchise)[0];
    const currentCost = priced.find((r) => r.franchise === currentFranchise)?.cost ?? null;
    return priced.map((r) => ({
        franchise: r.franchise,
        monthlyPremium: r.premium,
        annualPremium: round2(12 * r.premium),
        expectedCostSharing: r.share,
        expectedCost: r.cost,
        maxCost: r.max,
        savingVsCurrent: currentCost === null ? null : round2(currentCost - r.cost),
        isCurrent: r.franchise === currentFranchise,
        isCheapest: r.franchise === best.franchise
    }));
}
