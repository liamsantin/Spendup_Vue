import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useNotificationsStore } from '@/features/notifications';
import type { AppNotification } from '@/features/notifications';
import { friendsApi } from '../api';
import type { BlockedFriendItem, FriendItem, FriendRequestItem, FriendSearchItem } from '../types';

const DEFAULT_PAGE_SIZE = 20;

export const useFriendsStore = defineStore('friends', () => {
    const friends = ref<FriendItem[]>([]);
    const incomingRequests = ref<FriendRequestItem[]>([]);
    const outgoingRequests = ref<FriendRequestItem[]>([]);
    const blockedUsers = ref<BlockedFriendItem[]>([]);
    const searchResults = ref<FriendSearchItem[]>([]);
    const searchQuery = ref('');
    const loadingFriends = ref(false);
    const loadingIncoming = ref(false);
    const loadingOutgoing = ref(false);
    const loadingBlocked = ref(false);
    const searching = ref(false);
    const acting = ref(false);
    const initialized = ref(false);
    const error = ref<string | null>(null);

    let unsubscribe: (() => void) | null = null;

    const friendsCount = computed(() => friends.value.length);
    const incomingCount = computed(() => incomingRequests.value.length);
    const outgoingCount = computed(() => outgoingRequests.value.length);
    const blockedCount = computed(() => blockedUsers.value.length);
    const canSearch = computed(() => searchQuery.value.trim().length >= 2);

    function clearError() {
        error.value = null;
    }

    async function loadFriends(force = false) {
        if (loadingFriends.value && !force) return;
        loadingFriends.value = true;
        clearError();
        try {
            const result = await friendsApi.list(1, DEFAULT_PAGE_SIZE);
            friends.value = Array.isArray(result?.items) ? result.items : [];
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loadingFriends.value = false;
        }
    }

    async function loadIncoming(force = false) {
        if (loadingIncoming.value && !force) return;
        loadingIncoming.value = true;
        clearError();
        try {
            const result = await friendsApi.incoming(1, DEFAULT_PAGE_SIZE);
            incomingRequests.value = Array.isArray(result?.items) ? result.items : [];
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loadingIncoming.value = false;
        }
    }

    async function loadOutgoing(force = false) {
        if (loadingOutgoing.value && !force) return;
        loadingOutgoing.value = true;
        clearError();
        try {
            const result = await friendsApi.outgoing(1, DEFAULT_PAGE_SIZE);
            outgoingRequests.value = Array.isArray(result?.items) ? result.items : [];
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loadingOutgoing.value = false;
        }
    }

    async function loadBlocked(force = false) {
        if (loadingBlocked.value && !force) return;
        loadingBlocked.value = true;
        clearError();
        try {
            const result = await friendsApi.blocked(1, DEFAULT_PAGE_SIZE);
            blockedUsers.value = Array.isArray(result?.items) ? result.items : [];
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loadingBlocked.value = false;
        }
    }

    async function searchUsers(q = searchQuery.value) {
        searchQuery.value = q;
        const trimmed = q.trim();
        if (trimmed.length < 2) {
            searchResults.value = [];
            return;
        }

        searching.value = true;
        clearError();
        try {
            const result = await friendsApi.search({ q: trimmed, page: 1, pageSize: DEFAULT_PAGE_SIZE });
            searchResults.value = Array.isArray(result?.items) ? result.items : [];
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            searching.value = false;
        }
    }

    function clearSearch() {
        searchQuery.value = '';
        searchResults.value = [];
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
            return;
        }
        // Refus / annulation : retire la demande côté émetteur / destinataire + maj Découvrir.
        if (notification.type === 'friendRefused' || notification.type === 'friendCanceled') {
            void Promise.all([loadOutgoing(true), loadIncoming(true)]).then(() => {
                refreshSearchIfNeeded();
            });
            return;
        }
        // Suppression d’ami : retire de « Mes amis » + maj Découvrir.
        if (notification.type === 'friendRemoved') {
            void Promise.all([loadFriends(true), loadOutgoing(true), loadIncoming(true)]).then(() => {
                refreshSearchIfNeeded();
            });
        }
    }

    function ensureRealtimeBridge() {
        if (unsubscribe) return;
        unsubscribe = useNotificationsStore().subscribeToFriendNotifications(handleRealtime);
    }

    async function bootstrap() {
        ensureRealtimeBridge();
        if (!initialized.value) {
            await Promise.all([loadFriends(), loadIncoming(), loadOutgoing(), loadBlocked()]);
            initialized.value = true;
            return;
        }
        // Revenir sur la page Amis → données à jour (ex. nouvelle photo d’un autre user).
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
        loadingFriends.value = false;
        loadingIncoming.value = false;
        loadingOutgoing.value = false;
        loadingBlocked.value = false;
        searching.value = false;
        acting.value = false;
        initialized.value = false;
        error.value = null;
        unsubscribe?.();
        unsubscribe = null;
    }

    return {
        friends,
        incomingRequests,
        outgoingRequests,
        blockedUsers,
        searchResults,
        searchQuery,
        loadingFriends,
        loadingIncoming,
        loadingOutgoing,
        loadingBlocked,
        searching,
        acting,
        initialized,
        error,
        friendsCount,
        incomingCount,
        outgoingCount,
        blockedCount,
        canSearch,
        bootstrap,
        openTab,
        refreshAll,
        loadFriends,
        loadIncoming,
        loadOutgoing,
        loadBlocked,
        searchUsers,
        clearSearch,
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
