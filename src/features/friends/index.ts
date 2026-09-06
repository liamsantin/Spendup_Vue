export { friendsApi } from '@/features/friends/api';
export {
    getFriendDisplayName,
    getFriendProfileLabel,
    getFriendDisplayNameFromItem,
    resolveLabeledName,
    buildFriendNicknameByUserId
} from '@/features/friends/display-name';
export { FRIEND_NICKNAME_MAX_LENGTH, normalizeFriendNickname, validateFriendNickname } from '@/features/friends/nickname';
export { listAllFriends, FRIENDS_LIST_ALL_PAGE_SIZE, FRIENDS_LIST_ALL_MAX_PAGES } from '@/features/friends/list-all';
export { useFriendsStore } from '@/features/friends/stores/friends-store';
export {
    resolveFriendAvatarSrc,
    needsUserAvatarFetch,
    extractPublicIdFromUserAvatarPath,
    DEFAULT_AVATAR_SRC
} from '@/features/friends/profilePicture';
export { useFriendAvatarUrl } from '@/features/friends/composables/useFriendAvatarUrl';
export {
    useFriendNicknameLabels,
    invalidateFriendNicknameLabelsCache
} from '@/features/friends/composables/useFriendNicknameLabels';
export type {
    FriendshipStatus,
    FriendUser,
    FriendItem,
    FriendRequestItem,
    BlockedFriendItem,
    FriendSearchItem,
    FriendsPageResult,
    FriendSearchQuery,
    SendFriendRequestPayload,
    UpdateFriendNicknamePayload
} from '@/features/friends/types';
export { buildFriendQrPayload, parseFriendQrPayload, isValidPublicId, normalizePublicId } from '@/features/friends/qr';
export { default as FriendListItem } from '@/features/friends/components/FriendListItem.vue';
export { default as FriendNicknameModal } from '@/features/friends/components/FriendNicknameModal.vue';
export { default as UserPhotoAvatar } from '@/features/friends/components/UserPhotoAvatar.vue';
export { default as DiscoverSearchBar } from '@/features/friends/components/DiscoverSearchBar.vue';
export { default as FriendQrModal } from '@/features/friends/components/FriendQrModal.vue';
export { default as FriendsTab } from '@/features/friends/components/FriendsTab.vue';
export { default as RequestsTab } from '@/features/friends/components/RequestsTab.vue';
export { default as DiscoverFriendsTab } from '@/features/friends/components/DiscoverFriendsTab.vue';
export { default as BlockedUsersTab } from '@/features/friends/components/BlockedUsersTab.vue';
