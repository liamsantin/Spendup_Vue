import { notificationsApi } from '@/features/notifications/api';
import type { NotificationsState } from '@/features/notifications/stores/internal/notifications-state';
import type { NotificationsNative } from '@/features/notifications/stores/internal/notifications-native';

/**
 * Actions REST de l’inbox notifications.
 * @param state État partagé du store.
 * @param native Helpers chips live (dismiss / clear).
 * @returns Les actions inbox.
 */
export function createNotificationsInbox(state: NotificationsState, native: NotificationsNative) {
    const {
        items,
        page,
        pageSize,
        totalCount,
        loading,
        loadingMore,
        markingAll,
        clearingAll,
        inboxLoaded,
        error,
        hasMore,
        applyUnreadCount,
        upsertItem
    } = state;

    const { dismissLiveFriendChipsByNotificationId, clearLiveFriendChips } = native;

    /**
     * Vide l’inbox locale après clear serveur / SignalR.
     * @param unread Compteur non lus à appliquer (défaut 0).
     */
    function applyInboxCleared(unread = 0) {
        applyUnreadCount(unread);
        items.value = [];
        totalCount.value = 0;
        page.value = 1;
        clearLiveFriendChips();
    }

    /** Récupère le badge non lus depuis l’API. */
    async function fetchUnreadCount() {
        const result = await notificationsApi.unreadCount();
        applyUnreadCount(result?.unreadCount ?? 0);
    }

    /**
     * Charge une page de l’inbox.
     * @param options Page et mode append.
     */
    async function loadInbox(options?: { page?: number; append?: boolean }) {
        const nextPage = options?.page ?? 1;
        const append = options?.append === true;
        if (append) loadingMore.value = true;
        else loading.value = true;
        error.value = null;
        try {
            const result = await notificationsApi.list({
                page: nextPage,
                pageSize: pageSize.value
            });
            const nextItems = Array.isArray(result?.items) ? result.items : [];
            items.value = append ? [...items.value, ...nextItems] : nextItems;
            page.value = result?.page ?? nextPage;
            pageSize.value = result?.pageSize ?? pageSize.value;
            totalCount.value = result?.totalCount ?? nextItems.length;
            if (result?.unreadCount != null) applyUnreadCount(result.unreadCount);
            inboxLoaded.value = true;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loading.value = false;
            loadingMore.value = false;
        }
    }

    /** Ouvre l’inbox (première page). */
    async function openInbox() {
        await loadInbox({ page: 1, append: false });
    }

    /** Charge la page suivante si disponible. */
    async function loadMore() {
        if (!hasMore.value || loading.value || loadingMore.value) return;
        await loadInbox({ page: page.value + 1, append: true });
    }

    /**
     * Marque une notification comme lue.
     * @param id Identifiant de la notification.
     */
    async function markRead(id: number) {
        // Lecture depuis le dropdown / inbox : retirer le chip live associé.
        dismissLiveFriendChipsByNotificationId(id);
        const updated = await notificationsApi.markRead(id);
        upsertItem(updated);
        try {
            await fetchUnreadCount();
        } catch {
            if (updated.isRead && state.unreadCount.value > 0) {
                applyUnreadCount(state.unreadCount.value - 1);
            }
        }
        return updated;
    }

    /** Marque toutes les notifications comme lues. */
    async function markAllRead() {
        markingAll.value = true;
        error.value = null;
        try {
            const result = await notificationsApi.markAllRead();
            applyUnreadCount(result?.unreadCount ?? 0);
            items.value = items.value.map((n) => (n.isRead ? n : { ...n, isRead: true, readAt: n.readAt ?? new Date().toISOString() }));
            clearLiveFriendChips();
            return result;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            markingAll.value = false;
        }
    }

    /** Supprime toutes les notifications de l’inbox. */
    async function clearAll() {
        clearingAll.value = true;
        error.value = null;
        try {
            const result = await notificationsApi.deleteAll();
            applyInboxCleared(0);
            return result;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            clearingAll.value = false;
        }
    }

    return {
        applyInboxCleared,
        fetchUnreadCount,
        loadInbox,
        openInbox,
        loadMore,
        markRead,
        markAllRead,
        clearAll
    };
}

export type NotificationsInbox = ReturnType<typeof createNotificationsInbox>;
