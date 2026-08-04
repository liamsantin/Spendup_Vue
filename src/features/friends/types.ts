export type FriendshipStatus = 'pending' | 'accepted' | 'refused' | 'canceled' | 'blocked';

export type FriendUser = {
    publicId: string;
    username: string | null;
    firstName: string | null;
    name: string | null;
    /**
     * Catalogue (`/avatar/…`), chemin relatif servi par l’API (`/uploads/…`),
     * URL absolue, hash upload (64 hex), ou `null`.
     */
    profilePicture: string | null;
};

export type FriendItem = {
    friendshipPublicId: string;
    user: FriendUser;
    friendsSince: string;
};

export type FriendRequestItem = {
    friendshipPublicId: string;
    status: FriendshipStatus;
    message: string | null;
    requestedAt: string;
    respondedAt: string | null;
    otherUser: FriendUser;
};

export type BlockedFriendItem = {
    friendshipPublicId: string;
    user: FriendUser;
    blockedAt: string;
};

export type FriendSearchItem = FriendUser & {
    friendshipStatus: FriendshipStatus | null;
};

export type FriendsPageResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    totalCount: number;
};

export type FriendSearchQuery = {
    q: string;
    page?: number;
    pageSize?: number;
};

export type SendFriendRequestPayload = {
    recipientPublicId: string;
    message?: string | null;
};
