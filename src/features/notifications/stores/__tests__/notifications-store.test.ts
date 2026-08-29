import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';

const {
    unreadCount,
    list,
    markRead,
    markAllRead,
    deleteAll,
    startHub,
    stopHub,
    setHandlers,
    forceReLogin,
    getDeviceId,
    settingsState,
    showNative,
    ensureNativePermission,
    isTauriMock
} = vi.hoisted(() => ({
    unreadCount: vi.fn(),
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    deleteAll: vi.fn(),
    startHub: vi.fn(),
    stopHub: vi.fn(),
    setHandlers: vi.fn(),
    forceReLogin: vi.fn(),
    getDeviceId: vi.fn(() => 'device-local'),
    showNative: vi.fn(),
    ensureNativePermission: vi.fn().mockResolvedValue(true),
    isTauriMock: vi.fn(() => false),
    settingsState: {
        current: { pushNotifications: true, pushSecurityAlerts: true, pushFriendRequest: true, pushFinancialAlerts: true }
    }
}));

vi.mock('../../api', () => ({
    notificationsApi: {
        unreadCount: () => unreadCount(),
        list: (...args: unknown[]) => list(...args),
        markRead: (id: number) => markRead(id),
        markAllRead: () => markAllRead(),
        deleteAll: () => deleteAll()
    }
}));

vi.mock('../../hub', () => ({
    startNotificationsHub: () => startHub(),
    stopNotificationsHub: () => stopHub(),
    setNotificationsHubHandlers: (h: unknown) => setHandlers(h),
    getNotificationsHubState: () => null
}));

vi.mock('../../native-notify', () => ({
    ensureNativeNotificationPermission: () => ensureNativePermission(),
    showNativeNotification: (...args: unknown[]) => showNative(...args)
}));

vi.mock('@/utils/helpers/platform-helpers', () => ({
    isTauri: () => isTauriMock()
}));

vi.mock('@/features/auth/device', () => ({
    getOrCreateDeviceId: () => getDeviceId()
}));

vi.mock('@/features/auth/stores/auth-store', () => ({
    useAuthStore: () => ({
        forceReLogin: (...args: unknown[]) => forceReLogin(...args)
    })
}));

vi.mock('@/features/user-settings', async () => {
    const actual = await vi.importActual<typeof import('@/features/user-settings')>('@/features/user-settings');
    return {
        ...actual,
        useUserSettingsStore: () => ({
            get current() {
                return { ...actual.USER_SETTINGS_DEFAULTS, ...settingsState.current };
            }
        })
    };
});

import { useNotificationsStore } from '@/features/notifications/stores/notifications-store';

type HubHandlers = {
    onSessionEnded?: (payload: { reason: string; deviceIdentifier: string | null }) => void;
    onFriendshipChanged?: (payload: { change: string; friendshipPublicId: string }) => void;
    onInboxCleared?: (payload: { unreadCount: number }) => void;
    onNotificationReceived?: (payload: {
        notification: {
            id: number;
            type: string;
            title: string;
            subtitle: string | null;
            message: string | null;
            isRead: boolean;
            readAt: string | null;
            link: string | null;
            photoUrl: string | null;
            createdAt: string;
        };
        unreadCount: number;
    }) => void;
};

describe('useNotificationsStore', () => {
    beforeEach(() => {
        createTestPinia();
        settingsState.current = {
            pushNotifications: true,
            pushSecurityAlerts: true,
            pushFriendRequest: true,
            pushFinancialAlerts: true
        };
        unreadCount.mockReset();
        list.mockReset();
        markRead.mockReset();
        markAllRead.mockReset();
        deleteAll.mockReset();
        startHub.mockReset().mockResolvedValue(undefined);
        stopHub.mockReset().mockResolvedValue(undefined);
        setHandlers.mockReset();
        forceReLogin.mockReset().mockResolvedValue(undefined);
        showNative.mockReset();
        ensureNativePermission.mockReset().mockResolvedValue(true);
        isTauriMock.mockReset().mockReturnValue(false);
        getDeviceId.mockReset().mockReturnValue('device-local');
        unreadCount.mockResolvedValue({ unreadCount: 0 });
    });

    it('hydrate le badge via unread-count puis démarre le hub', async () => {
        unreadCount.mockResolvedValue({ unreadCount: 3 });
        const store = useNotificationsStore();

        await store.onAuthenticatedSession();

        expect(store.unreadCount).toBe(3);
        expect(startHub).toHaveBeenCalled();
        expect(setHandlers).toHaveBeenCalled();
    });

    it('n’appelle unread-count qu’une fois par session (navigations suivantes)', async () => {
        unreadCount.mockResolvedValue({ unreadCount: 2 });
        const store = useNotificationsStore();

        await store.onAuthenticatedSession();
        await store.onAuthenticatedSession();
        await store.onAuthenticatedSession();

        expect(unreadCount).toHaveBeenCalledTimes(1);
        expect(startHub).toHaveBeenCalledTimes(3);
    });

    it('charge l’inbox à l’ouverture', async () => {
        list.mockResolvedValue({
            items: [
                {
                    id: 1,
                    type: 'securityAlert',
                    title: 'MDP changé',
                    subtitle: null,
                    message: null,
                    isRead: false,
                    readAt: null,
                    link: '/security',
                    photoUrl: null,
                    createdAt: '2026-01-01T00:00:00Z'
                }
            ],
            unreadCount: 1,
            page: 1,
            pageSize: 20,
            totalCount: 1
        });
        const store = useNotificationsStore();

        await store.openInbox();

        expect(store.items).toHaveLength(1);
        expect(store.unreadCount).toBe(1);
        expect(store.inboxLoaded).toBe(true);
    });

    it('markAllRead met à jour le badge et les items', async () => {
        const store = useNotificationsStore();
        store.items = [
            {
                id: 1,
                type: 'other',
                title: 'A',
                subtitle: null,
                message: null,
                isRead: false,
                readAt: null,
                link: null,
                photoUrl: null,
                createdAt: '2026-01-01T00:00:00Z'
            }
        ];
        store.unreadCount = 1;
        markAllRead.mockResolvedValue({ markedCount: 1, unreadCount: 0 });

        await store.markAllRead();

        expect(store.unreadCount).toBe(0);
        expect(store.items[0]?.isRead).toBe(true);
    });

    it('clearAll vide l’inbox et le badge', async () => {
        const store = useNotificationsStore();
        store.items = [
            {
                id: 1,
                type: 'other',
                title: 'A',
                subtitle: null,
                message: null,
                isRead: false,
                readAt: null,
                link: null,
                photoUrl: null,
                createdAt: '2026-01-01T00:00:00Z'
            }
        ];
        store.unreadCount = 2;
        store.totalCount = 1;
        deleteAll.mockResolvedValue({ deletedCount: 1 });

        await store.clearAll();

        expect(deleteAll).toHaveBeenCalled();
        expect(store.items).toHaveLength(0);
        expect(store.unreadCount).toBe(0);
        expect(store.totalCount).toBe(0);
        expect(store.hasItems).toBe(false);
    });

    it('inboxCleared vide l’état sans appeler l’API', async () => {
        unreadCount.mockResolvedValue({ unreadCount: 0 });
        const store = useNotificationsStore();
        await store.onAuthenticatedSession();
        store.items = [
            {
                id: 9,
                type: 'other',
                title: 'X',
                subtitle: null,
                message: null,
                isRead: false,
                readAt: null,
                link: null,
                photoUrl: null,
                createdAt: '2026-01-01T00:00:00Z'
            }
        ];
        store.unreadCount = 4;
        store.totalCount = 1;

        const handlers = setHandlers.mock.calls.at(-1)?.[0] as HubHandlers;
        handlers.onInboxCleared?.({ unreadCount: 0 });

        expect(deleteAll).not.toHaveBeenCalled();
        expect(store.items).toHaveLength(0);
        expect(store.unreadCount).toBe(0);
        expect(store.totalCount).toBe(0);
    });

    it('notificationReceived incrémente totalCount et hasItems suit unreadCount', async () => {
        unreadCount.mockResolvedValue({ unreadCount: 0 });
        const store = useNotificationsStore();
        await store.onAuthenticatedSession();
        store.totalCount = 0;
        store.items = [];
        store.unreadCount = 2;
        expect(store.hasItems).toBe(true);

        const handlers = setHandlers.mock.calls.at(-1)?.[0] as HubHandlers;
        handlers.onNotificationReceived?.({
            notification: {
                id: 77,
                type: 'friendRequest',
                title: 'Demande',
                subtitle: null,
                message: null,
                isRead: false,
                readAt: null,
                link: '/friends',
                photoUrl: null,
                createdAt: '2026-01-01T00:00:00Z'
            },
            unreadCount: 3
        });

        expect(store.items).toHaveLength(1);
        expect(store.totalCount).toBe(1);
        expect(store.hasMore).toBe(false);

        handlers.onNotificationReceived?.({
            notification: {
                id: 77,
                type: 'friendRequest',
                title: 'Demande',
                subtitle: null,
                message: null,
                isRead: true,
                readAt: '2026-01-01T00:01:00Z',
                link: '/friends',
                photoUrl: null,
                createdAt: '2026-01-01T00:00:00Z'
            },
            unreadCount: 2
        });
        expect(store.totalCount).toBe(1);
    });

    it('reset coupe le hub et vide l’état', async () => {
        const store = useNotificationsStore();
        store.unreadCount = 2;
        store.items = [];
        const unsub = store.subscribeToFriendNotifications(() => undefined);
        store.reset();
        expect(store.unreadCount).toBe(0);
        expect(stopHub).toHaveBeenCalled();
        unsub();
    });

    it('sessionEnded (tous appareils) coupe le hub et force le re-login', async () => {
        unreadCount.mockResolvedValue({ unreadCount: 0 });
        const store = useNotificationsStore();
        await store.onAuthenticatedSession();

        const handlers = setHandlers.mock.calls.at(-1)?.[0] as HubHandlers;
        await handlers.onSessionEnded?.({ reason: 'session_ended', deviceIdentifier: null });

        expect(stopHub).toHaveBeenCalled();
        expect(forceReLogin).toHaveBeenCalled();
    });

    it('sessionEnded pour cet appareil force le re-login', async () => {
        unreadCount.mockResolvedValue({ unreadCount: 0 });
        const store = useNotificationsStore();
        await store.onAuthenticatedSession();

        const handlers = setHandlers.mock.calls.at(-1)?.[0] as HubHandlers;
        await handlers.onSessionEnded?.({ reason: 'session_ended', deviceIdentifier: 'device-local' });

        expect(forceReLogin).toHaveBeenCalled();
    });

    it('sessionEnded pour un autre appareil est ignoré', async () => {
        unreadCount.mockResolvedValue({ unreadCount: 0 });
        const store = useNotificationsStore();
        await store.onAuthenticatedSession();
        stopHub.mockClear();

        const handlers = setHandlers.mock.calls.at(-1)?.[0] as HubHandlers;
        await handlers.onSessionEnded?.({ reason: 'session_ended', deviceIdentifier: 'other-device' });

        expect(stopHub).not.toHaveBeenCalled();
        expect(forceReLogin).not.toHaveBeenCalled();
    });

    it('pushNotifications off : inbox mise à jour, pas de chip', async () => {
        settingsState.current.pushNotifications = false;
        unreadCount.mockResolvedValue({ unreadCount: 0 });
        const store = useNotificationsStore();
        await store.onAuthenticatedSession();

        const handlers = setHandlers.mock.calls.at(-1)?.[0] as HubHandlers;
        handlers.onNotificationReceived?.({
            notification: {
                id: 42,
                type: 'friendAccepted',
                title: 'Ami accepté',
                subtitle: null,
                message: null,
                isRead: false,
                readAt: null,
                link: '/friends',
                photoUrl: null,
                createdAt: '2026-01-01T00:00:00Z'
            },
            unreadCount: 1
        });

        expect(store.unreadCount).toBe(1);
        expect(store.items).toHaveLength(1);
        expect(store.items[0]?.id).toBe(42);
        expect(store.liveFriendChips).toHaveLength(0);
    });

    it('pushNotifications on : chip ami affiché', async () => {
        unreadCount.mockResolvedValue({ unreadCount: 0 });
        const store = useNotificationsStore();
        await store.onAuthenticatedSession();

        const handlers = setHandlers.mock.calls.at(-1)?.[0] as HubHandlers;
        handlers.onNotificationReceived?.({
            notification: {
                id: 43,
                type: 'friendRequest',
                title: 'Demande',
                subtitle: null,
                message: null,
                isRead: false,
                readAt: null,
                link: '/friends',
                photoUrl: null,
                createdAt: '2026-01-01T00:00:00Z'
            },
            unreadCount: 1
        });

        expect(store.liveFriendChips).toHaveLength(1);
        expect(store.liveFriendChips[0]?.notification.id).toBe(43);
    });

    it('pushNotifications on : chip invitation de compte affiché', async () => {
        unreadCount.mockResolvedValue({ unreadCount: 0 });
        const store = useNotificationsStore();
        await store.onAuthenticatedSession();

        const handlers = setHandlers.mock.calls.at(-1)?.[0] as HubHandlers;
        handlers.onNotificationReceived?.({
            notification: {
                id: 44,
                type: 'accountShareInvite',
                title: 'Invitation',
                subtitle: null,
                message: null,
                isRead: false,
                readAt: null,
                link: '/accounts/shares',
                photoUrl: null,
                createdAt: '2026-01-01T00:00:00Z'
            },
            unreadCount: 1
        });

        expect(store.liveFriendChips).toHaveLength(1);
        expect(store.liveFriendChips[0]?.notification.id).toBe(44);
        expect(store.items).toHaveLength(1);
    });

    it('pushFinancialAlerts off : inbox mise à jour, pas de chip invitation', async () => {
        settingsState.current.pushFinancialAlerts = false;
        unreadCount.mockResolvedValue({ unreadCount: 0 });
        const store = useNotificationsStore();
        await store.onAuthenticatedSession();

        const handlers = setHandlers.mock.calls.at(-1)?.[0] as HubHandlers;
        handlers.onNotificationReceived?.({
            notification: {
                id: 45,
                type: 'accountShareInvite',
                title: 'Invitation',
                subtitle: null,
                message: null,
                isRead: false,
                readAt: null,
                link: '/accounts/shares',
                photoUrl: null,
                createdAt: '2026-01-01T00:00:00Z'
            },
            unreadCount: 1
        });

        expect(store.unreadCount).toBe(1);
        expect(store.items).toHaveLength(1);
        expect(store.liveFriendChips).toHaveLength(0);
    });

    it('pushNotifications off : pas de chip invitation de compte', async () => {
        settingsState.current.pushNotifications = false;
        unreadCount.mockResolvedValue({ unreadCount: 0 });
        const store = useNotificationsStore();
        await store.onAuthenticatedSession();

        const handlers = setHandlers.mock.calls.at(-1)?.[0] as HubHandlers;
        handlers.onNotificationReceived?.({
            notification: {
                id: 46,
                type: 'accountShareInvite',
                title: 'Invitation',
                subtitle: null,
                message: null,
                isRead: false,
                readAt: null,
                link: '/accounts/shares',
                photoUrl: null,
                createdAt: '2026-01-01T00:00:00Z'
            },
            unreadCount: 1
        });

        expect(store.items).toHaveLength(1);
        expect(store.liveFriendChips).toHaveLength(0);
    });

    it('accountShareAccepted : pas de chip live', async () => {
        unreadCount.mockResolvedValue({ unreadCount: 0 });
        const store = useNotificationsStore();
        await store.onAuthenticatedSession();

        const handlers = setHandlers.mock.calls.at(-1)?.[0] as HubHandlers;
        handlers.onNotificationReceived?.({
            notification: {
                id: 47,
                type: 'accountShareAccepted',
                title: 'Accepté',
                subtitle: null,
                message: null,
                isRead: false,
                readAt: null,
                link: '/accounts',
                photoUrl: null,
                createdAt: '2026-01-01T00:00:00Z'
            },
            unreadCount: 1
        });

        expect(store.items).toHaveLength(1);
        expect(store.liveFriendChips).toHaveLength(0);
    });

    it('friendshipChanged notifie les listeners sans toucher au badge', async () => {
        unreadCount.mockResolvedValue({ unreadCount: 0 });
        const store = useNotificationsStore();
        await store.onAuthenticatedSession();
        store.unreadCount = 3;

        const seen: { change: string; friendshipPublicId: string }[] = [];
        store.subscribeToFriendshipChanged((payload) => {
            seen.push(payload);
        });

        const handlers = setHandlers.mock.calls.at(-1)?.[0] as HubHandlers;
        handlers.onFriendshipChanged?.({ change: 'removed', friendshipPublicId: 'fr-9' });

        expect(seen).toEqual([{ change: 'removed', friendshipPublicId: 'fr-9' }]);
        expect(store.unreadCount).toBe(3);
        expect(store.liveFriendChips).toHaveLength(0);
        expect(store.items).toHaveLength(0);
    });

    it('syncRealtimePreference coupe les chips si pushNotifications off', async () => {
        const store = useNotificationsStore();
        store.liveFriendChips = [
            {
                key: 'x',
                notification: {
                    id: 1,
                    type: 'friendAccepted',
                    title: 'A',
                    subtitle: null,
                    message: null,
                    isRead: false,
                    readAt: null,
                    link: null,
                    photoUrl: null,
                    createdAt: '2026-01-01T00:00:00Z'
                }
            }
        ];
        settingsState.current.pushNotifications = false;

        await store.syncRealtimePreference();

        expect(store.liveFriendChips).toHaveLength(0);
    });

    it('Tauri : notificationReceived envoie une notif OS si prefs on', async () => {
        isTauriMock.mockReturnValue(true);
        unreadCount.mockResolvedValue({ unreadCount: 0 });
        const store = useNotificationsStore();
        await store.onAuthenticatedSession();
        expect(ensureNativePermission).toHaveBeenCalled();

        const handlers = setHandlers.mock.calls.at(-1)?.[0] as HubHandlers;
        handlers.onNotificationReceived?.({
            notification: {
                id: 90,
                type: 'friendRequest',
                title: 'Demande',
                subtitle: 'Bob',
                message: null,
                isRead: false,
                readAt: null,
                link: '/friends',
                photoUrl: null,
                createdAt: '2026-01-01T00:00:00Z'
            },
            unreadCount: 1
        });

        expect(showNative).toHaveBeenCalledTimes(1);
        expect(showNative.mock.calls[0]?.[0]).toMatchObject({ id: 90, type: 'friendRequest' });
    });

    it('Tauri : pushNotifications off — pas de notif OS', async () => {
        isTauriMock.mockReturnValue(true);
        settingsState.current.pushNotifications = false;
        unreadCount.mockResolvedValue({ unreadCount: 0 });
        const store = useNotificationsStore();
        await store.onAuthenticatedSession();
        expect(ensureNativePermission).not.toHaveBeenCalled();

        const handlers = setHandlers.mock.calls.at(-1)?.[0] as HubHandlers;
        handlers.onNotificationReceived?.({
            notification: {
                id: 91,
                type: 'friendRequest',
                title: 'Demande',
                subtitle: null,
                message: null,
                isRead: false,
                readAt: null,
                link: '/friends',
                photoUrl: null,
                createdAt: '2026-01-01T00:00:00Z'
            },
            unreadCount: 1
        });

        expect(showNative).not.toHaveBeenCalled();
        expect(store.items).toHaveLength(1);
    });
});
