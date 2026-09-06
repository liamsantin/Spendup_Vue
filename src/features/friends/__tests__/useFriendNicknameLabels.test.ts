import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';

const listAllFriends = vi.fn();

vi.mock('@/features/friends/list-all', () => ({
    listAllFriends: (...args: unknown[]) => listAllFriends(...args)
}));

import {
    invalidateFriendNicknameLabelsCache,
    useFriendNicknameLabels
} from '@/features/friends/composables/useFriendNicknameLabels';
import { useFriendsStore } from '@/features/friends/stores/friends-store';

describe('useFriendNicknameLabels', () => {
    beforeEach(() => {
        createTestPinia();
        invalidateFriendNicknameLabelsCache();
        listAllFriends.mockReset();
        listAllFriends.mockResolvedValue([
            {
                friendshipPublicId: 'f1',
                user: { publicId: 'u-bob', username: 'bob', firstName: 'Bob', name: 'Martin', profilePicture: null },
                nickname: 'Mon pote',
                friendsSince: '2026-01-01'
            },
            {
                friendshipPublicId: 'f2',
                user: { publicId: 'u-eve', username: 'eve', firstName: 'Eve', name: 'Dupont', profilePicture: null },
                nickname: null,
                friendsSince: '2026-01-01'
            }
        ]);
    });

    it('labelFor priorise le surnom chargé, sinon le fallback API', async () => {
        const { ensureLoaded, labelFor } = useFriendNicknameLabels();
        await ensureLoaded();
        expect(labelFor('u-bob', 'Bob')).toBe('Mon pote');
        expect(labelFor('u-eve', 'Eve')).toBe('Eve');
        expect(labelFor('u-unknown', 'X')).toBe('X');
        expect(listAllFriends).toHaveBeenCalledTimes(1);
    });

    it('réutilise le cache TTL et se met à jour via le store amis', async () => {
        const { ensureLoaded, labelFor } = useFriendNicknameLabels();
        await ensureLoaded();
        await ensureLoaded();
        expect(listAllFriends).toHaveBeenCalledTimes(1);

        const friendsStore = useFriendsStore();
        friendsStore.friends = [
            {
                friendshipPublicId: 'f1',
                user: { publicId: 'u-bob', username: 'bob', firstName: 'Bob', name: 'Martin', profilePicture: null },
                nickname: 'Nouveau surnom',
                friendsSince: '2026-01-01'
            }
        ];
        expect(labelFor('u-bob', 'Bob')).toBe('Nouveau surnom');
    });
});
