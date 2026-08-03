import { describe, expect, it } from 'vitest';
import { isValidUsername, normalizeUsername } from '@/features/auth/types';

describe('username helpers', () => {
    it('normalise en minuscules et trim', () => {
        expect(normalizeUsername('  Alice.Doe  ')).toBe('alice.doe');
    });

    it('accepte un username valide', () => {
        expect(isValidUsername('user_01')).toBe(true);
        expect(isValidUsername('ab.c-d')).toBe(true);
    });

    it('refuse un username trop court ou invalide', () => {
        expect(isValidUsername('ab')).toBe(false);
        expect(isValidUsername('Bad Name')).toBe(false);
        expect(isValidUsername('user@mail')).toBe(false);
    });
});
