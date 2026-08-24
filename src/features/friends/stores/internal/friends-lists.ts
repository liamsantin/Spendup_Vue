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
 * @param state État partagé du store.
 * @returns Les actions de chargement / recherche.
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

    /**
     * Charge la première page d’amis (TTL cache).
     * @param force Si `true`, ignore le TTL et refetch.
     */
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

    /** Charge la page suivante d’amis. */
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

    /**
     * Charge la première page des demandes entrantes (TTL cache).
     * @param force Si `true`, ignore le TTL et refetch.
     */
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

    /** Charge la page suivante des demandes entrantes. */
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

    /**
     * Charge la première page des demandes sortantes (TTL cache).
     * @param force Si `true`, ignore le TTL et refetch.
     */
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

    /** Charge la page suivante des demandes sortantes. */
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

    /**
     * Charge la première page des utilisateurs bloqués (TTL cache).
     * @param force Si `true`, ignore le TTL et refetch.
     */
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

    /** Charge la page suivante des utilisateurs bloqués. */
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

    /**
     * Recherche d’utilisateurs (min. 2 caractères).
     * @param q Requête de recherche (défaut : `searchQuery`).
     */
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

    /** Charge la page suivante des résultats de recherche. */
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

    /** Relance la recherche si une requête active est présente. */
    function refreshSearchIfNeeded() {
        if (searchQuery.value.trim().length < 2) return;
        void searchUsers(searchQuery.value);
    }

    /** Invalide le cache et recharge toutes les listes. */
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
