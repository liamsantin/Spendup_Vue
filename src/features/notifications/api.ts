import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import { normalizeAppNotification, normalizeNotificationsListResult } from '@/features/notifications/normalize';
import type {
    AppNotification,
    DeleteAllNotificationsResult,
    MarkAllReadResult,
    NotificationsListQuery,
    NotificationsListResult,
    UnreadCountResult
} from '@/features/notifications/types';

function toQuery(params: NotificationsListQuery): string {
    const search = new URLSearchParams();
    if (params.page != null) search.set('page', String(params.page));
    if (params.pageSize != null) search.set('pageSize', String(params.pageSize));
    if (params.unreadOnly != null) search.set('unreadOnly', String(params.unreadOnly));
    const qs = search.toString();
    return qs ? `?${qs}` : '';
}

/** `GET/POST/DELETE /api/notifications*` — JWT requis. */
export const notificationsApi = {
    async list(params: NotificationsListQuery = {}): Promise<NotificationsListResult> {
        const raw = await fetchWrapper.get(`/api/notifications${toQuery(params)}`);
        return normalizeNotificationsListResult(raw);
    },

    unreadCount() {
        return fetchWrapper.get('/api/notifications/unread-count') as Promise<UnreadCountResult>;
    },

    async markRead(id: number): Promise<AppNotification> {
        const raw = await fetchWrapper.post(`/api/notifications/${id}/read`);
        const normalized = normalizeAppNotification(raw);
        if (!normalized) {
            throw new Error('Invalid notification payload');
        }
        return normalized;
    },

    markAllRead() {
        return fetchWrapper.post('/api/notifications/read-all') as Promise<MarkAllReadResult>;
    },

    deleteAll() {
        return fetchWrapper.delete('/api/notifications') as Promise<DeleteAllNotificationsResult>;
    }
};
