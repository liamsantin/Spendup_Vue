import { defineStore } from 'pinia';
import {
    createNotificationsState,
    createNotificationsNative,
    createNotificationsInbox,
    createNotificationsHub,
    createNotificationsLifecycle,
    type LiveFriendChip
} from '@/features/notifications/stores/internal';

export type { LiveFriendChip };

/**
 * Façade Pinia du store notifications : inbox, hub SignalR, chips live et cycle de vie.
 */
export const useNotificationsStore = defineStore('notifications', () => {
    const state = createNotificationsState();
    const native = createNotificationsNative(state);
    const inbox = createNotificationsInbox(state, native);
    const hub = createNotificationsHub(state, {
        pushLiveFriendChip: native.pushLiveFriendChip,
        maybeShowNativeOsNotification: native.maybeShowNativeOsNotification,
        applyInboxCleared: inbox.applyInboxCleared
    });
    const lifecycle = createNotificationsLifecycle(state, {
        clearLiveFriendChips: native.clearLiveFriendChips,
        fetchUnreadCount: inbox.fetchUnreadCount,
        wireHubHandlers: hub.wireHubHandlers,
        startHub: hub.startHub,
        stopHub: hub.stopHub,
        resetHubFlags: hub.resetHubFlags
    });

    return {
        items: state.items,
        unreadCount: state.unreadCount,
        page: state.page,
        pageSize: state.pageSize,
        totalCount: state.totalCount,
        loading: state.loading,
        loadingMore: state.loadingMore,
        markingAll: state.markingAll,
        clearingAll: state.clearingAll,
        inboxLoaded: state.inboxLoaded,
        error: state.error,
        hubConnected: state.hubConnected,
        liveFriendChips: state.liveFriendChips,
        hasUnread: state.hasUnread,
        badgeContent: state.badgeContent,
        hasMore: state.hasMore,
        hasItems: state.hasItems,
        subscribeToFriendNotifications: hub.subscribeToFriendNotifications,
        subscribeToAccountShareNotifications: hub.subscribeToAccountShareNotifications,
        subscribeToFriendshipChanged: hub.subscribeToFriendshipChanged,
        dismissLiveFriendChip: native.dismissLiveFriendChip,
        dismissLiveFriendChipsByNotificationId: native.dismissLiveFriendChipsByNotificationId,
        fetchUnreadCount: inbox.fetchUnreadCount,
        loadInbox: inbox.loadInbox,
        openInbox: inbox.openInbox,
        loadMore: inbox.loadMore,
        markRead: inbox.markRead,
        markAllRead: inbox.markAllRead,
        clearAll: inbox.clearAll,
        syncRealtimePreference: lifecycle.syncRealtimePreference,
        onAuthenticatedSession: lifecycle.onAuthenticatedSession,
        reset: lifecycle.reset
    };
});
