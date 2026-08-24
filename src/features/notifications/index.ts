export { notificationsApi } from '@/features/notifications/api';
export { useNotificationsStore } from '@/features/notifications/stores/notifications-store';
export {
    resolveNotificationLink,
    isSafeAppNotificationPath,
    isSecurityNotificationType,
    isFriendNotificationType,
    isAccountShareNotificationType
} from '@/features/notifications/link';
export { friendLiveChipColor, isAccountShareLiveChipType, isFriendLiveChipType, isLiveChipType } from '@/features/notifications/friendChip';
export {
    parseNotificationMetadata,
    getFriendshipPublicId,
    getAccountSharePublicId,
    normalizeAppNotification
} from '@/features/notifications/normalize';
export {
    ensureNativeNotificationPermission,
    setNativeNotificationNavigate,
    showNativeNotification
} from '@/features/notifications/native-notify';
export { default as InboxTab } from '@/features/notifications/components/InboxTab.vue';
export { default as FriendLiveChips } from '@/features/notifications/components/FriendLiveChips.vue';
export type {
    AppNotification,
    NotificationType,
    NotificationsListResult,
    UnreadCountResult,
    MarkAllReadResult,
    DeleteAllNotificationsResult,
    NotificationConnectedPayload,
    NotificationReceivedPayload,
    FriendshipChange,
    FriendshipChangedPayload,
    InboxClearedPayload,
    SessionEndedPayload,
    NotificationsListQuery
} from '@/features/notifications/types';
