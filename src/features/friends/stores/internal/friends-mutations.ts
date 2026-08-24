import { friendsApi } from '../../api';
import type { FriendsState } from './friends-state';
import type { FriendsLists } from './friends-lists';

/**
 * Mutations métier amis (requêtes, accept/refuse, block…).
 */
export function createFriendsMutations(state: FriendsState, lists: FriendsLists) {
    const { acting, clearError, searchQuery } = state;
    const { loadFriends, loadIncoming, loadOutgoing, loadBlocked, searchUsers } = lists;

    async function sendRequest(recipientPublicId: string, message?: string) {
        acting.value = true;
        clearError();
        try {
            await friendsApi.sendRequest({ recipientPublicId, message: message?.trim() || null });
            await Promise.all([loadFriends(true), loadIncoming(true), loadOutgoing(true), searchUsers(searchQuery.value)]);
        } catch (e: unknown) {
            state.error.value = e instanceof Error ? e.message : String(e);
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
            state.error.value = e instanceof Error ? e.message : String(e);
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
            state.error.value = e instanceof Error ? e.message : String(e);
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
            state.error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function removeFriend(friendshipPublicId: string) {
        acting.value = true;
        clearError();
        try {
            await friendsApi.remove(friendshipPublicId);
            await loadFriends(true);
        } catch (e: unknown) {
            state.error.value = e instanceof Error ? e.message : String(e);
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
            state.error.value = e instanceof Error ? e.message : String(e);
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
            state.error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    return {
        sendRequest,
        acceptRequest,
        refuseRequest,
        cancelRequest,
        removeFriend,
        blockUser,
        unblockUser
    };
}
