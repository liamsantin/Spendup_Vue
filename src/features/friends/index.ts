export { friendsApi } from './api';
export { useFriendsStore } from './stores/friends-store';
export { resolveFriendAvatarSrc, needsUserAvatarFetch, extractPublicIdFromUserAvatarPath, DEFAULT_AVATAR_SRC } from './profilePicture';
export { useFriendAvatarUrl } from './composables/useFriendAvatarUrl';
export type {
    FriendshipStatus,
    FriendUser,
    FriendItem,
    FriendRequestItem,
    BlockedFriendItem,
    FriendSearchItem,
    FriendsPageResult,
    FriendSearchQuery,
    SendFriendRequestPayload
} from './types';
export { buildFriendQrPayload, parseFriendQrPayload, isValidPublicId, normalizePublicId } from './qr';
export { default as FriendListItem } from './components/FriendListItem.vue';
export { default as UserPhotoAvatar } from './components/UserPhotoAvatar.vue';
export { default as DiscoverSearchBar } from './components/DiscoverSearchBar.vue';
export { default as FriendQrModal } from './components/FriendQrModal.vue';
export { default as FriendsTab } from './components/FriendsTab.vue';
export { default as RequestsTab } from './components/RequestsTab.vue';
export { default as DiscoverFriendsTab } from './components/DiscoverFriendsTab.vue';
export { default as BlockedUsersTab } from './components/BlockedUsersTab.vue';
