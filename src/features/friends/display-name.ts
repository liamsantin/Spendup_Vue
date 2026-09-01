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
