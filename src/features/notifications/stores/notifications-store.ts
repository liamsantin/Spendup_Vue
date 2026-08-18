import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { HubConnectionState } from '@microsoft/signalr';
import { getOrCreateDeviceId } from '@/features/auth/device';
import { i18n } from '@/plugins/i18n';
import { useUserSettingsStore } from '@/features/user-settings';
import { notificationsApi } from '../api';
import { getNotificationsHubState, setNotificationsHubHandlers, startNotificationsHub, stopNotificationsHub } from '../hub';
import { isLiveChipType } from '../friendChip';
import { isAccountShareNotificationType, isFriendNotificationType, isSecurityNotificationType } from '../link';
import { ensureNativeNotificationPermission, showNativeNotification } from '../native-notify';
import { normalizeNotificationReceivedPayload } from '../normalize';
import { isTauri } from '@/utils/helpers/platform-helpers';
import type {
    AppNotification,
    FriendshipChangedPayload,
    InboxClearedPayload,
    NotificationReceivedPayload,
    SessionEndedPayload
} from '../types';

const DEFAULT_PAGE_SIZE = 20;
const LIVE_CHIP_DISMISS_MS = 8000;

export type LiveFriendChip = {
    key: string;
    notification: AppNotification;
};

function t(key: string) {
    return String(i18n.global.t(key));
}

export const useNotificationsStore = defineStore('notifications', () => {
    const items = ref<AppNotification[]>([]);
    const unreadCount = ref(0);
    const page = ref(1);
    const pageSize = ref(DEFAULT_PAGE_SIZE);
    const totalCount = ref(0);
    const loading = ref(false);
    const loadingMore = ref(false);
    const markingAll = ref(false);
    const clearingAll = ref(false);
    const inboxLoaded = ref(false);
    const error = ref<string | null>(null);
    const hubConnected = ref(false);
    const friendListeners = new Set<(notification: AppNotification) => void>();
    const accountShareListeners = new Set<(notification: AppNotification) => void>();
    const friendshipChangeListeners = new Set<(payload: FriendshipChangedPayload) => void>();
    const liveFriendChips = ref<LiveFriendChip[]>([]);

    let sessionPromise: Promise<void> | null = null;
    let handlingSessionEnded = false;
    const liveChipTimers = new Map<string, ReturnType<typeof setTimeout>>();

    const hasUnread = computed(() => unreadCount.value > 0);
    const badgeContent = computed(() => (unreadCount.value > 0 ? unreadCount.value : undefined));
    const hasMore = computed(() => items.value.length < totalCount.value);
    const hasItems = computed(() => items.value.length > 0 || totalCount.value > 0 || unreadCount.value > 0);

    function applyUnreadCount(count: number) {
        unreadCount.value = Math.max(0, Number.isFinite(count) ? count : 0);
    }

    /** @returns `true` si un nouvel item a été inséré (pas un update). */
    function upsertItem(notification: AppNotification, prepend = false): boolean {
        const idx = items.value.findIndex((n) => n.id === notification.id);
        if (idx >= 0) {
            items.value[idx] = notification;
            return false;
        }
        if (prepend) {
            items.value = [notification, ...items.value];
        } else {
            items.value = [...items.value, notification];
        }
        return true;
    }

    /**
     * Gate prefs push (`pushNotifications` + sous-préférences).
     * Chips live in-app + notifications OS (Tauri). N’affecte pas l’inbox / badge / listes amis.
     */
    function shouldShowLiveChip(type: string): boolean {
        const settings = useUserSettingsStore().current;
        if (!settings.pushNotifications) return false;
        if (isSecurityNotificationType(type) && !settings.pushSecurityAlerts) return false;
        if (isFriendNotificationType(type) && !settings.pushFriendRequest) return false;
        if (isAccountShareNotificationType(type) && !settings.pushFinancialAlerts) return false;
        // Types finance futurs — coupe le chip / OS notify si désactivé.
        if (type.toLowerCase().includes('financial') && !settings.pushFinancialAlerts) return false;
        return true;
    }

    function maybeShowNativeOsNotification(notification: AppNotification) {
        if (!shouldShowLiveChip(String(notification.type))) return;
        void showNativeNotification(notification);
    }

    function dismissLiveFriendChip(key: string) {
        const timer = liveChipTimers.get(key);
        if (timer) {
            clearTimeout(timer);
            liveChipTimers.delete(key);
        }
        liveFriendChips.value = liveFriendChips.value.filter((chip) => chip.key !== key);
    }

    function dismissLiveFriendChipsByNotificationId(notificationId: number) {
        liveFriendChips.value.filter((chip) => chip.notification.id === notificationId).forEach((chip) => dismissLiveFriendChip(chip.key));
    }

    function clearLiveFriendChips() {
        liveChipTimers.forEach((timer) => clearTimeout(timer));
        liveChipTimers.clear();
        liveFriendChips.value = [];
    }

    function pushLiveFriendChip(notification: AppNotification) {
        if (!isLiveChipType(String(notification.type))) return;
        if (notification.isRead) return;
        if (!shouldShowLiveChip(String(notification.type))) return;

        const key = `${notification.id}-${Date.now()}`;
        liveFriendChips.value = [...liveFriendChips.value, { key, notification }];
        const timer = setTimeout(() => dismissLiveFriendChip(key), LIVE_CHIP_DISMISS_MS);
        liveChipTimers.set(key, timer);
    }

    function onNotificationReceived(payload: NotificationReceivedPayload) {
        const normalized = normalizeNotificationReceivedPayload(payload) ?? payload;
        if (normalized?.unreadCount != null) {
            applyUnreadCount(normalized.unreadCount);
        }
        const notification = normalized?.notification;
        if (!notification?.id) return;

        // Listes amis + inbox : friendRequest / friendAccepted uniquement.
        if (isFriendNotificationType(String(notification.type))) {
            friendListeners.forEach((listener) => listener(notification));
        }
        if (isAccountShareNotificationType(String(notification.type))) {
            accountShareListeners.forEach((listener) => listener(notification));
        }
        const inserted = upsertItem(notification, true);
        if (inserted) {
            totalCount.value = Math.max(items.value.length, totalCount.value + 1);
        }
        pushLiveFriendChip(notification);
        maybeShowNativeOsNotification(notification);
    }

    /** Live sans inbox : ne touche pas au badge unread. */
    function onFriendshipChanged(payload: FriendshipChangedPayload) {
        if (!payload?.change || !payload?.friendshipPublicId) return;
        friendshipChangeListeners.forEach((listener) => listener(payload));
    }

    function applyInboxCleared(unread = 0) {
        applyUnreadCount(unread);
        items.value = [];
        totalCount.value = 0;
        page.value = 1;
        clearLiveFriendChips();
    }

    /** SignalR multi-appareils après DELETE /api/notifications. */
    function onInboxCleared(payload: InboxClearedPayload) {
        applyInboxCleared(payload?.unreadCount ?? 0);
    }

    function targetsThisDevice(payload: SessionEndedPayload): boolean {
        const target = payload?.deviceIdentifier;
        if (target == null || target === '') return true;
        return target === getOrCreateDeviceId();
    }

    /**
     * Session invalidée (logout / stamp MDP-email / révocation appareil).
     * Coupe le hub ; force le re-login si cet appareil est concerné.
     */
    async function onSessionEnded(payload: SessionEndedPayload) {
        if (handlingSessionEnded) return;
        if (!targetsThisDevice(payload)) return;

        handlingSessionEnded = true;
        try {
            await stopHub();
            const { useAuthStore } = await import('@/features/auth/stores/auth-store');
            const messageKey =
                payload?.deviceIdentifier == null || payload.deviceIdentifier === ''
                    ? 'auth.notices.allSessionsRevoked'
                    : 'auth.notices.sessionEnded';
            await useAuthStore().forceReLogin(t(messageKey));
        } finally {
            handlingSessionEnded = false;
        }
    }

    function subscribeToFriendNotifications(listener: (notification: AppNotification) => void) {
        friendListeners.add(listener);
        return () => {
            friendListeners.delete(listener);
        };
    }

    function subscribeToAccountShareNotifications(listener: (notification: AppNotification) => void) {
        accountShareListeners.add(listener);
        return () => {
            accountShareListeners.delete(listener);
        };
    }

    function subscribeToFriendshipChanged(listener: (payload: FriendshipChangedPayload) => void) {
        friendshipChangeListeners.add(listener);
        return () => {
            friendshipChangeListeners.delete(listener);
        };
    }

    function wireHubHandlers() {
        setNotificationsHubHandlers({
            onConnected: () => {
                hubConnected.value = true;
            },
            onNotificationReceived,
            onFriendshipChanged,
            onInboxCleared,
            onSessionEnded: (payload) => onSessionEnded(payload)
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

    async function loadMore() {
        if (!hasMore.value || loading.value || loadingMore.value) return;
        await loadInbox({ page: page.value + 1, append: true });
    }

    async function markRead(id: number) {
        // Lecture depuis le dropdown / inbox : retirer le chip live associé.
        dismissLiveFriendChipsByNotificationId(id);
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
            clearLiveFriendChips();
            return result;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            markingAll.value = false;
        }
    }

    async function clearAll() {
        clearingAll.value = true;
        error.value = null;
        try {
            const result = await notificationsApi.deleteAll();
            applyInboxCleared(0);
            return result;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            clearingAll.value = false;
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

    /**
     * Le hub reste connecté même si les chips / OS notifs sont coupés :
     * nécessaire pour recevoir `sessionEnded` et alimenter l’inbox.
     * `pushNotifications` filtre chips live (+ notifs OS sous Tauri).
     */
    async function syncRealtimePreference() {
        if (!useUserSettingsStore().current.pushNotifications) {
            clearLiveFriendChips();
        }
        try {
            await startHub();
        } catch {
            hubConnected.value = false;
        }
    }

    /**
     * Après session authentifiée complète (pas pendant challenge 2FA) :
     * badge unread + hub SignalR (sessionEnded + pushes).
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
            if (isTauri() && useUserSettingsStore().current.pushNotifications) {
                void ensureNativeNotificationPermission();
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
        handlingSessionEnded = false;
        items.value = [];
        unreadCount.value = 0;
        page.value = 1;
        totalCount.value = 0;
        loading.value = false;
        loadingMore.value = false;
        markingAll.value = false;
        clearingAll.value = false;
        inboxLoaded.value = false;
        error.value = null;
        hubConnected.value = false;
        friendListeners.clear();
        accountShareListeners.clear();
        friendshipChangeListeners.clear();
        clearLiveFriendChips();
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
        clearingAll,
        inboxLoaded,
        error,
        hubConnected,
        liveFriendChips,
        hasUnread,
        badgeContent,
        hasMore,
        hasItems,
        subscribeToFriendNotifications,
        subscribeToAccountShareNotifications,
        subscribeToFriendshipChanged,
        dismissLiveFriendChip,
        dismissLiveFriendChipsByNotificationId,
        fetchUnreadCount,
        loadInbox,
        openInbox,
        loadMore,
        markRead,
        markAllRead,
        clearAll,
        syncRealtimePreference,
        onAuthenticatedSession,
        reset
    };
});
