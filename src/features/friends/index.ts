export { friendsApi } from './api';
export { useFriendsStore } from './stores/friends-store';
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
export { default as FriendListItem } from './components/FriendListItem.vue';
export { default as FriendsTab } from './components/FriendsTab.vue';
export { default as RequestsTab } from './components/RequestsTab.vue';
export { default as DiscoverFriendsTab } from './components/DiscoverFriendsTab.vue';
export { default as BlockedUsersTab } from './components/BlockedUsersTab.vue';
