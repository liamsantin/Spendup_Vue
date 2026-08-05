import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useNotificationsStore } from '@/features/notifications';
import type { AppNotification, FriendshipChangedPayload } from '@/features/notifications';
import { friendsApi } from '../api';
import type { BlockedFriendItem, FriendItem, FriendRequestItem, FriendSearchItem, FriendsPageResult } from '../types';

const DEFAULT_PAGE_SIZE = 20;

export const useFriendsStore = defineStore('friends', () => {
    const friends = ref<FriendItem[]>([]);
    const incomingRequests = ref<FriendRequestItem[]>([]);
    const outgoingRequests = ref<FriendRequestItem[]>([]);
    const blockedUsers = ref<BlockedFriendItem[]>([]);
    const searchResults = ref<FriendSearchItem[]>([]);
    const searchQuery = ref('');

    const friendsPage = ref(1);
    const incomingPage = ref(1);
    const outgoingPage = ref(1);
    const blockedPage = ref(1);
    const searchPage = ref(1);

    const friendsTotalCount = ref(0);
    const incomingTotalCount = ref(0);
    const outgoingTotalCount = ref(0);
    const blockedTotalCount = ref(0);
    const searchTotalCount = ref(0);

    const loadingFriends = ref(false);
    const loadingIncoming = ref(false);
    const loadingOutgoing = ref(false);
    const loadingBlocked = ref(false);
    const searching = ref(false);
    const loadingMoreFriends = ref(false);
    const loadingMoreIncoming = ref(false);
    const loadingMoreOutgoing = ref(false);
    const loadingMoreBlocked = ref(false);
    const loadingMoreSearch = ref(false);
    const acting = ref(false);
    const initialized = ref(false);
    const error = ref<string | null>(null);
    /** Deep-link notif : `?friendship=` à mettre en évidence / scroller. */
    const focusFriendshipPublicId = ref<string | null>(null);

    let unsubscribeNotifications: (() => void) | null = null;
    let unsubscribeFriendshipChanged: (() => void) | null = null;

    const friendsCount = computed(() => friendsTotalCount.value);
    const incomingCount = computed(() => incomingTotalCount.value);
    const outgoingCount = computed(() => outgoingTotalCount.value);
    const blockedCount = computed(() => blockedTotalCount.value);
    const canSearch = computed(() => searchQuery.value.trim().length >= 2);
    const hasMoreFriends = computed(() => friends.value.length < friendsTotalCount.value);
    const hasMoreIncoming = computed(() => incomingRequests.value.length < incomingTotalCount.value);
    const hasMoreOutgoing = computed(() => outgoingRequests.value.length < outgoingTotalCount.value);
    const hasMoreBlocked = computed(() => blockedUsers.value.length < blockedTotalCount.value);
    const hasMoreSearch = computed(() => searchResults.value.length < searchTotalCount.value);

    function clearError() {
        error.value = null;
    }

    function applyPageResult<T>(
        result: FriendsPageResult<T> | null | undefined,
        items: { value: T[] },
        page: { value: number },
        totalCount: { value: number },
        append: boolean
    ) {
        const nextItems = Array.isArray(result?.items) ? result.items : [];
        items.value = append ? [...items.value, ...nextItems] : nextItems;
        page.value = result?.page ?? (append ? page.value + 1 : 1);
        totalCount.value = result?.totalCount ?? nextItems.length;
    }

    async function loadFriends(force = false) {
        if (loadingFriends.value && !force) return;
        loadingFriends.value = true;
        clearError();
        try {
            const result = await friendsApi.list(1, DEFAULT_PAGE_SIZE);
            applyPageResult(result, friends, friendsPage, friendsTotalCount, false);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loadingFriends.value = false;
        }
    }

    async function loadMoreFriends() {
        if (!hasMoreFriends.value || loadingFriends.value || loadingMoreFriends.value) return;
        loadingMoreFriends.value = true;
        clearError();
        try {
            const result = await friendsApi.list(friendsPage.value + 1, DEFAULT_PAGE_SIZE);
            applyPageResult(result, friends, friendsPage, friendsTotalCount, true);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loadingMoreFriends.value = false;
        }
    }

    async function loadIncoming(force = false) {
        if (loadingIncoming.value && !force) return;
        loadingIncoming.value = true;
        clearError();
        try {
            const result = await friendsApi.incoming(1, DEFAULT_PAGE_SIZE);
            applyPageResult(result, incomingRequests, incomingPage, incomingTotalCount, false);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loadingIncoming.value = false;
        }
    }

    async function loadMoreIncoming() {
        if (!hasMoreIncoming.value || loadingIncoming.value || loadingMoreIncoming.value) return;
        loadingMoreIncoming.value = true;
        clearError();
        try {
            const result = await friendsApi.incoming(incomingPage.value + 1, DEFAULT_PAGE_SIZE);
            applyPageResult(result, incomingRequests, incomingPage, incomingTotalCount, true);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loadingMoreIncoming.value = false;
        }
    }

    async function loadOutgoing(force = false) {
        if (loadingOutgoing.value && !force) return;
        loadingOutgoing.value = true;
        clearError();
        try {
            const result = await friendsApi.outgoing(1, DEFAULT_PAGE_SIZE);
            applyPageResult(result, outgoingRequests, outgoingPage, outgoingTotalCount, false);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loadingOutgoing.value = false;
        }
    }

    async function loadMoreOutgoing() {
        if (!hasMoreOutgoing.value || loadingOutgoing.value || loadingMoreOutgoing.value) return;
        loadingMoreOutgoing.value = true;
        clearError();
        try {
            const result = await friendsApi.outgoing(outgoingPage.value + 1, DEFAULT_PAGE_SIZE);
            applyPageResult(result, outgoingRequests, outgoingPage, outgoingTotalCount, true);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loadingMoreOutgoing.value = false;
        }
    }

    async function loadBlocked(force = false) {
        if (loadingBlocked.value && !force) return;
        loadingBlocked.value = true;
        clearError();
        try {
            const result = await friendsApi.blocked(1, DEFAULT_PAGE_SIZE);
            applyPageResult(result, blockedUsers, blockedPage, blockedTotalCount, false);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loadingBlocked.value = false;
        }
    }

    async function loadMoreBlocked() {
        if (!hasMoreBlocked.value || loadingBlocked.value || loadingMoreBlocked.value) return;
        loadingMoreBlocked.value = true;
        clearError();
        try {
            const result = await friendsApi.blocked(blockedPage.value + 1, DEFAULT_PAGE_SIZE);
            applyPageResult(result, blockedUsers, blockedPage, blockedTotalCount, true);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
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
            error.value = e instanceof Error ? e.message : String(e);
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
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loadingMoreSearch.value = false;
        }
    }

    function clearSearch() {
        searchQuery.value = '';
        searchResults.value = [];
        searchPage.value = 1;
        searchTotalCount.value = 0;
    }

    function setFocusFriendship(friendshipPublicId: string | null) {
        focusFriendshipPublicId.value = friendshipPublicId?.trim() || null;
    }

    function isFocusedFriendship(friendshipPublicId: string) {
        return !!focusFriendshipPublicId.value && focusFriendshipPublicId.value === friendshipPublicId;
    }

    async function refreshAll() {
        await Promise.all([loadFriends(true), loadIncoming(true), loadOutgoing(true), loadBlocked(true)]);
    }

    async function sendRequest(recipientPublicId: string, message?: string) {
        acting.value = true;
        clearError();
        try {
            await friendsApi.sendRequest({ recipientPublicId, message: message?.trim() || null });
            await Promise.all([loadFriends(true), loadIncoming(true), loadOutgoing(true), searchUsers(searchQuery.value)]);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function acceptRequest(friendshipPublicId: string) {
        acting.value = true;
        clearError();
        try {
            await friendsApi.accept(friendshipPublicId);
            await Promise.all([loadFriends(true), loadIncoming(true), loadOutgoing(true)]);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function refuseRequest(friendshipPublicId: string) {
        acting.value = true;
        clearError();
        try {
            await friendsApi.refuse(friendshipPublicId);
            await loadIncoming(true);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function cancelRequest(friendshipPublicId: string) {
        acting.value = true;
        clearError();
        try {
            await friendsApi.cancel(friendshipPublicId);
            await Promise.all([loadOutgoing(true), searchUsers(searchQuery.value)]);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    function outgoingRequestFor(userPublicId: string) {
        return outgoingRequests.value.find((r) => r.otherUser.publicId === userPublicId && r.status === 'pending');
    }

    async function removeFriend(friendshipPublicId: string) {
        acting.value = true;
        clearError();
        try {
            await friendsApi.remove(friendshipPublicId);
            await loadFriends(true);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function blockUser(userPublicId: string) {
        acting.value = true;
        clearError();
        try {
            await friendsApi.block(userPublicId);
            await Promise.all([
                loadFriends(true),
                loadIncoming(true),
                loadOutgoing(true),
                loadBlocked(true),
                searchUsers(searchQuery.value)
            ]);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function unblockUser(userPublicId: string) {
        acting.value = true;
        clearError();
        try {
            await friendsApi.unblock(userPublicId);
            await Promise.all([loadBlocked(true), searchUsers(searchQuery.value)]);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    function refreshSearchIfNeeded() {
        if (searchQuery.value.trim().length < 2) return;
        void searchUsers(searchQuery.value);
    }

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

    function handleFriendshipChanged(payload: FriendshipChangedPayload) {
        if (payload.change === 'refused') {
            void loadOutgoing(true).then(() => refreshSearchIfNeeded());
            return;
        }
        if (payload.change === 'canceled') {
            void loadIncoming(true).then(() => refreshSearchIfNeeded());
            return;
        }
        if (payload.change === 'blocked') {
            void Promise.all([loadFriends(true), loadOutgoing(true), loadIncoming(true), loadBlocked(true)]).then(() => {
                refreshSearchIfNeeded();
            });
            return;
        }
        if (payload.change === 'removed') {
            void loadFriends(true);
        }
    }

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

    async function bootstrap() {
        ensureRealtimeBridge();
        if (!initialized.value) {
            await Promise.all([loadFriends(), loadIncoming(), loadOutgoing(), loadBlocked()]);
            initialized.value = true;
            return;
        }
        await refreshAll();
    }

    async function openTab(tab: 'Friends' | 'Requests' | 'Blocked' | 'Discover') {
        ensureRealtimeBridge();
        if (tab === 'Friends') {
            await loadFriends(true);
            return;
        }
        if (tab === 'Requests') {
            await Promise.all([loadIncoming(true), loadOutgoing(true)]);
            return;
        }
        if (tab === 'Blocked') {
            await loadBlocked(true);
            return;
        }
        if (tab === 'Discover') {
            await loadOutgoing(true);
            refreshSearchIfNeeded();
        }
    }

    function reset() {
        friends.value = [];
        incomingRequests.value = [];
        outgoingRequests.value = [];
        blockedUsers.value = [];
        searchResults.value = [];
        searchQuery.value = '';
        friendsPage.value = 1;
        incomingPage.value = 1;
        outgoingPage.value = 1;
        blockedPage.value = 1;
        searchPage.value = 1;
        friendsTotalCount.value = 0;
        incomingTotalCount.value = 0;
        outgoingTotalCount.value = 0;
        blockedTotalCount.value = 0;
        searchTotalCount.value = 0;
        loadingFriends.value = false;
        loadingIncoming.value = false;
        loadingOutgoing.value = false;
        loadingBlocked.value = false;
        searching.value = false;
        loadingMoreFriends.value = false;
        loadingMoreIncoming.value = false;
        loadingMoreOutgoing.value = false;
        loadingMoreBlocked.value = false;
        loadingMoreSearch.value = false;
        acting.value = false;
        initialized.value = false;
        error.value = null;
        focusFriendshipPublicId.value = null;
        unsubscribeNotifications?.();
        unsubscribeNotifications = null;
        unsubscribeFriendshipChanged?.();
        unsubscribeFriendshipChanged = null;
    }

    return {
        friends,
        incomingRequests,
        outgoingRequests,
        blockedUsers,
        searchResults,
        searchQuery,
        focusFriendshipPublicId,
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
        acting,
        initialized,
        error,
        friendsCount,
        incomingCount,
        outgoingCount,
        blockedCount,
        canSearch,
        hasMoreFriends,
        hasMoreIncoming,
        hasMoreOutgoing,
        hasMoreBlocked,
        hasMoreSearch,
        onAuthenticatedSession,
        bootstrap,
        openTab,
        refreshAll,
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
        setFocusFriendship,
        isFocusedFriendship,
        sendRequest,
        acceptRequest,
        refuseRequest,
        cancelRequest,
        outgoingRequestFor,
        removeFriend,
        blockUser,
        unblockUser,
        reset
    };
});
