import { getFriendshipPublicId } from './normalize';
import type { AppNotification, NotificationType } from './types';

/**
 * Mappe les `link` API (chemins logiques) vers les routes front réelles.
 * Ex. `/security/devices` → `/app/comptes` (onglet Sécurité).
 * Avec une notif ami + metadata, ajoute `?tab=` / `?friendship=`.
 */
export function resolveNotificationLink(
    link: string | null | undefined,
    notification?: Pick<AppNotification, 'type' | 'metadata'> | null
): string | null {
    const friendsDeepLink = resolveFriendsDeepLink(notification);
    if (friendsDeepLink) return friendsDeepLink;

    if (!link) return null;
    const trimmed = link.trim();
    if (!trimmed.startsWith('/')) return null;

    if (trimmed.startsWith('/app/')) return trimmed;
    if (trimmed === '/security' || trimmed.startsWith('/security/')) {
        return '/app/comptes';
    }
    if (trimmed === '/friends' || trimmed.startsWith('/friends/')) {
        return '/app/friends';
    }
    return trimmed;
}

function friendsTabForType(type: NotificationType | string): 'Friends' | 'Requests' | null {
    switch (type) {
        case 'friendRequest':
        case 'friendRefused':
        case 'friendCanceled':
            return 'Requests';
        case 'friendAccepted':
        case 'friendRemoved':
        case 'friendBlocked':
            return 'Friends';
        default:
            return null;
    }
}

function resolveFriendsDeepLink(notification?: Pick<AppNotification, 'type' | 'metadata'> | null): string | null {
    if (!notification) return null;
    // Inclut l’historique (types amis plus produits) pour deep-link inbox.
    const tab = friendsTabForType(notification.type);
    if (tab == null) return null;

    const friendship = getFriendshipPublicId(notification.metadata);
    const params = new URLSearchParams();
    params.set('tab', tab);
    if (friendship) params.set('friendship', friendship);
    return `/app/friends?${params.toString()}`;
}

export function isSecurityNotificationType(type: string): boolean {
    return type === 'loginNewDevice' || type === 'securityAlert';
}

/** Types amis encore produits en inbox (`notificationReceived`). */
export function isFriendNotificationType(type: string): boolean {
    return type === 'friendRequest' || type === 'friendAccepted';
}
