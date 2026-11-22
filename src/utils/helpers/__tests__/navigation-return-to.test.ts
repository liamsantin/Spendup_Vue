import { describe, expect, it } from 'vitest';
import { readReturnTo, withReturnTo } from '@/utils/helpers/navigation-helpers';

describe('retour vers la page d’origine', () => {
    it('retient la page d’origine dans l’état de navigation, pas dans l’URL', () => {
        const to = withReturnTo('/app/finances/recurrences/revenus/RIN1', '/app/planning/impots/TAX1');
        expect(to).toEqual({ path: '/app/finances/recurrences/revenus/RIN1', state: { returnTo: '/app/planning/impots/TAX1' } });
        expect(readReturnTo((to as { state: unknown }).state)).toBe('/app/planning/impots/TAX1');
    });

    it('ne renvoie rien sans origine', () => {
        expect(readReturnTo(null)).toBeNull();
        expect(readReturnTo({})).toBeNull();
        expect(readReturnTo({ returnTo: 42 })).toBeNull();
    });

    it('refuse tout ce qui n’est pas un chemin interne', () => {
        expect(readReturnTo({ returnTo: 'https://exemple.ch/x' })).toBeNull();
        expect(readReturnTo({ returnTo: '//exemple.ch/x' })).toBeNull();
        expect(readReturnTo({ returnTo: 'javascript:alert(1)' })).toBeNull();
    });
});
