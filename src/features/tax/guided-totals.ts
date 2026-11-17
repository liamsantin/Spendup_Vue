import type { TaxAmountItem } from '@/features/tax/api';
import type { TaxLine, TaxPerson } from '@/features/tax/types';

/**
 * Saisie guidée des totaux (I0) : les huit lignes qui résument une déclaration, dans l'ordre du formulaire.
 * Huit champs au plus par écran (règle `futur.md`). Les codes sont ceux du catalogue (`TaxCatalogue`).
 */
export const GUIDED_TOTAL_CODES = [
    'income.employed',
    'income.retirementPension',
    'income.other',
    'deduction.jobExpenses',
    'deduction.pillar3a',
    'deduction.insurance',
    'asset.cashAndSecurities',
    'liability.debts'
] as const;

/** Montant tapé : `null` si vide, `undefined` si illisible ou négatif. Accepte `1'234.50`, `1 234,50`. */
export function parseGuidedAmount(raw: string | undefined): number | null | undefined {
    const trimmed = (raw ?? '').trim().replace(/\s/g, '').replace(/'/g, '').replace(',', '.');
    if (trimmed === '') return null;
    const value = Number(trimmed);
    return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** Lignes du catalogue à proposer, dans l'ordre de `GUIDED_TOTAL_CODES`. */
export function guidedLines(lines: TaxLine[]): TaxLine[] {
    return GUIDED_TOTAL_CODES.map((code) => lines.find((line) => line.code === code)).filter((line): line is TaxLine => Boolean(line));
}

/** Montants à inscrire : une ligne dédoublée reçoit le même montant au canton et à la Confédération. */
export function buildGuidedItems(lines: TaxLine[], values: Record<string, string>, person: TaxPerson): TaxAmountItem[] {
    return lines.flatMap((line): TaxAmountItem[] => {
        const amount = parseGuidedAmount(values[line.code]);
        if (amount == null) return [];
        if (!line.splitsCompetence) return [{ code: line.code, person, competence: null, amount }];
        return (['cantonal', 'federal'] as const).map((competence) => ({ code: line.code, person, competence, amount }));
    });
}

const KEY = 'spendup.tax.guided-dismissed';

/** La personne a écarté la saisie guidée pour cette déclaration (préférence de l'appareil). */
export function isGuidedDismissed(publicId: string): boolean {
    try {
        return (JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]).includes(publicId);
    } catch {
        return false;
    }
}

export function dismissGuided(publicId: string): void {
    try {
        const list = JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[];
        if (!list.includes(publicId)) localStorage.setItem(KEY, JSON.stringify([...list, publicId].slice(-200)));
    } catch {
        /* stockage indisponible : la saisie guidée reviendra au prochain chargement */
    }
}
