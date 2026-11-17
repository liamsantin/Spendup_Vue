import { describe, expect, it } from 'vitest';
import { compareWithPrevious, isAnomalous, markAllToCheck, scopeMismatch } from '@/features/tax/read-checks';
import type { TaxReturn, TaxSuggestion } from '@/features/tax/types';

const previous = {
    sections: [
        {
            code: 'revenus',
            label: 'Revenus',
            lines: [
                {
                    code: 'income.employed',
                    label: 'Salaire',
                    splitsCompetence: false,
                    values: [{ person: '1', competence: 'both', amount: 80000 }]
                },
                {
                    code: 'deduction.pillar3a',
                    label: '3a',
                    splitsCompetence: true,
                    values: [{ person: '1', competence: 'cantonal', amount: 7000 }]
                }
            ]
        }
    ]
} as unknown as TaxReturn;

const item = (code: string, amount: number, competence: TaxSuggestion['competence'] = 'both'): TaxSuggestion => ({
    code,
    label: code,
    person: '1',
    competence,
    amount,
    currency: 'CHF',
    originLabel: 'test',
    check: 'verified'
});

describe('contrôle du formulaire lu', () => {
    it('signale un autre canton ou une autre année, et ignore l’absence d’information', () => {
        expect(scopeMismatch({ canton: 'JU', year: 2025 }, 'JU', 2025)).toBe(false);
        expect(scopeMismatch({ canton: 'JU', year: 2025 }, 'VD', 2025)).toBe(true);
        expect(scopeMismatch({ canton: 'JU', year: 2025 }, 'JU', 2026)).toBe(true);
        expect(scopeMismatch(undefined, 'JU', 2026)).toBe(false);
    });

    it('remet toutes les lignes à vérifier', () => {
        expect(markAllToCheck([item('income.employed', 1)]).map((entry) => entry.check)).toEqual(['toCheck']);
    });
});

describe('comparaison avec l’an dernier', () => {
    it('reconnaît un écart d’un facteur dix, dans les deux sens', () => {
        expect(isAnomalous(800000, 80000)).toBe(true);
        expect(isAnomalous(8000, 80000)).toBe(true);
        expect(isAnomalous(85000, 80000)).toBe(false);
        expect(isAnomalous(0, 80000)).toBe(false);
        expect(isAnomalous(5000, 0)).toBe(false);
    });

    it('passe en « à vérifier » une ligne mal lue et garde le montant de l’an dernier', () => {
        const [result] = compareWithPrevious([item('income.employed', 800000)], previous);
        expect(result.check).toBe('toCheck');
        expect(result.previousAmount).toBe(80000);
    });

    it('laisse intacte une ligne cohérente ou sans équivalent l’an dernier', () => {
        const items = [item('income.employed', 85000), item('income.other', 123456)];
        expect(compareWithPrevious(items, previous)).toEqual(items);
    });

    it('compare chaque ressort d’une ligne dédoublée séparément', () => {
        const [cantonal, federal] = compareWithPrevious(
            [item('deduction.pillar3a', 70000, 'cantonal'), item('deduction.pillar3a', 70000, 'federal')],
            previous
        );
        expect(cantonal.check).toBe('toCheck');
        expect(federal.check).toBe('verified');
    });
});
