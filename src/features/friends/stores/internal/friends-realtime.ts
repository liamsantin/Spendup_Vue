import { useNotificationsStore } from '@/features/notifications';
import type { AppNotification, FriendshipChange, FriendshipChangedPayload } from '@/features/notifications';
import type { FriendsState } from '@/features/friends/stores/internal/friends-state';
import type { FriendsLists } from '@/features/friends/stores/internal/friends-lists';

/**
 * Pont realtime notifications → refresh listes amis.
 * @param state État partagé du store.
 * @param lists Actions de chargement à rafraîchir.
 * @returns Les actions du bridge realtime.
 */
export function createFriendsRealtime(state: FriendsState, lists: FriendsLists) {
    const { loadFriends, loadIncoming, loadOutgoing, loadBlocked, refreshSearchIfNeeded } = lists;

    let unsubscribeNotifications: (() => void) | null = null;
    let unsubscribeFriendshipChanged: (() => void) | null = null;
    let friendshipRefreshQueue: FriendshipChange[] = [];
    let friendshipRefreshRunning = false;

    /** Réagit aux notifs friendRequest / friendAccepted. */
    function handleRealtime(notification: AppNotification) {
        if (notification.type === 'friendRequest') {
            void loadIncoming(true);
            refreshSearchIfNeeded();
            return;
        }
        if (notification.type === 'friendAccepted') {
            void Promise.all([loadFriends(true), loadOutgoing(true), loadIncoming(true)]).then(() => {
                refreshSearchIfNeeded();
            });
        }
    }

    /**
     * Applique un changement d’amitié SignalR (refus, annulation, blocage…).
     * @param change Type de changement reçu.
     */
    async function applyFriendshipChange(change: FriendshipChange) {
        if (change === 'refused') {
            await loadOutgoing(true);
            refreshSearchIfNeeded();
            return;
        }
        if (change === 'canceled') {
            await loadIncoming(true);
            refreshSearchIfNeeded();
            return;
        }
        if (change === 'blocked') {
            await Promise.all([loadFriends(true), loadOutgoing(true), loadIncoming(true), loadBlocked(true)]);
            refreshSearchIfNeeded();
            return;
        }
        if (change === 'removed') {
            await loadFriends(true);
            return;
        }
        if (change === 'nicknameUpdated') {
            await loadFriends(true);
        }
    }

    /** Vide la file de refresh en série (déduplique les changements identiques consécutifs). */
    async function drainFriendshipRefreshQueue() {
        if (friendshipRefreshRunning) return;
        friendshipRefreshRunning = true;
        try {
            while (friendshipRefreshQueue.length > 0) {
                const change = friendshipRefreshQueue.shift();
                if (!change) continue;
                while (friendshipRefreshQueue[0] === change) {
                    friendshipRefreshQueue.shift();
                }
                await applyFriendshipChange(change);
            }
        } finally {
            friendshipRefreshRunning = false;
            if (friendshipRefreshQueue.length > 0) {
                void drainFriendshipRefreshQueue();
            }
        }
    }

    /**
     * Enfile un événement `friendshipChanged` pour refresh séquentiel.
     * @param payload Payload SignalR.
     */
    function handleFriendshipChanged(payload: FriendshipChangedPayload) {
        if (!payload?.change) return;
        friendshipRefreshQueue.push(payload.change);
        void drainFriendshipRefreshQueue();
    }

    /** Abonne le store aux canaux notifs amis (idempotent). */
    function ensureRealtimeBridge() {
        if (unsubscribeNotifications && unsubscribeFriendshipChanged) return;
        const notifications = useNotificationsStore();
        unsubscribeNotifications ??= notifications.subscribeToFriendNotifications(handleRealtime);
        unsubscribeFriendshipChanged ??= notifications.subscribeToFriendshipChanged(handleFriendshipChanged);
    }

    /** Après login : écoute live même avant la première visite de /app/friends. */
    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    /** Désabonne et vide la file de refresh. */
    function teardownRealtimeBridge() {
        unsubscribeNotifications?.();
        unsubscribeNotifications = null;
        unsubscribeFriendshipChanged?.();
        unsubscribeFriendshipChanged = null;
        friendshipRefreshQueue = [];
        friendshipRefreshRunning = false;
    }

    return {
        ensureRealtimeBridge,
        onAuthenticatedSession,
        teardownRealtimeBridge
    };
}

export type FriendsRealtime = ReturnType<typeof createFriendsRealtime>;
