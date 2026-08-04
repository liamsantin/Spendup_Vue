/** Types d’événements déjà émis par l’API (sécu + placeholders amis/finance). */
export type NotificationType =
    | 'loginNewDevice'
    | 'securityAlert'
    | 'friendRequest'
    | 'friendAccepted'
    | 'friendRefused'
    | 'friendCanceled'
    | 'friendRemoved'
    | 'other'
    | (string & {});

/** Item inbox — même forme REST / SignalR (camelCase). */
export type AppNotification = {
    id: number;
    type: NotificationType;
    title: string;
    subtitle: string | null;
    message: string | null;
    metadata?: Record<string, unknown> | null;
    isRead: boolean;
    readAt: string | null;
    link: string | null;
    photoUrl: string | null;
    createdAt: string;
};

export type NotificationsListResult = {
    items: AppNotification[];
    unreadCount: number;
    page: number;
    pageSize: number;
    totalCount: number;
};

export type UnreadCountResult = {
    unreadCount: number;
};

export type MarkAllReadResult = {
    markedCount: number;
    unreadCount: number;
};

export type NotificationConnectedPayload = {
    connectionId: string;
    userId: string;
};

/** Payload SignalR `sessionEnded` — session invalidée côté API. */
export type SessionEndedPayload = {
    reason: 'session_ended' | (string & {});
    /** Appareil ciblé ; `null` = toutes les sessions. */
    deviceIdentifier: string | null;
};

export type NotificationReceivedPayload = {
    notification: AppNotification;
    unreadCount: number;
};

export type NotificationsListQuery = {
    page?: number;
    pageSize?: number;
    unreadOnly?: boolean;
};
