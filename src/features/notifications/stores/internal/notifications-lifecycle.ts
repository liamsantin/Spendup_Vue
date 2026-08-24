import { useUserSettingsStore } from '@/features/user-settings';
import { ensureNativeNotificationPermission } from '../../native-notify';
import { isTauri } from '@/utils/helpers/platform-helpers';
import type { NotificationsState } from './notifications-state';
import type { NotificationsNative } from './notifications-native';
import type { NotificationsInbox } from './notifications-inbox';
import type { NotificationsHub } from './notifications-hub';

type LifecycleDeps = Pick<NotificationsNative, 'clearLiveFriendChips'> &
    Pick<NotificationsInbox, 'fetchUnreadCount'> &
    Pick<NotificationsHub, 'wireHubHandlers' | 'startHub' | 'stopHub' | 'resetHubFlags'>;

/**
 * Cycle de vie : session authentifiée, sync prefs realtime, reset.
 * @param state État partagé du store.
 * @param deps Actions hub / inbox / native.
 * @returns Les actions de cycle de vie.
 */
export function createNotificationsLifecycle(state: NotificationsState, deps: LifecycleDeps) {
    const {
        items,
        unreadCount,
        page,
        totalCount,
        loading,
        loadingMore,
        markingAll,
        clearingAll,
        inboxLoaded,
        error,
        hubConnected,
        friendListeners,
        accountShareListeners,
        friendshipChangeListeners
    } = state;

    const { clearLiveFriendChips, fetchUnreadCount, wireHubHandlers, startHub, stopHub, resetHubFlags } = deps;

    let sessionPromise: Promise<void> | null = null;

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
        resetHubFlags();
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
        syncRealtimePreference,
        onAuthenticatedSession,
        reset
    };
}

export type NotificationsLifecycle = ReturnType<typeof createNotificationsLifecycle>;
