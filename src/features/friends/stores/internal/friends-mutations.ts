import { friendsApi } from '@/features/friends/api';
import type { FriendsState } from '@/features/friends/stores/internal/friends-state';
import type { FriendsLists } from '@/features/friends/stores/internal/friends-lists';

/**
 * Mutations métier amis (requêtes, accept/refuse, block…).
 * @param state État partagé du store.
 * @param lists Actions de chargement pour rafraîchir après mutation.
 * @returns Les actions de mutation.
 */
export function createFriendsMutations(state: FriendsState, lists: FriendsLists) {
    const { acting, clearError, searchQuery } = state;
    const { loadFriends, loadIncoming, loadOutgoing, loadBlocked, searchUsers } = lists;

    /**
     * Envoie une demande d’ami.
     * @param recipientPublicId Identifiant public du destinataire.
     * @param message Message optionnel joint à la demande.
     */
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

    /**
     * Accepte une demande entrante.
     * @param friendshipPublicId Identifiant public de l’amitié.
     */
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

    /**
     * Refuse une demande entrante.
     * @param friendshipPublicId Identifiant public de l’amitié.
     */
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

    /**
     * Annule une demande sortante.
     * @param friendshipPublicId Identifiant public de l’amitié.
     */
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

    /**
     * Retire un ami.
     * @param friendshipPublicId Identifiant public de l’amitié.
     */
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

    /**
     * Bloque un utilisateur.
     * @param userPublicId Identifiant public de l’utilisateur à bloquer.
     */
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

    /**
     * Débloque un utilisateur.
     * @param userPublicId Identifiant public de l’utilisateur à débloquer.
     */
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
