import { friendsApi } from '@/features/friends/api';
import {
    DEFAULT_PAGE_SIZE,
    KEY_BLOCKED,
    KEY_FRIENDS,
    KEY_INCOMING,
    KEY_OUTGOING,
    type FriendsState
} from '@/features/friends/stores/internal/friends-state';

/**
 * Chargement paginé des listes amis + recherche.
 */
export function createFriendsLists(state: FriendsState) {
    const {
        friends,
        incomingRequests,
        outgoingRequests,
        blockedUsers,
        searchResults,
        searchQuery,
        friendsPage,
        incomingPage,
        outgoingPage,
        blockedPage,
        searchPage,
        friendsTotalCount,
        incomingTotalCount,
        outgoingTotalCount,
        blockedTotalCount,
        searchTotalCount,
        loadingFriends,
        loadingIncoming,
        loadingOutgoing,
        loadingBlocked,
        searching,
        loadingMoreFriends,
        loadingMoreIncoming,
        loadingMoreOutgoing,
        loadingMoreBlocked,
        loadingMoreSearch,
        hasMoreFriends,
        hasMoreIncoming,
        hasMoreOutgoing,
        hasMoreBlocked,
        hasMoreSearch,
        cache,
        clearError,
        applyPageResult,
        clearSearch
    } = state;

    async function loadFriends(force = false) {
        await cache.ensure(
            KEY_FRIENDS,
            async () => {
                loadingFriends.value = true;
                clearError();
                try {
                    const result = await friendsApi.list(1, DEFAULT_PAGE_SIZE);
                    applyPageResult(result, friends, friendsPage, friendsTotalCount, false);
                } catch (e: unknown) {
                    state.error.value = e instanceof Error ? e.message : String(e);
                    throw e;
                } finally {
                    loadingFriends.value = false;
                }
            },
            { force }
        );
    }

    async function loadMoreFriends() {
        if (!hasMoreFriends.value || loadingFriends.value || loadingMoreFriends.value) return;
        loadingMoreFriends.value = true;
        clearError();
        try {
            const result = await friendsApi.list(friendsPage.value + 1, DEFAULT_PAGE_SIZE);
            applyPageResult(result, friends, friendsPage, friendsTotalCount, true);
        } catch (e: unknown) {
            state.error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loadingMoreFriends.value = false;
        }
    }

    async function loadIncoming(force = false) {
        await cache.ensure(
            KEY_INCOMING,
            async () => {
                loadingIncoming.value = true;
                clearError();
                try {
                    const result = await friendsApi.incoming(1, DEFAULT_PAGE_SIZE);
                    applyPageResult(result, incomingRequests, incomingPage, incomingTotalCount, false);
                } catch (e: unknown) {
                    state.error.value = e instanceof Error ? e.message : String(e);
                    throw e;
                } finally {
                    loadingIncoming.value = false;
                }
            },
            { force }
        );
    }

    async function loadMoreIncoming() {
        if (!hasMoreIncoming.value || loadingIncoming.value || loadingMoreIncoming.value) return;
        loadingMoreIncoming.value = true;
        clearError();
        try {
            const result = await friendsApi.incoming(incomingPage.value + 1, DEFAULT_PAGE_SIZE);
            applyPageResult(result, incomingRequests, incomingPage, incomingTotalCount, true);
        } catch (e: unknown) {
            state.error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loadingMoreIncoming.value = false;
        }
    }

    async function loadOutgoing(force = false) {
        await cache.ensure(
            KEY_OUTGOING,
            async () => {
                loadingOutgoing.value = true;
                clearError();
                try {
                    const result = await friendsApi.outgoing(1, DEFAULT_PAGE_SIZE);
                    applyPageResult(result, outgoingRequests, outgoingPage, outgoingTotalCount, false);
                } catch (e: unknown) {
                    state.error.value = e instanceof Error ? e.message : String(e);
                    throw e;
                } finally {
                    loadingOutgoing.value = false;
                }
            },
            { force }
        );
    }

    async function loadMoreOutgoing() {
        if (!hasMoreOutgoing.value || loadingOutgoing.value || loadingMoreOutgoing.value) return;
        loadingMoreOutgoing.value = true;
        clearError();
        try {
            const result = await friendsApi.outgoing(outgoingPage.value + 1, DEFAULT_PAGE_SIZE);
            applyPageResult(result, outgoingRequests, outgoingPage, outgoingTotalCount, true);
        } catch (e: unknown) {
            state.error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loadingMoreOutgoing.value = false;
        }
    }

    async function loadBlocked(force = false) {
        await cache.ensure(
            KEY_BLOCKED,
            async () => {
                loadingBlocked.value = true;
                clearError();
                try {
                    const result = await friendsApi.blocked(1, DEFAULT_PAGE_SIZE);
                    applyPageResult(result, blockedUsers, blockedPage, blockedTotalCount, false);
                } catch (e: unknown) {
                    state.error.value = e instanceof Error ? e.message : String(e);
                    throw e;
                } finally {
                    loadingBlocked.value = false;
                }
            },
            { force }
        );
    }

    async function loadMoreBlocked() {
        if (!hasMoreBlocked.value || loadingBlocked.value || loadingMoreBlocked.value) return;
        loadingMoreBlocked.value = true;
        clearError();
        try {
            const result = await friendsApi.blocked(blockedPage.value + 1, DEFAULT_PAGE_SIZE);
            applyPageResult(result, blockedUsers, blockedPage, blockedTotalCount, true);
        } catch (e: unknown) {
            state.error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loadingMoreBlocked.value = false;
        }
    }

    async function searchUsers(q = searchQuery.value) {
        searchQuery.value = q;
        const trimmed = q.trim();
        if (trimmed.length < 2) {
            searchResults.value = [];
            searchPage.value = 1;
            searchTotalCount.value = 0;
            return;
        }

        searching.value = true;
        clearError();
        try {
            const result = await friendsApi.search({ q: trimmed, page: 1, pageSize: DEFAULT_PAGE_SIZE });
            applyPageResult(result, searchResults, searchPage, searchTotalCount, false);
        } catch (e: unknown) {
            state.error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            searching.value = false;
        }
    }

    async function loadMoreSearch() {
        if (!hasMoreSearch.value || searching.value || loadingMoreSearch.value) return;
        const trimmed = searchQuery.value.trim();
        if (trimmed.length < 2) return;
        loadingMoreSearch.value = true;
        clearError();
        try {
            const result = await friendsApi.search({
                q: trimmed,
                page: searchPage.value + 1,
                pageSize: DEFAULT_PAGE_SIZE
            });
            applyPageResult(result, searchResults, searchPage, searchTotalCount, true);
        } catch (e: unknown) {
            state.error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loadingMoreSearch.value = false;
        }
    }

    function refreshSearchIfNeeded() {
        if (searchQuery.value.trim().length < 2) return;
        void searchUsers(searchQuery.value);
    }

    async function refreshAll() {
        cache.invalidate('*');
        await Promise.all([loadFriends(true), loadIncoming(true), loadOutgoing(true), loadBlocked(true)]);
    }

    return {
        loadFriends,
        loadMoreFriends,
        loadIncoming,
        loadMoreIncoming,
        loadOutgoing,
        loadMoreOutgoing,
        loadBlocked,
        loadMoreBlocked,
        searchUsers,
        loadMoreSearch,
        clearSearch,
        refreshSearchIfNeeded,
        refreshAll
    };
}

export type FriendsLists = ReturnType<typeof createFriendsLists>;
