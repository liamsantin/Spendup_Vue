import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { HubConnectionState } from '@microsoft/signalr';
import { useUserSettingsStore } from '@/features/user-settings';
import { notificationsApi } from '../api';
import { getNotificationsHubState, setNotificationsHubHandlers, startNotificationsHub, stopNotificationsHub } from '../hub';
import { isFriendNotificationType, isSecurityNotificationType } from '../link';
import type { AppNotification, NotificationReceivedPayload } from '../types';

const DEFAULT_PAGE_SIZE = 20;

export const useNotificationsStore = defineStore('notifications', () => {
    const items = ref<AppNotification[]>([]);
    const unreadCount = ref(0);
    const page = ref(1);
    const pageSize = ref(DEFAULT_PAGE_SIZE);
    const totalCount = ref(0);
    const loading = ref(false);
    const loadingMore = ref(false);
    const markingAll = ref(false);
    const inboxLoaded = ref(false);
    const error = ref<string | null>(null);
    const hubConnected = ref(false);

    let sessionPromise: Promise<void> | null = null;

    const hasUnread = computed(() => unreadCount.value > 0);
    const badgeContent = computed(() => (unreadCount.value > 0 ? unreadCount.value : undefined));

    function applyUnreadCount(count: number) {
        unreadCount.value = Math.max(0, Number.isFinite(count) ? count : 0);
    }

    function upsertItem(notification: AppNotification, prepend = false) {
        const idx = items.value.findIndex((n) => n.id === notification.id);
        if (idx >= 0) {
            items.value[idx] = notification;
            return;
        }
        if (prepend) {
            items.value = [notification, ...items.value];
        } else {
            items.value = [...items.value, notification];
        }
    }

    function shouldShowLiveNotification(type: string): boolean {
        const settings = useUserSettingsStore().current;
        if (!settings.pushNotifications) return false;
        if (isSecurityNotificationType(type) && !settings.pushSecurityAlerts) return false;
        if (isFriendNotificationType(type) && !settings.pushFriendRequest) return false;
        // Types finance futurs — coupe le live si désactivé.
        if (type.toLowerCase().includes('financial') && !settings.pushFinancialAlerts) return false;
        return true;
    }

    function onNotificationReceived(payload: NotificationReceivedPayload) {
        if (payload?.unreadCount != null) {
            applyUnreadCount(payload.unreadCount);
        }
        const notification = payload?.notification;
        if (!notification?.id) return;
        if (!shouldShowLiveNotification(String(notification.type))) return;
        upsertItem(notification, true);
    }

    function wireHubHandlers() {
        setNotificationsHubHandlers({
            onConnected: () => {
                hubConnected.value = true;
            },
            onNotificationReceived
        });
    }

    async function fetchUnreadCount() {
        const result = await notificationsApi.unreadCount();
        applyUnreadCount(result?.unreadCount ?? 0);
    }

    async function loadInbox(options?: { page?: number; append?: boolean }) {
        const nextPage = options?.page ?? 1;
        const append = options?.append === true;
        if (append) loadingMore.value = true;
        else loading.value = true;
        error.value = null;
        try {
            const result = await notificationsApi.list({
                page: nextPage,
                pageSize: pageSize.value
            });
            const nextItems = Array.isArray(result?.items) ? result.items : [];
            items.value = append ? [...items.value, ...nextItems] : nextItems;
            page.value = result?.page ?? nextPage;
            pageSize.value = result?.pageSize ?? pageSize.value;
            totalCount.value = result?.totalCount ?? nextItems.length;
            if (result?.unreadCount != null) applyUnreadCount(result.unreadCount);
            inboxLoaded.value = true;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loading.value = false;
            loadingMore.value = false;
        }
    }

    async function openInbox() {
        await loadInbox({ page: 1, append: false });
    }

    async function markRead(id: number) {
        const updated = await notificationsApi.markRead(id);
        upsertItem(updated);
        try {
            await fetchUnreadCount();
        } catch {
            if (updated.isRead && unreadCount.value > 0) {
                applyUnreadCount(unreadCount.value - 1);
            }
        }
        return updated;
    }

    async function markAllRead() {
        markingAll.value = true;
        error.value = null;
        try {
            const result = await notificationsApi.markAllRead();
            applyUnreadCount(result?.unreadCount ?? 0);
            items.value = items.value.map((n) => (n.isRead ? n : { ...n, isRead: true, readAt: n.readAt ?? new Date().toISOString() }));
            return result;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            markingAll.value = false;
        }
    }

    async function startHub() {
        wireHubHandlers();
        await startNotificationsHub();
        hubConnected.value = getNotificationsHubState() === HubConnectionState.Connected;
    }

    async function stopHub() {
        await stopNotificationsHub();
        hubConnected.value = false;
    }

    /** Démarre / coupe le hub selon `pushNotifications`. */
    async function syncRealtimePreference() {
        const enabled = useUserSettingsStore().current.pushNotifications;
        if (!enabled) {
            await stopHub();
            return;
        }
        try {
            await startHub();
        } catch {
            hubConnected.value = false;
        }
    }

    /**
     * Après session authentifiée complète (pas pendant challenge 2FA) :
     * badge unread + hub si push activé.
     */
    async function onAuthenticatedSession() {
        if (sessionPromise) return sessionPromise;

        sessionPromise = (async () => {
            wireHubHandlers();
            try {
                await fetchUnreadCount();
            } catch {
                // Badge non bloquant
            }
            await syncRealtimePreference();
        })();

        try {
            await sessionPromise;
        } finally {
            sessionPromise = null;
        }
    }

    function reset() {
        sessionPromise = null;
        items.value = [];
        unreadCount.value = 0;
        page.value = 1;
        totalCount.value = 0;
        loading.value = false;
        loadingMore.value = false;
        markingAll.value = false;
        inboxLoaded.value = false;
        error.value = null;
        hubConnected.value = false;
        void stopHub();
    }

    return {
        items,
        unreadCount,
        page,
        pageSize,
        totalCount,
        loading,
        loadingMore,
        markingAll,
        inboxLoaded,
        error,
        hubConnected,
        hasUnread,
        badgeContent,
        fetchUnreadCount,
        loadInbox,
        openInbox,
        markRead,
        markAllRead,
        syncRealtimePreference,
        onAuthenticatedSession,
        reset
    };
});
