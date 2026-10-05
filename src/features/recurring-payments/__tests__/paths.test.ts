import { describe, expect, it } from 'vitest';
import { RECURRENCES_PATHS, recurrencesPathForTab, recurrencesTabFromPath } from '@/features/recurring-payments/paths';

describe('recurrences paths', () => {
    it('mappe les onglets vers les sous-routes', () => {
        expect(recurrencesPathForTab('all')).toBe(RECURRENCES_PATHS.overview);
        expect(recurrencesPathForTab('expenses')).toBe(RECURRENCES_PATHS.charges);
        expect(recurrencesPathForTab('incomes')).toBe(RECURRENCES_PATHS.revenus);
        expect(recurrencesPathForTab('upcoming')).toBe(RECURRENCES_PATHS.echeances);
    });

    it('lit l’onglet depuis le path', () => {
        expect(recurrencesTabFromPath(RECURRENCES_PATHS.overview)).toBe('all');
        expect(recurrencesTabFromPath(RECURRENCES_PATHS.charges)).toBe('expenses');
        expect(recurrencesTabFromPath(RECURRENCES_PATHS.revenus)).toBe('incomes');
        expect(recurrencesTabFromPath(RECURRENCES_PATHS.echeances)).toBe('upcoming');
    });
});
