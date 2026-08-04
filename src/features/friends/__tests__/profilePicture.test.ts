import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_AVATAR_SRC, catalogAvatarSrc } from '@/features/auth/profilePicture';

vi.mock('@/utils/helpers/axios-helpers', () => ({
    getApiBaseUrl: () => 'https://api.example.test'
}));

import { resolveFriendAvatarSrc } from '../profilePicture';

describe('resolveFriendAvatarSrc', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retourne l’avatar par défaut si null/vide', () => {
        expect(resolveFriendAvatarSrc(null)).toBe(DEFAULT_AVATAR_SRC);
        expect(resolveFriendAvatarSrc('')).toBe(DEFAULT_AVATAR_SRC);
    });

    it('mappe un avatar catalogue', () => {
        expect(resolveFriendAvatarSrc('/avatar/user-2')).toBe(catalogAvatarSrc('/avatar/user-2'));
    });

    it('préfixe les chemins relatifs API', () => {
        expect(resolveFriendAvatarSrc('/uploads/profile/alice.jpg')).toBe('https://api.example.test/uploads/profile/alice.jpg');
    });

    it('conserve une URL absolue', () => {
        expect(resolveFriendAvatarSrc('https://cdn.example/photo.jpg')).toBe('https://cdn.example/photo.jpg');
    });

    it('retombe sur le défaut pour un hash upload', () => {
        const hash = 'a'.repeat(64);
        expect(resolveFriendAvatarSrc(hash)).toBe(DEFAULT_AVATAR_SRC);
    });
});
