import { useUserSettingsStore } from '@/features/user-settings';
import { isLiveChipType } from '@/features/notifications/friendChip';
import { isAccountShareNotificationType, isFriendNotificationType, isSecurityNotificationType } from '@/features/notifications/link';
import { showNativeNotification } from '@/features/notifications/native-notify';
import type { AppNotification } from '@/features/notifications/types';
import type { NotificationsState } from '@/features/notifications/stores/internal/notifications-state';

const LIVE_CHIP_DISMISS_MS = 8000;

/**
 * Notifications OS (Tauri) et chips live in-app.
 * @param state État partagé du store.
 * @returns Les helpers chips / OS notify.
 */
export function createNotificationsNative(state: NotificationsState) {
    const { liveFriendChips } = state;
    const liveChipTimers = new Map<string, ReturnType<typeof setTimeout>>();

    /**
     * Gate prefs push (`pushNotifications` + sous-préférences).
     * Chips live in-app + notifications OS (Tauri). N’affecte pas l’inbox / badge / listes amis.
     */
    function shouldShowLiveChip(type: string): boolean {
        const settings = useUserSettingsStore().current;
        if (!settings.pushNotifications) return false;
        if (isSecurityNotificationType(type) && !settings.pushSecurityAlerts) return false;
        if (isFriendNotificationType(type) && !settings.pushFriendRequest) return false;
        if (isAccountShareNotificationType(type) && !settings.pushFinancialAlerts) return false;
        // Types finance futurs — coupe le chip / OS notify si désactivé.
        if (type.toLowerCase().includes('financial') && !settings.pushFinancialAlerts) return false;
        return true;
    }

    /**
     * Affiche une notification OS native si les prefs push le permettent.
     * @param notification Notification source.
     */
    function maybeShowNativeOsNotification(notification: AppNotification) {
        if (!shouldShowLiveChip(String(notification.type))) return;
        void showNativeNotification(notification);
    }

    /**
     * Retire un chip live par clé.
     * @param key Clé du chip.
     */
    function dismissLiveFriendChip(key: string) {
        const timer = liveChipTimers.get(key);
        if (timer) {
            clearTimeout(timer);
            liveChipTimers.delete(key);
        }
        liveFriendChips.value = liveFriendChips.value.filter((chip) => chip.key !== key);
    }

    /**
     * Retire tous les chips liés à une notification.
     * @param notificationId Id de la notification.
     */
    function dismissLiveFriendChipsByNotificationId(notificationId: number) {
        liveFriendChips.value.filter((chip) => chip.notification.id === notificationId).forEach((chip) => dismissLiveFriendChip(chip.key));
    }

    /** Vide tous les chips live et leurs timers. */
    function clearLiveFriendChips() {
        liveChipTimers.forEach((timer) => clearTimeout(timer));
        liveChipTimers.clear();
        liveFriendChips.value = [];
    }

    /**
     * Ajoute un chip live temporaire (auto-dismiss).
     * @param notification Notification source.
     */
    function pushLiveFriendChip(notification: AppNotification) {
        if (!isLiveChipType(String(notification.type))) return;
        if (notification.isRead) return;
        if (!shouldShowLiveChip(String(notification.type))) return;

        const key = `${notification.id}-${Date.now()}`;
        liveFriendChips.value = [...liveFriendChips.value, { key, notification }];
        const timer = setTimeout(() => dismissLiveFriendChip(key), LIVE_CHIP_DISMISS_MS);
        liveChipTimers.set(key, timer);
    }

    return {
        shouldShowLiveChip,
        maybeShowNativeOsNotification,
        dismissLiveFriendChip,
        dismissLiveFriendChipsByNotificationId,
        clearLiveFriendChips,
        pushLiveFriendChip
    };
}

export type NotificationsNative = ReturnType<typeof createNotificationsNative>;
