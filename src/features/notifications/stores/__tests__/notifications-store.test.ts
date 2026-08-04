import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';

const { unreadCount, list, markRead, markAllRead, startHub, stopHub, setHandlers, forceReLogin, getDeviceId, settingsState } = vi.hoisted(
    () => ({
        unreadCount: vi.fn(),
        list: vi.fn(),
        markRead: vi.fn(),
        markAllRead: vi.fn(),
        startHub: vi.fn(),
        stopHub: vi.fn(),
        setHandlers: vi.fn(),
        forceReLogin: vi.fn(),
        getDeviceId: vi.fn(() => 'device-local'),
        settingsState: {
            current: { pushNotifications: true, pushSecurityAlerts: true, pushFriendRequest: true, pushFinancialAlerts: true }
        }
    })
);

vi.mock('../../api', () => ({
    notificationsApi: {
        unreadCount: () => unreadCount(),
        list: (...args: unknown[]) => list(...args),
        markRead: (id: number) => markRead(id),
        markAllRead: () => markAllRead()
    }
}));

vi.mock('../../hub', () => ({
    startNotificationsHub: () => startHub(),
    stopNotificationsHub: () => stopHub(),
    setNotificationsHubHandlers: (h: unknown) => setHandlers(h),
    getNotificationsHubState: () => null
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

import { useNotificationsStore } from '../notifications-store';

type HubHandlers = {
    onSessionEnded?: (payload: { reason: string; deviceIdentifier: string | null }) => void;
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
        startHub.mockReset().mockResolvedValue(undefined);
        stopHub.mockReset().mockResolvedValue(undefined);
        setHandlers.mockReset();
        forceReLogin.mockReset().mockResolvedValue(undefined);
        getDeviceId.mockReset().mockReturnValue('device-local');
    });

    it('hydrate le badge via unread-count puis démarre le hub', async () => {
        unreadCount.mockResolvedValue({ unreadCount: 3 });
        const store = useNotificationsStore();

        await store.onAuthenticatedSession();

        expect(store.unreadCount).toBe(3);
        expect(startHub).toHaveBeenCalled();
        expect(setHandlers).toHaveBeenCalled();
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
});
