import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type { AppNotification, MarkAllReadResult, NotificationsListQuery, NotificationsListResult, UnreadCountResult } from './types';

function toQuery(params: NotificationsListQuery): string {
    const search = new URLSearchParams();
    if (params.page != null) search.set('page', String(params.page));
    if (params.pageSize != null) search.set('pageSize', String(params.pageSize));
    if (params.unreadOnly != null) search.set('unreadOnly', String(params.unreadOnly));
    const qs = search.toString();
    return qs ? `?${qs}` : '';
}

/** `GET/POST /api/notifications*` — JWT requis. */
export const notificationsApi = {
    list(params: NotificationsListQuery = {}) {
        return fetchWrapper.get(`/api/notifications${toQuery(params)}`) as Promise<NotificationsListResult>;
    },

    unreadCount() {
        return fetchWrapper.get('/api/notifications/unread-count') as Promise<UnreadCountResult>;
    },

    markRead(id: number) {
        return fetchWrapper.post(`/api/notifications/${id}/read`) as Promise<AppNotification>;
    },

    markAllRead() {
        return fetchWrapper.post('/api/notifications/read-all') as Promise<MarkAllReadResult>;
    }
};
