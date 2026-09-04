import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_AVATAR_SRC, catalogAvatarSrc } from '@/features/auth/profilePicture';

vi.mock('@/utils/helpers/axios-helpers', () => ({
    getApiBaseUrl: () => 'https://api.example.test'
}));

import { extractPublicIdFromUserAvatarPath, needsUserAvatarFetch, resolveFriendAvatarSrc } from '@/features/friends/profilePicture';

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
        expect(resolveFriendAvatarSrc('/avatar/joane')).toBe(catalogAvatarSrc('/avatar/joane'));
    });

    it('préfixe les chemins relatifs API', () => {
        expect(resolveFriendAvatarSrc('/uploads/profile/alice.jpg')).toBe('https://api.example.test/uploads/profile/alice.jpg');
    });

    it('conserve une URL absolue', () => {
        expect(resolveFriendAvatarSrc('https://cdn.example/photo.jpg')).toBe('https://cdn.example/photo.jpg');
    });

    it('signale un fetch auth pour un hash upload', () => {
        const hash = 'a'.repeat(64);
        expect(needsUserAvatarFetch(hash)).toBe(true);
        expect(resolveFriendAvatarSrc(hash)).toBeNull();
    });

    it('signale un fetch auth pour /api/users/{id}/avatar', () => {
        expect(extractPublicIdFromUserAvatarPath('/api/users/USR12345/avatar')).toBe('USR12345');
        expect(resolveFriendAvatarSrc('/api/users/USR12345/avatar')).toBeNull();
        expect(needsUserAvatarFetch('/api/users/USR12345/avatar')).toBe(false);
    });
});
