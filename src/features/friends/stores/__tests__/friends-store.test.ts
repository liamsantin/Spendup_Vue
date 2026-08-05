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
const subscribeToFriendshipChanged = vi.fn();

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
        subscribeToFriendNotifications,
        subscribeToFriendshipChanged
    })
}));

import { useFriendsStore } from '../friends-store';

describe('useFriendsStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        subscribeToFriendNotifications.mockReset().mockReturnValue(() => undefined);
        subscribeToFriendshipChanged.mockReset().mockReturnValue(() => undefined);
    });

    it('charge les listes principales au bootstrap', async () => {
        api.list.mockResolvedValue({
            items: [
                {
                    friendshipPublicId: 'f1',
                    user: { publicId: 'U1', username: 'alice', firstName: null, name: null, profilePicture: null },
                    friendsSince: '2026-01-01'
                }
            ],
            page: 1,
            pageSize: 20,
            totalCount: 1
        });
        api.incoming.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 });
        api.outgoing.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 });
        api.blocked.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 });

        const store = useFriendsStore();
        await store.bootstrap();

        expect(store.friendsCount).toBe(1);
        expect(subscribeToFriendNotifications).toHaveBeenCalled();
        expect(subscribeToFriendshipChanged).toHaveBeenCalled();
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

    it('sur friendshipChanged blocked rafraîchit amis / demandes / bloqués', async () => {
        api.list.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 });
        api.incoming.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 });
        api.outgoing.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 });
        api.blocked.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 });

        let listener: ((p: { change: string; friendshipPublicId: string }) => void) | undefined;
        subscribeToFriendshipChanged.mockImplementation((fn: (p: { change: string; friendshipPublicId: string }) => void) => {
            listener = fn;
            return () => undefined;
        });

        const store = useFriendsStore();
        await store.bootstrap();
        api.list.mockClear();
        api.incoming.mockClear();
        api.outgoing.mockClear();
        api.blocked.mockClear();

        listener?.({ change: 'blocked', friendshipPublicId: 'fr-1' });
        await Promise.resolve();
        await Promise.resolve();

        expect(api.list).toHaveBeenCalled();
        expect(api.incoming).toHaveBeenCalled();
        expect(api.outgoing).toHaveBeenCalled();
        expect(api.blocked).toHaveBeenCalled();
    });

    it('sur friendshipChanged refused rafraîchit outgoing', async () => {
        api.outgoing.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 });

        let listener: ((p: { change: string; friendshipPublicId: string }) => void) | undefined;
        subscribeToFriendshipChanged.mockImplementation((fn: (p: { change: string; friendshipPublicId: string }) => void) => {
            listener = fn;
            return () => undefined;
        });

        const store = useFriendsStore();
        store.onAuthenticatedSession();
        api.outgoing.mockClear();
        api.list.mockClear();
        api.incoming.mockClear();

        listener?.({ change: 'refused', friendshipPublicId: 'fr-2' });
        await Promise.resolve();
        await Promise.resolve();

        expect(api.outgoing).toHaveBeenCalled();
        expect(api.list).not.toHaveBeenCalled();
        expect(api.incoming).not.toHaveBeenCalled();
    });

    it('sur friendshipChanged canceled rafraîchit incoming', async () => {
        api.incoming.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 });

        let listener: ((p: { change: string; friendshipPublicId: string }) => void) | undefined;
        subscribeToFriendshipChanged.mockImplementation((fn: (p: { change: string; friendshipPublicId: string }) => void) => {
            listener = fn;
            return () => undefined;
        });

        const store = useFriendsStore();
        store.onAuthenticatedSession();
        api.incoming.mockClear();
        api.list.mockClear();
        api.outgoing.mockClear();

        listener?.({ change: 'canceled', friendshipPublicId: 'fr-3' });
        await vi.waitFor(() => expect(api.incoming).toHaveBeenCalled());

        expect(api.list).not.toHaveBeenCalled();
        expect(api.outgoing).not.toHaveBeenCalled();
    });

    it('sur friendshipChanged removed rafraîchit la liste amis', async () => {
        api.list.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 });

        let listener: ((p: { change: string; friendshipPublicId: string }) => void) | undefined;
        subscribeToFriendshipChanged.mockImplementation((fn: (p: { change: string; friendshipPublicId: string }) => void) => {
            listener = fn;
            return () => undefined;
        });

        const store = useFriendsStore();
        store.onAuthenticatedSession();
        api.list.mockClear();
        api.incoming.mockClear();
        api.outgoing.mockClear();

        listener?.({ change: 'removed', friendshipPublicId: 'fr-4' });
        await vi.waitFor(() => expect(api.list).toHaveBeenCalled());

        expect(api.incoming).not.toHaveBeenCalled();
        expect(api.outgoing).not.toHaveBeenCalled();
    });

    it('sur friendRequest rafraîchit incoming', async () => {
        api.incoming.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 });

        let notifListener: ((n: { type: string }) => void) | undefined;
        subscribeToFriendNotifications.mockImplementation((fn: (n: { type: string }) => void) => {
            notifListener = fn;
            return () => undefined;
        });

        const store = useFriendsStore();
        store.onAuthenticatedSession();
        api.incoming.mockClear();
        api.list.mockClear();

        notifListener?.({ type: 'friendRequest' });
        await vi.waitFor(() => expect(api.incoming).toHaveBeenCalled());
        expect(api.list).not.toHaveBeenCalled();
    });

    it('sur friendAccepted rafraîchit amis / demandes', async () => {
        api.list.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 });
        api.incoming.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 });
        api.outgoing.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 });

        let notifListener: ((n: { type: string }) => void) | undefined;
        subscribeToFriendNotifications.mockImplementation((fn: (n: { type: string }) => void) => {
            notifListener = fn;
            return () => undefined;
        });

        const store = useFriendsStore();
        store.onAuthenticatedSession();
        api.list.mockClear();
        api.incoming.mockClear();
        api.outgoing.mockClear();

        notifListener?.({ type: 'friendAccepted' });
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
            expect(api.incoming).toHaveBeenCalled();
            expect(api.outgoing).toHaveBeenCalled();
        });
    });

    it('sérialise les friendshipChanged en rafale', async () => {
        let resolveOutgoing: (() => void) | undefined;
        api.outgoing.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveOutgoing = () => resolve({ items: [], page: 1, pageSize: 20, totalCount: 0 });
                })
        );
        api.incoming.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 });

        let listener: ((p: { change: string; friendshipPublicId: string }) => void) | undefined;
        subscribeToFriendshipChanged.mockImplementation((fn: (p: { change: string; friendshipPublicId: string }) => void) => {
            listener = fn;
            return () => undefined;
        });

        const store = useFriendsStore();
        store.onAuthenticatedSession();
        api.outgoing.mockClear();
        api.incoming.mockClear();

        listener?.({ change: 'refused', friendshipPublicId: 'a' });
        listener?.({ change: 'canceled', friendshipPublicId: 'b' });

        await Promise.resolve();
        expect(api.outgoing).toHaveBeenCalledTimes(1);
        expect(api.incoming).not.toHaveBeenCalled();

        resolveOutgoing?.();
        await vi.waitFor(() => expect(api.incoming).toHaveBeenCalledTimes(1));
        expect(api.outgoing).toHaveBeenCalledTimes(1);
    });

    it('onAuthenticatedSession branche le realtime sans charger les listes', () => {
        const store = useFriendsStore();
        store.onAuthenticatedSession();
        expect(subscribeToFriendNotifications).toHaveBeenCalled();
        expect(subscribeToFriendshipChanged).toHaveBeenCalled();
        expect(api.list).not.toHaveBeenCalled();
    });

    it('loadMoreFriends append les pages suivantes', async () => {
        api.list
            .mockResolvedValueOnce({
                items: [
                    {
                        friendshipPublicId: 'f1',
                        user: { publicId: 'U1', username: 'alice', firstName: null, name: null, profilePicture: null },
                        friendsSince: '2026-01-01'
                    }
                ],
                page: 1,
                pageSize: 1,
                totalCount: 2
            })
            .mockResolvedValueOnce({
                items: [
                    {
                        friendshipPublicId: 'f2',
                        user: { publicId: 'U2', username: 'bob', firstName: null, name: null, profilePicture: null },
                        friendsSince: '2026-01-02'
                    }
                ],
                page: 2,
                pageSize: 1,
                totalCount: 2
            });

        const store = useFriendsStore();
        await store.loadFriends();
        expect(store.friends).toHaveLength(1);
        expect(store.hasMoreFriends).toBe(true);

        await store.loadMoreFriends();
        expect(store.friends).toHaveLength(2);
        expect(store.hasMoreFriends).toBe(false);
        expect(api.list).toHaveBeenLastCalledWith(2, 20);
    });
});
