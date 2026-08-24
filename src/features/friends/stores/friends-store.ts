import { defineStore } from 'pinia';
import {
    createFriendsState,
    createFriendsLists,
    createFriendsMutations,
    createFriendsRealtime,
    createFriendsLifecycle,
    FRIENDS_LIST_MAX_AGE_MS
} from '@/features/friends/stores/internal';

export { FRIENDS_LIST_MAX_AGE_MS };

/**
 * Façade Pinia du store amis : assemble state, listes, mutations, realtime et cycle de vie.
 *
 * Budget fetch (TTL 60s listes, hors invalidation realtime / refresh manuel).
 */
export const useFriendsStore = defineStore('friends', () => {
    const state = createFriendsState();
    const lists = createFriendsLists(state);
    const mutations = createFriendsMutations(state, lists);
    const realtime = createFriendsRealtime(state, lists);
    const lifecycle = createFriendsLifecycle(state, lists, realtime);

    return {
        friends: state.friends,
        incomingRequests: state.incomingRequests,
        outgoingRequests: state.outgoingRequests,
        blockedUsers: state.blockedUsers,
        searchResults: state.searchResults,
        searchQuery: state.searchQuery,
        focusFriendshipPublicId: state.focusFriendshipPublicId,
        loadingFriends: state.loadingFriends,
        loadingIncoming: state.loadingIncoming,
        loadingOutgoing: state.loadingOutgoing,
        loadingBlocked: state.loadingBlocked,
        searching: state.searching,
        loadingMoreFriends: state.loadingMoreFriends,
        loadingMoreIncoming: state.loadingMoreIncoming,
        loadingMoreOutgoing: state.loadingMoreOutgoing,
        loadingMoreBlocked: state.loadingMoreBlocked,
        loadingMoreSearch: state.loadingMoreSearch,
        acting: state.acting,
        initialized: state.initialized,
        error: state.error,
        friendsCount: state.friendsCount,
        incomingCount: state.incomingCount,
        outgoingCount: state.outgoingCount,
        blockedCount: state.blockedCount,
        canSearch: state.canSearch,
        hasMoreFriends: state.hasMoreFriends,
        hasMoreIncoming: state.hasMoreIncoming,
        hasMoreOutgoing: state.hasMoreOutgoing,
        hasMoreBlocked: state.hasMoreBlocked,
        hasMoreSearch: state.hasMoreSearch,
        onAuthenticatedSession: realtime.onAuthenticatedSession,
        bootstrap: lifecycle.bootstrap,
        openTab: lifecycle.openTab,
        refreshAll: lists.refreshAll,
        loadFriends: lists.loadFriends,
        loadMoreFriends: lists.loadMoreFriends,
        loadIncoming: lists.loadIncoming,
        loadMoreIncoming: lists.loadMoreIncoming,
        loadOutgoing: lists.loadOutgoing,
        loadMoreOutgoing: lists.loadMoreOutgoing,
        loadBlocked: lists.loadBlocked,
        loadMoreBlocked: lists.loadMoreBlocked,
        searchUsers: lists.searchUsers,
        loadMoreSearch: lists.loadMoreSearch,
        clearSearch: lists.clearSearch,
        setFocusFriendship: state.setFocusFriendship,
        isFocusedFriendship: state.isFocusedFriendship,
        sendRequest: mutations.sendRequest,
        acceptRequest: mutations.acceptRequest,
        refuseRequest: mutations.refuseRequest,
        cancelRequest: mutations.cancelRequest,
        outgoingRequestFor: state.outgoingRequestFor,
        removeFriend: mutations.removeFriend,
        blockUser: mutations.blockUser,
        unblockUser: mutations.unblockUser,
        reset: lifecycle.reset
    };
});
