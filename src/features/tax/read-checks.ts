import type { TaxReturn, TaxSuggestion } from '@/features/tax/types';

/** Formulaire reconnu par le lecteur : son canton et son année fiscale. */
export interface ReadScope {
    canton: string;
    year: number;
}

/** Un montant au moins dix fois plus grand ou plus petit que l'an dernier est probablement mal lu (virgule, chiffre). */
export const ANOMALY_FACTOR = 10;

/** `true` si le formulaire lu n'est pas celui du canton et de l'année de la déclaration. Sans information : `false`. */
export function scopeMismatch(scope: ReadScope | undefined, canton: string, year: number): boolean {
    if (!scope) return false;
    return scope.canton !== canton || scope.year !== year;
}

/** Montant déjà inscrit l'an dernier sur la même ligne, pour la même personne et le même ressort. */
export function previousAmountFor(previous: TaxReturn, item: Pick<TaxSuggestion, 'code' | 'person' | 'competence'>): number | null {
    const line = previous.sections.flatMap((section) => section.lines).find((candidate) => candidate.code === item.code);
    const value = line?.values.find((candidate) => candidate.person === item.person && candidate.competence === item.competence);
    return value ? value.amount : null;
}

export function isAnomalous(current: number, previous: number): boolean {
    if (current <= 0 || previous <= 0) return false;
    const ratio = current / previous;
    return ratio >= ANOMALY_FACTOR || ratio <= 1 / ANOMALY_FACTOR;
}

/**
 * Compare les montants lus avec ceux de la déclaration de l'an dernier. Un écart anormal repasse la ligne en
 * « à vérifier » et garde le montant de l'an dernier pour l'afficher. Les autres lignes ne changent pas.
 */
export function compareWithPrevious(items: TaxSuggestion[], previous: TaxReturn): TaxSuggestion[] {
    return items.map((item) => {
        const before = previousAmountFor(previous, item);
        if (before == null || !isAnomalous(item.amount, before)) return item;
        return { ...item, check: 'toCheck', previousAmount: before };
    });
}

/** Un formulaire d'un autre canton ou d'une autre année : plus rien n'est « vérifié ». */
export function markAllToCheck(items: TaxSuggestion[]): TaxSuggestion[] {
    return items.map((item) => (item.check === 'toCheck' ? item : { ...item, check: 'toCheck' }));
}
