/** Types d’événements inbox (sécu + amis produits). Anciens types amis peuvent rester en historique. */
export type NotificationType =
    | 'loginNewDevice'
    | 'securityAlert'
    | 'friendRequest'
    | 'friendAccepted'
    /** @deprecated plus produit — historique inbox uniquement */
    | 'friendRefused'
    /** @deprecated plus produit — historique inbox uniquement */
    | 'friendCanceled'
    /** @deprecated plus produit — historique inbox uniquement */
    | 'friendRemoved'
    /** @deprecated plus produit — historique inbox uniquement */
    | 'friendBlocked'
    | 'accountShareInvite'
    | 'accountShareAccepted'
    | 'accountShareRefused'
    | 'accountShareRevoked'
    | 'accountShareLeft'
    | 'accountShareRoleChanged'
    | 'other'
    | (string & {});

/** Item inbox — même forme REST / SignalR (camelCase). `metadata` est toujours un objet côté front (string JSON API parsée). */
export type AppNotification = {
    id: number;
    type: NotificationType;
    title: string;
    subtitle: string | null;
    message: string | null;
    /** Objet parsé ; l’API peut renvoyer une string JSON brute. */
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

export type DeleteAllNotificationsResult = {
    deletedCount: number;
};

/** Payload SignalR `inboxCleared` — inbox vidée (multi-appareils). */
export type InboxClearedPayload = {
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

/** Payload SignalR `friendshipChanged` — live sans inbox / badge. */
export type FriendshipChange = 'refused' | 'canceled' | 'blocked' | 'removed';

export type FriendshipChangedPayload = {
    change: FriendshipChange;
    friendshipPublicId: string;
};

/**
 * Payload SignalR `accountChanged` — sync live même si pushNotifications est off
 * (archive/restore/visibilité/relevés/révocation/changement de rôle). Les notifs inbox
 * restent pour historique/badge ; ne pas compter uniquement sur elles pour la liste.
 */
export type AccountChange =
    | 'archived'
    | 'restored'
    | 'visibility'
    | 'updated'
    | 'balanceSnapshotCreated'
    | 'balanceSnapshotDeleted'
    | 'revoked'
    | 'roleChanged';

export type AccountChangedPayload = {
    change: AccountChange;
    accountPublicId: string;
};

export type NotificationsListQuery = {
    page?: number;
    pageSize?: number;
    unreadOnly?: boolean;
};
