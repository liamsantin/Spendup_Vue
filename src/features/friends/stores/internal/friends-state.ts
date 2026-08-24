import { computed, ref } from 'vue';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import type { BlockedFriendItem, FriendItem, FriendRequestItem, FriendSearchItem, FriendsPageResult } from '../../types';

export const FRIENDS_LIST_MAX_AGE_MS = 60_000;
export const DEFAULT_PAGE_SIZE = 20;

export const KEY_FRIENDS = 'friends';
export const KEY_INCOMING = 'incoming';
export const KEY_OUTGOING = 'outgoing';
export const KEY_BLOCKED = 'blocked';

/**
 * Crée l’état partagé du store amis (refs, cache, helpers locaux).
 */
export function createFriendsState() {
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

    const cache = createResourceCache({ defaultMaxAgeMs: FRIENDS_LIST_MAX_AGE_MS });

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

    function setFocusFriendship(friendshipPublicId: string | null) {
        focusFriendshipPublicId.value = friendshipPublicId?.trim() || null;
    }

    function isFocusedFriendship(friendshipPublicId: string) {
        return !!focusFriendshipPublicId.value && focusFriendshipPublicId.value === friendshipPublicId;
    }

    function outgoingRequestFor(userPublicId: string) {
        return outgoingRequests.value.find((r) => r.otherUser.publicId === userPublicId && r.status === 'pending');
    }

    function clearSearch() {
        searchQuery.value = '';
        searchResults.value = [];
        searchPage.value = 1;
        searchTotalCount.value = 0;
    }

    function resetListState() {
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
    }

    return {
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
        acting,
        initialized,
        error,
        focusFriendshipPublicId,
        cache,
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
        clearError,
        applyPageResult,
        setFocusFriendship,
        isFocusedFriendship,
        outgoingRequestFor,
        clearSearch,
        resetListState
    };
}

export type FriendsState = ReturnType<typeof createFriendsState>;
