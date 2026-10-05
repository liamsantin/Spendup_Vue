import { describe, expect, it } from 'vitest';
import { foldSearchText, matchesSearchTokens } from '@/utils/helpers/text-search';

describe('text-search', () => {
    it('ignore casse et accents', () => {
        expect(foldSearchText('Épargne Crédit')).toBe('epargne credit');
        expect(matchesSearchTokens('Compte épargne', 'EPARGNE')).toBe(true);
        expect(matchesSearchTokens('Compte epargne', 'épargne')).toBe(true);
    });

    it('exige chaque mot', () => {
        expect(matchesSearchTokens('Migros 45.50', 'migros 45')).toBe(true);
        expect(matchesSearchTokens('Migros 45.50', 'migros coop')).toBe(false);
        expect(matchesSearchTokens('Migros', '   ')).toBe(true);
    });
});
