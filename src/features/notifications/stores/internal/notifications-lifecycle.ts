import { useUserSettingsStore } from '@/features/user-settings';
import { ensureNativeNotificationPermission } from '@/features/notifications/native-notify';
import { isTauri } from '@/utils/helpers/platform-helpers';
import type { NotificationsState } from '@/features/notifications/stores/internal/notifications-state';
import type { NotificationsNative } from '@/features/notifications/stores/internal/notifications-native';
import type { NotificationsInbox } from '@/features/notifications/stores/internal/notifications-inbox';
import type { NotificationsHub } from '@/features/notifications/stores/internal/notifications-hub';

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
        friendshipChangeListeners,
        accountChangeListeners
    } = state;

    const { clearLiveFriendChips, fetchUnreadCount, wireHubHandlers, startHub, stopHub, resetHubFlags } = deps;

    let sessionPromise: Promise<void> | null = null;
    /** Évite de refetch badge + rewire à chaque navigation `/app` (auth guard). */
    let sessionBootstrapped = false;

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
     * Idempotent : navigations suivantes ne refont que le maintain hub.
     */
    async function onAuthenticatedSession() {
        if (sessionBootstrapped) {
            wireHubHandlers();
            await syncRealtimePreference();
            return;
        }
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
            sessionBootstrapped = true;
        })();

        try {
            await sessionPromise;
        } finally {
            sessionPromise = null;
        }
    }

    /** Remet le store à zéro et coupe le hub (logout). */
    function reset() {
        sessionPromise = null;
        sessionBootstrapped = false;
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
        accountChangeListeners.clear();
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
