import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';

const api = vi.hoisted(() => ({
    list: vi.fn(),
    incoming: vi.fn(),
    outgoing: vi.fn(),
    blocked: vi.fn(),
    search: vi.fn(),
    sendRequest: vi.fn(),
    accept: vi.fn(),
    refuse: vi.fn(),
    cancel: vi.fn(),
    remove: vi.fn(),
    block: vi.fn(),
    unblock: vi.fn()
}));

const subscribeToFriendNotifications = vi.fn();

vi.mock('../../api', () => ({
    friendsApi: {
        list: (...args: unknown[]) => api.list(...args),
        incoming: (...args: unknown[]) => api.incoming(...args),
        outgoing: (...args: unknown[]) => api.outgoing(...args),
        blocked: (...args: unknown[]) => api.blocked(...args),
        search: (...args: unknown[]) => api.search(...args),
        sendRequest: (...args: unknown[]) => api.sendRequest(...args),
        accept: (...args: unknown[]) => api.accept(...args),
        refuse: (...args: unknown[]) => api.refuse(...args),
        cancel: (...args: unknown[]) => api.cancel(...args),
        remove: (...args: unknown[]) => api.remove(...args),
        block: (...args: unknown[]) => api.block(...args),
        unblock: (...args: unknown[]) => api.unblock(...args)
    }
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({
        subscribeToFriendNotifications
    })
}));

import { useFriendsStore } from '../friends-store';

describe('useFriendsStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        subscribeToFriendNotifications.mockReset().mockReturnValue(() => undefined);
    });

    it('charge les listes principales au bootstrap', async () => {
        api.list.mockResolvedValue({
            items: [
                {
                    friendshipPublicId: 'f1',
                    user: { publicId: 'U1', username: 'alice', firstName: null, name: null, profilePicture: null },
                    friendsSince: '2026-01-01'
                }
            ]
        });
        api.incoming.mockResolvedValue({ items: [] });
        api.outgoing.mockResolvedValue({ items: [] });
        api.blocked.mockResolvedValue({ items: [] });

        const store = useFriendsStore();
        await store.bootstrap();

        expect(store.friendsCount).toBe(1);
        expect(subscribeToFriendNotifications).toHaveBeenCalled();
        expect(store.initialized).toBe(true);
    });

    it('vide la recherche si moins de 2 caractères', async () => {
        const store = useFriendsStore();
        store.searchResults = [
            { publicId: 'U1', username: 'alice', firstName: null, name: null, profilePicture: null, friendshipStatus: null }
        ];

        await store.searchUsers('a');

        expect(store.searchResults).toEqual([]);
        expect(api.search).not.toHaveBeenCalled();
    });

    it('rafraîchit après envoi de demande', async () => {
        api.sendRequest.mockResolvedValue({});
        api.list.mockResolvedValue({ items: [] });
        api.incoming.mockResolvedValue({ items: [] });
        api.outgoing.mockResolvedValue({ items: [] });
        api.search.mockResolvedValue({ items: [] });

        const store = useFriendsStore();
        store.searchQuery = 'alice';

        await store.sendRequest('U1', 'hello');

        expect(api.sendRequest).toHaveBeenCalledWith({ recipientPublicId: 'U1', message: 'hello' });
        expect(api.outgoing).toHaveBeenCalled();
    });

    it('sur friendBlocked rafraîchit amis / demandes / bloqués', async () => {
        api.list.mockResolvedValue({ items: [] });
        api.incoming.mockResolvedValue({ items: [] });
        api.outgoing.mockResolvedValue({ items: [] });
        api.blocked.mockResolvedValue({ items: [] });

        let listener: ((n: { type: string }) => void) | undefined;
        subscribeToFriendNotifications.mockImplementation((fn: (n: { type: string }) => void) => {
            listener = fn;
            return () => undefined;
        });

        const store = useFriendsStore();
        await store.bootstrap();
        api.list.mockClear();
        api.incoming.mockClear();
        api.outgoing.mockClear();
        api.blocked.mockClear();

        listener?.({ type: 'friendBlocked' });
        await Promise.resolve();
        await Promise.resolve();

        expect(api.list).toHaveBeenCalled();
        expect(api.incoming).toHaveBeenCalled();
        expect(api.outgoing).toHaveBeenCalled();
        expect(api.blocked).toHaveBeenCalled();
    });
});
