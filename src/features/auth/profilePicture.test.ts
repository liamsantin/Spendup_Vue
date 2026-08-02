import { describe, expect, it } from 'vitest';
import { isCatalogProfilePicture, isUploadedProfilePicture } from '@/features/auth/profilePicture';

describe('profilePicture helpers', () => {
    it('détecte un avatar catalogue', () => {
        expect(isCatalogProfilePicture('/avatar/user-1')).toBe(true);
        expect(isCatalogProfilePicture('/avatar/guy2')).toBe(true);
    });

    it('détecte un hash uploadé (64 hex)', () => {
        const hash = 'a'.repeat(64);
        expect(isUploadedProfilePicture(hash)).toBe(true);
        expect(isUploadedProfilePicture(hash.slice(0, 63))).toBe(false);
        expect(isUploadedProfilePicture('/avatar/user-1')).toBe(false);
    });

    it('rejette null / vide', () => {
        expect(isCatalogProfilePicture(null)).toBe(false);
        expect(isUploadedProfilePicture(undefined)).toBe(false);
        expect(isCatalogProfilePicture('')).toBe(false);
    });
});
