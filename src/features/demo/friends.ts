import type { BlockedFriendItem, FriendItem, FriendRequestItem, FriendSearchItem, FriendshipStatus } from '@/features/friends/types';

export type DemoFriend = {
    userPublicId: string;
    username: string;
    firstName: string;
    name: string;
    profilePicture: string;
    friendshipPublicId: string | null;
    status: FriendshipStatus | null;
    /** `incoming` = l’autre a écrit à Camille. `outgoing` = Camille a écrit. */
    direction: 'incoming' | 'outgoing' | null;
    nickname: string | null;
    friendsSince: string | null;
    message: string | null;
    requestedAt: string | null;
    respondedAt: string | null;
    blockedAt: string | null;
};

function person(input: {
    userPublicId: string;
    username: string;
    firstName: string;
    name: string;
    profilePicture: string;
    status?: FriendshipStatus | null;
    friendshipPublicId?: string | null;
    nickname?: string | null;
    friendsSince?: string | null;
    message?: string | null;
    requestedAt?: string | null;
    direction?: 'incoming' | 'outgoing' | null;
}): DemoFriend {
    return {
        userPublicId: input.userPublicId,
        username: input.username,
        firstName: input.firstName,
        name: input.name,
        profilePicture: input.profilePicture,
        friendshipPublicId: input.friendshipPublicId ?? null,
        status: input.status ?? null,
        direction: input.direction ?? null,
        nickname: input.nickname ?? null,
        friendsSince: input.friendsSince ?? null,
        message: input.message ?? null,
        requestedAt: input.requestedAt ?? null,
        respondedAt: null,
        blockedAt: null
    };
}

export function seedFriends(): DemoFriend[] {
    return [
        person({
            userPublicId: 'FRDMARC',
            username: 'marc',
            firstName: 'Marc',
            name: 'Engel',
            profilePicture: '/avatar/user-1',
            status: 'accepted',
            friendshipPublicId: 'FRIMARC',
            friendsSince: '2025-03-12T10:00:00.000Z'
        }),
        person({
            userPublicId: 'FRDCHLO',
            username: 'chloe',
            firstName: 'Chloé',
            name: 'Nguyen',
            profilePicture: '/avatar/user-2',
            status: 'accepted',
            friendshipPublicId: 'FRICHLO',
            nickname: 'Chlo',
            friendsSince: '2024-11-02T10:00:00.000Z'
        }),
        person({
            userPublicId: 'FRDADAM',
            username: 'adam',
            firstName: 'Adam',
            name: 'Rossi',
            profilePicture: '/avatar/user-3',
            status: 'accepted',
            friendshipPublicId: 'FRIADAM',
            nickname: 'Adam bureau',
            friendsSince: '2026-01-20T10:00:00.000Z'
        }),
        person({
            userPublicId: 'FRDELEN',
            username: 'elena',
            firstName: 'Elena',
            name: 'Vogel',
            profilePicture: '/avatar/user-4',
            status: 'pending',
            direction: 'incoming',
            friendshipPublicId: 'FRIELEN',
            requestedAt: '2026-11-12T18:30:00.000Z'
        }),
        person({
            userPublicId: 'FRDPAUL',
            username: 'paul',
            firstName: 'Paul',
            name: 'Aubert',
            profilePicture: '/avatar/user-5',
            status: 'pending',
            direction: 'incoming',
            friendshipPublicId: 'FRIPAUL',
            message: null,
            requestedAt: '2026-11-10T09:15:00.000Z'
        }),
        person({
            userPublicId: 'FRDSARA',
            username: 'sarah',
            firstName: 'Sarah',
            name: 'Lindt',
            profilePicture: '/avatar/user-6',
            status: 'pending',
            direction: 'outgoing',
            friendshipPublicId: 'FRISARA',
            requestedAt: '2026-11-08T14:00:00.000Z'
        }),
        person({
            userPublicId: 'FRDLEAM',
            username: 'lea',
            firstName: 'Léa',
            name: 'Morel',
            profilePicture: '/avatar/user-7'
        }),
        person({
            userPublicId: 'FRDNOAH',
            username: 'noah',
            firstName: 'Noah',
            name: 'Keller',
            profilePicture: '/avatar/user-8'
        }),
        person({
            userPublicId: 'FRDINES',
            username: 'ines',
            firstName: 'Inès',
            name: 'Barbosa',
            profilePicture: '/avatar/user-9'
        }),
        person({
            userPublicId: 'FRDJULI',
            username: 'julien',
            firstName: 'Julien',
            name: 'Favre',
            profilePicture: '/avatar/user-10'
        }),
        person({
            userPublicId: 'FRDSOFI',
            username: 'sofia',
            firstName: 'Sofia',
            name: 'Meier',
            profilePicture: '/avatar/user-11'
        })
    ];
}

function userOf(friend: DemoFriend) {
    return {
        publicId: friend.userPublicId,
        username: friend.username,
        firstName: friend.firstName,
        name: friend.name,
        profilePicture: friend.profilePicture
    };
}

export function toFriendItem(friend: DemoFriend): FriendItem {
    return {
        friendshipPublicId: friend.friendshipPublicId ?? '',
        user: userOf(friend),
        nickname: friend.nickname,
        friendsSince: friend.friendsSince ?? new Date().toISOString()
    };
}

export function toRequestItem(friend: DemoFriend): FriendRequestItem {
    return {
        friendshipPublicId: friend.friendshipPublicId ?? '',
        status: friend.status ?? 'pending',
        message: friend.message,
        requestedAt: friend.requestedAt ?? new Date().toISOString(),
        respondedAt: friend.respondedAt,
        otherUser: userOf(friend)
    };
}

export function toBlockedItem(friend: DemoFriend): BlockedFriendItem {
    return {
        friendshipPublicId: friend.friendshipPublicId ?? '',
        user: userOf(friend),
        blockedAt: friend.blockedAt ?? new Date().toISOString()
    };
}

export function toSearchItem(friend: DemoFriend): FriendSearchItem {
    return {
        ...userOf(friend),
        friendshipStatus: friend.status === 'accepted' || friend.status === 'pending' || friend.status === 'blocked' ? friend.status : null
    };
}

function fold(value: string): string {
    return value
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
}

export function matchesFriendSearch(friend: DemoFriend, q: string): boolean {
    const needle = fold(q.trim());
    if (needle.length < 2) return false;
    const haystack = fold(`${friend.firstName} ${friend.name} ${friend.username}`);
    return haystack.includes(needle);
}
