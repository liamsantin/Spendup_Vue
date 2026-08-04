import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type {
    BlockedFriendItem,
    FriendItem,
    FriendRequestItem,
    FriendSearchItem,
    FriendSearchQuery,
    FriendsPageResult,
    SendFriendRequestPayload
} from './types';

function toQuery(params: Record<string, string | number | boolean | null | undefined>): string {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value == null || value === '') return;
        search.set(key, String(value));
    });
    const qs = search.toString();
    return qs ? `?${qs}` : '';
}

export const friendsApi = {
    list(page = 1, pageSize = 20) {
        return fetchWrapper.get(`/api/friends${toQuery({ page, pageSize })}`) as Promise<FriendsPageResult<FriendItem>>;
    },

    incoming(page = 1, pageSize = 20) {
        return fetchWrapper.get(`/api/friends/requests/incoming${toQuery({ page, pageSize })}`) as Promise<
            FriendsPageResult<FriendRequestItem>
        >;
    },

    outgoing(page = 1, pageSize = 20) {
        return fetchWrapper.get(`/api/friends/requests/outgoing${toQuery({ page, pageSize })}`) as Promise<
            FriendsPageResult<FriendRequestItem>
        >;
    },

    blocked(page = 1, pageSize = 20) {
        return fetchWrapper.get(`/api/friends/blocked${toQuery({ page, pageSize })}`) as Promise<FriendsPageResult<BlockedFriendItem>>;
    },

    search(params: FriendSearchQuery) {
        return fetchWrapper.get(
            `/api/friends/search${toQuery({ q: params.q, page: params.page ?? 1, pageSize: params.pageSize ?? 20 })}`
        ) as Promise<FriendsPageResult<FriendSearchItem>>;
    },

    sendRequest(body: SendFriendRequestPayload) {
        return fetchWrapper.post('/api/friends/requests', body) as Promise<FriendRequestItem>;
    },

    accept(friendshipPublicId: string) {
        return fetchWrapper.post(`/api/friends/requests/${friendshipPublicId}/accept`) as Promise<void>;
    },

    refuse(friendshipPublicId: string) {
        return fetchWrapper.post(`/api/friends/requests/${friendshipPublicId}/refuse`) as Promise<void>;
    },

    cancel(friendshipPublicId: string) {
        return fetchWrapper.post(`/api/friends/requests/${friendshipPublicId}/cancel`) as Promise<void>;
    },

    remove(friendshipPublicId: string) {
        return fetchWrapper.delete(`/api/friends/${friendshipPublicId}`) as Promise<void>;
    },

    block(userPublicId: string) {
        return fetchWrapper.post(`/api/friends/${userPublicId}/block`) as Promise<void>;
    },

    unblock(userPublicId: string) {
        return fetchWrapper.delete(`/api/friends/${userPublicId}/block`) as Promise<void>;
    }
};
