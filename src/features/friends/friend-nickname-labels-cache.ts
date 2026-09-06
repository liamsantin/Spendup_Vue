import { shallowRef } from 'vue';

export const NICKNAME_LABELS_TTL_MS = 60_000;

export const cachedFriendNicknames = shallowRef(new Map<string, string>());
export let friendNicknameLabelsLoadedAt = 0;
export let friendNicknameLabelsInflight: Promise<void> | null = null;

/** Invalide le cache partagé (logout / tests). */
export function invalidateFriendNicknameLabelsCache() {
    friendNicknameLabelsLoadedAt = 0;
    cachedFriendNicknames.value = new Map();
    friendNicknameLabelsInflight = null;
}

export function markFriendNicknameLabelsLoaded(map: Map<string, string>) {
    cachedFriendNicknames.value = map;
    friendNicknameLabelsLoadedAt = Date.now();
}

export function setFriendNicknameLabelsInflight(promise: Promise<void> | null) {
    friendNicknameLabelsInflight = promise;
}
