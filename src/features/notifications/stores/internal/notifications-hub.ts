import { HubConnectionState } from '@microsoft/signalr';
import { getOrCreateDeviceId } from '@/features/auth/device';
import { i18n } from '@/plugins/i18n';
import {
    getNotificationsHubState,
    setNotificationsHubHandlers,
    startNotificationsHub,
    stopNotificationsHub
} from '@/features/notifications/hub';
import { isAccountShareNotificationType, isFriendNotificationType } from '@/features/notifications/link';
import { normalizeNotificationReceivedPayload } from '@/features/notifications/normalize';
import type {
    AppNotification,
    FriendshipChangedPayload,
    InboxClearedPayload,
    NotificationReceivedPayload,
    SessionEndedPayload
} from '@/features/notifications/types';
import type { NotificationsState } from '@/features/notifications/stores/internal/notifications-state';
import type { NotificationsNative } from '@/features/notifications/stores/internal/notifications-native';
import type { NotificationsInbox } from '@/features/notifications/stores/internal/notifications-inbox';

function t(key: string) {
    return String(i18n.global.t(key));
}

type HubDeps = Pick<NotificationsNative, 'pushLiveFriendChip' | 'maybeShowNativeOsNotification'> &
    Pick<NotificationsInbox, 'applyInboxCleared'>;

/**
 * SignalR + listeners (amis / partage de compte / friendship changed / session ended).
 * @param state État partagé du store.
 * @param deps Helpers inbox / native utilisés par les handlers.
 * @returns Les actions hub et abonnements.
 */
export function createNotificationsHub(state: NotificationsState, deps: HubDeps) {
    const {
        items,
        totalCount,
        hubConnected,
        friendListeners,
        accountShareListeners,
        friendshipChangeListeners,
        applyUnreadCount,
        upsertItem
    } = state;

    const { pushLiveFriendChip, maybeShowNativeOsNotification, applyInboxCleared } = deps;

    let handlingSessionEnded = false;

    /** Handler SignalR : notification reçue (badge, inbox, chips, OS). */
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

    /** SignalR multi-appareils après DELETE /api/notifications. */
    function onInboxCleared(payload: InboxClearedPayload) {
        applyInboxCleared(payload?.unreadCount ?? 0);
    }

    /**
     * Indique si le payload `sessionEnded` cible cet appareil.
     * @param payload Payload SignalR.
     */
    function targetsThisDevice(payload: SessionEndedPayload): boolean {
        const target = payload?.deviceIdentifier;
        if (target == null || target === '') return true;
        return target === getOrCreateDeviceId();
    }

    /**
     * Session invalidée (logout / stamp MDP-email / révocation appareil).
     * Coupe le hub ; force le re-login si cet appareil est concerné.
     * @param payload Payload SignalR.
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

    /**
     * Abonne un listener aux notifs amis.
     * @param listener Callback.
     * @returns Fonction de désabonnement.
     */
    function subscribeToFriendNotifications(listener: (notification: AppNotification) => void) {
        friendListeners.add(listener);
        return () => {
            friendListeners.delete(listener);
        };
    }

    /**
     * Abonne un listener aux notifs de partage de compte.
     * @param listener Callback.
     * @returns Fonction de désabonnement.
     */
    function subscribeToAccountShareNotifications(listener: (notification: AppNotification) => void) {
        accountShareListeners.add(listener);
        return () => {
            accountShareListeners.delete(listener);
        };
    }

    /**
     * Abonne un listener aux changements d’amitié (hors inbox).
     * @param listener Callback.
     * @returns Fonction de désabonnement.
     */
    function subscribeToFriendshipChanged(listener: (payload: FriendshipChangedPayload) => void) {
        friendshipChangeListeners.add(listener);
        return () => {
            friendshipChangeListeners.delete(listener);
        };
    }

    /** Branche les handlers SignalR sur le hub partagé. */
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

    /** Démarre la connexion SignalR. */
    async function startHub() {
        wireHubHandlers();
        await startNotificationsHub();
        hubConnected.value = getNotificationsHubState() === HubConnectionState.Connected;
    }

    /** Arrête la connexion SignalR. */
    async function stopHub() {
        await stopNotificationsHub();
        hubConnected.value = false;
    }

    /** Remet les flags internes (ex. garde anti-réentrance `sessionEnded`). */
    function resetHubFlags() {
        handlingSessionEnded = false;
    }

    return {
        wireHubHandlers,
        startHub,
        stopHub,
        resetHubFlags,
        subscribeToFriendNotifications,
        subscribeToAccountShareNotifications,
        subscribeToFriendshipChanged
    };
}

export type NotificationsHub = ReturnType<typeof createNotificationsHub>;
