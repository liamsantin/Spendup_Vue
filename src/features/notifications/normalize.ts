import type { AppNotification, NotificationReceivedPayload, NotificationsListResult } from '@/features/notifications/types';

/** Parse le `metadata` API (souvent une string JSON) en objet. */
export function parseNotificationMetadata(raw: unknown): Record<string, unknown> | null {
    if (raw == null) return null;

    if (typeof raw === 'object' && !Array.isArray(raw)) {
        return raw as Record<string, unknown>;
    }

    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    try {
        const parsed: unknown = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch {
        return null;
    }
    return null;
}

export function getFriendshipPublicId(metadata: Record<string, unknown> | null | undefined): string | null {
    const value = metadata?.friendshipPublicId;
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
}

export function getAccountSharePublicId(metadata: Record<string, unknown> | null | undefined): string | null {
    const value = metadata?.sharePublicId;
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
}

/** Normalise un item inbox / SignalR (metadata string → objet). */
export function normalizeAppNotification(raw: unknown): AppNotification | null {
    if (!raw || typeof raw !== 'object') return null;
    const n = raw as Record<string, unknown>;
    if (typeof n.id !== 'number') return null;

    return {
        id: n.id,
        type: (typeof n.type === 'string' ? n.type : 'other') as AppNotification['type'],
        title: typeof n.title === 'string' ? n.title : '',
        subtitle: typeof n.subtitle === 'string' ? n.subtitle : n.subtitle == null ? null : String(n.subtitle),
        message: typeof n.message === 'string' ? n.message : n.message == null ? null : String(n.message),
        metadata: parseNotificationMetadata(n.metadata),
        isRead: Boolean(n.isRead),
        readAt: typeof n.readAt === 'string' ? n.readAt : n.readAt == null ? null : String(n.readAt),
        link: typeof n.link === 'string' ? n.link : n.link == null ? null : String(n.link),
        photoUrl: typeof n.photoUrl === 'string' ? n.photoUrl : n.photoUrl == null ? null : String(n.photoUrl),
        createdAt: typeof n.createdAt === 'string' ? n.createdAt : ''
    };
}

export function normalizeNotificationsListResult(raw: unknown): NotificationsListResult {
    const result = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const itemsRaw = Array.isArray(result.items) ? result.items : [];
    const items = itemsRaw.map(normalizeAppNotification).filter((n): n is AppNotification => n != null);
    return {
        items,
        unreadCount: Number(result.unreadCount) || 0,
        page: Number(result.page) || 1,
        pageSize: Number(result.pageSize) || items.length || 20,
        totalCount: Number(result.totalCount) || items.length
    };
}

export function normalizeNotificationReceivedPayload(raw: unknown): NotificationReceivedPayload | null {
    if (!raw || typeof raw !== 'object') return null;
    const payload = raw as Record<string, unknown>;
    const notification = normalizeAppNotification(payload.notification);
    if (!notification) return null;
    return {
        notification,
        unreadCount: Number(payload.unreadCount) || 0
    };
}
