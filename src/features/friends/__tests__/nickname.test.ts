import { describe, expect, it } from 'vitest';
import { FRIEND_NICKNAME_MAX_LENGTH, normalizeFriendNickname, validateFriendNickname } from '@/features/friends/nickname';

describe('normalizeFriendNickname', () => {
    it('trim et convertit vide en null', () => {
        expect(normalizeFriendNickname('  Mon pote  ')).toBe('Mon pote');
        expect(normalizeFriendNickname('')).toBeNull();
        expect(normalizeFriendNickname('   ')).toBeNull();
        expect(normalizeFriendNickname(null)).toBeNull();
    });
});

describe('validateFriendNickname', () => {
    it('accepte null', () => {
        expect(() => validateFriendNickname(null)).not.toThrow();
    });

    it('rejette plus de 64 caractères', () => {
        expect(() => validateFriendNickname('a'.repeat(FRIEND_NICKNAME_MAX_LENGTH + 1))).toThrow(
            'Le surnom ne peut pas dépasser 64 caractères.'
        );
    });

    it('rejette les caractères de contrôle', () => {
        expect(() => validateFriendNickname('bad\u0007')).toThrow('Le surnom contient des caractères non autorisés.');
    });
});
