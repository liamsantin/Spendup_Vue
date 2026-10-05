import { describe, expect, it, vi } from 'vitest';
import { listAllFriends } from '@/features/friends/list-all';
import type { FriendItem } from '@/features/friends/types';

function friend(id: string): FriendItem {
    return {
        friendshipPublicId: `f-${id}`,
        user: {
            publicId: id,
            username: id,
            firstName: null,
            name: null,
            profilePicture: null
        },
        nickname: null,
        friendsSince: '2026-01-01T00:00:00Z'
    };
}

describe('listAllFriends', () => {
    it('agrège plusieurs pages jusqu’à totalCount', async () => {
        const list = vi
            .fn()
            .mockResolvedValueOnce({ items: [friend('a'), friend('b')], page: 1, pageSize: 2, totalCount: 3 })
            .mockResolvedValueOnce({ items: [friend('c')], page: 2, pageSize: 2, totalCount: 3 });

        const result = await listAllFriends(list, 2, 10);

        expect(list).toHaveBeenCalledTimes(2);
        expect(list).toHaveBeenNthCalledWith(1, 1, 2);
        expect(list).toHaveBeenNthCalledWith(2, 2, 2);
        expect(result.map((f) => f.user.publicId)).toEqual(['a', 'b', 'c']);
    });

    it('s’arrête si une page revient vide', async () => {
        const list = vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 5 });
        const result = await listAllFriends(list);
        expect(result).toEqual([]);
        expect(list).toHaveBeenCalledTimes(1);
    });

    it('respecte maxPages', async () => {
        const list = vi.fn().mockImplementation(async (page: number) => ({
            items: [friend(`p${page}`)],
            page,
            pageSize: 1,
            totalCount: 100
        }));

        const result = await listAllFriends(list, 1, 3);
        expect(list).toHaveBeenCalledTimes(3);
        expect(result).toHaveLength(3);
    });
});
