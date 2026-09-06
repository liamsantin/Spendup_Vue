import type { FriendItem, FriendUser } from '@/features/friends/types';

/**
 * Libellé d’affichage prioritaire pour un ami accepté (surnom personnel → profil).
 */
export function getFriendDisplayName(user: FriendUser, nickname?: string | null): string {
    const trimmedNickname = nickname?.trim();
    if (trimmedNickname) return trimmedNickname;
    return (
        user.username ||
        [user.firstName, user.name].filter(Boolean).join(' ').trim() ||
        user.publicId
    );
}

/** Nom de profil sans surnom (username → nom complet → publicId). */
export function getFriendProfileLabel(user: FriendUser): string {
    return (
        user.username ||
        [user.firstName, user.name].filter(Boolean).join(' ').trim() ||
        user.publicId
    );
}

export function getFriendDisplayNameFromItem(friend: FriendItem): string {
    return getFriendDisplayName(friend.user, friend.nickname);
}

/** Surnom trimé s’il est défini, sinon le libellé API / profil fourni. */
export function resolveLabeledName(fallback: string, nickname?: string | null): string {
    const trimmedNickname = nickname?.trim();
    return trimmedNickname || fallback;
}

/** Index `userPublicId → surnom` pour les amis qui en ont un. */
export function buildFriendNicknameByUserId(
    friends: Array<{ user: { publicId: string }; nickname?: string | null }>
): Map<string, string> {
    const map = new Map<string, string>();
    for (const friend of friends) {
        const nickname = friend.nickname?.trim();
        if (nickname && friend.user.publicId) {
            map.set(friend.user.publicId, nickname);
        }
    }
    return map;
}
