import { computed, ref } from 'vue';
import type { AppNotification, AccountChangedPayload, FriendshipChangedPayload } from '@/features/notifications/types';

export const DEFAULT_PAGE_SIZE = 20;

export type LiveFriendChip = {
    key: string;
    notification: AppNotification;
};

/**
 * Crée l’état partagé du store notifications (refs, computeds, helpers locaux).
 * @returns L’état et les helpers locaux du store.
 */
export function createNotificationsState() {
    const items = ref<AppNotification[]>([]);
    const unreadCount = ref(0);
    const page = ref(1);
    const pageSize = ref(DEFAULT_PAGE_SIZE);
    const totalCount = ref(0);
    const loading = ref(false);
    const loadingMore = ref(false);
    const markingAll = ref(false);
    const clearingAll = ref(false);
    const inboxLoaded = ref(false);
    const error = ref<string | null>(null);
    const hubConnected = ref(false);
    const friendListeners = new Set<(notification: AppNotification) => void>();
    const accountShareListeners = new Set<(notification: AppNotification) => void>();
    const friendshipChangeListeners = new Set<(payload: FriendshipChangedPayload) => void>();
    const accountChangeListeners = new Set<(payload: AccountChangedPayload) => void>();
    const liveFriendChips = ref<LiveFriendChip[]>([]);

    const hasUnread = computed(() => unreadCount.value > 0);
    /** Contenu badge Vuetify (`undefined` si aucun non lu). */
    const badgeContent = computed(() => (unreadCount.value > 0 ? unreadCount.value : undefined));
    const hasMore = computed(() => items.value.length < totalCount.value);
    const hasItems = computed(() => items.value.length > 0 || totalCount.value > 0 || unreadCount.value > 0);

    /**
     * Applique le compteur non lus (plancher à 0).
     * @param count Valeur serveur / SignalR.
     */
    function applyUnreadCount(count: number) {
        unreadCount.value = Math.max(0, Number.isFinite(count) ? count : 0);
    }

    /**
     * Insère ou met à jour une notification dans la liste locale.
     * @param notification Notification à upsert.
     * @param prepend Si `true`, insère en tête.
     * @returns `true` si un nouvel item a été inséré (pas un update).
     */
    function upsertItem(notification: AppNotification, prepend = false): boolean {
        const idx = items.value.findIndex((n) => n.id === notification.id);
        if (idx >= 0) {
            items.value[idx] = notification;
            return false;
        }
        if (prepend) {
            items.value = [notification, ...items.value];
        } else {
            items.value = [...items.value, notification];
        }
        return true;
    }

    return {
        items,
        unreadCount,
        page,
        pageSize,
        totalCount,
        loading,
        loadingMore,
        markingAll,
        clearingAll,
        inboxLoaded,
        error,
        hubConnected,
        friendListeners,
        accountShareListeners,
        friendshipChangeListeners,
        accountChangeListeners,
        liveFriendChips,
        hasUnread,
        badgeContent,
        hasMore,
        hasItems,
        applyUnreadCount,
        upsertItem
    };
}

export type NotificationsState = ReturnType<typeof createNotificationsState>;
