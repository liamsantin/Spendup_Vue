import { computed } from 'vue';
import { buildFriendNicknameByUserId, resolveLabeledName } from '@/features/friends/display-name';
import {
    NICKNAME_LABELS_TTL_MS,
    cachedFriendNicknames,
    friendNicknameLabelsInflight,
    friendNicknameLabelsLoadedAt,
    markFriendNicknameLabelsLoaded,
    setFriendNicknameLabelsInflight
} from '@/features/friends/friend-nickname-labels-cache';
import { listAllFriends } from '@/features/friends/list-all';
import { useFriendsStore } from '@/features/friends/stores/friends-store';

export { invalidateFriendNicknameLabelsCache } from '@/features/friends/friend-nickname-labels-cache';

/**
 * Libellés d’affichage avec surnom ami (partages, invitations, etc.).
 * Cache `listAllFriends` + fusion réactive avec le store amis.
 */
export function useFriendNicknameLabels() {
    const friendsStore = useFriendsStore();

    const nicknameByUserId = computed(() => {
        const map = new Map(cachedFriendNicknames.value);
        for (const friend of friendsStore.friends) {
            const nickname = friend.nickname?.trim();
            if (nickname) {
                map.set(friend.user.publicId, nickname);
            } else {
                map.delete(friend.user.publicId);
            }
        }
        return map;
    });

    async function ensureLoaded(options?: { force?: boolean }) {
        const force = options?.force === true;
        if (!force && friendNicknameLabelsLoadedAt > 0 && Date.now() - friendNicknameLabelsLoadedAt < NICKNAME_LABELS_TTL_MS) {
            return;
        }
        if (friendNicknameLabelsInflight) return friendNicknameLabelsInflight;
        const promise = (async () => {
            try {
                const friends = await listAllFriends();
                markFriendNicknameLabelsLoaded(buildFriendNicknameByUserId(friends));
            } finally {
                setFriendNicknameLabelsInflight(null);
            }
        })();
        setFriendNicknameLabelsInflight(promise);
        return promise;
    }

    function labelFor(userPublicId: string | null | undefined, fallback: string): string {
        if (!userPublicId) return fallback;
        return resolveLabeledName(fallback, nicknameByUserId.value.get(userPublicId) ?? null);
    }

    return { ensureLoaded, labelFor, nicknameByUserId };
}
