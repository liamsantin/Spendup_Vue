import { isSafeAppPath } from '@/features/auth/safe-return-url';
import { BUDGETS_PATHS, budgetDetailPath } from '@/features/budgets/paths';
import { getAccountSharePublicId, getBudgetPublicId, getFriendshipPublicId, normalizePublicId } from '@/features/notifications/normalize';
import type { AppNotification, NotificationType } from '@/features/notifications/types';
import { rewriteLegacySettingsLink } from '@/features/user-settings/settings-paths';

/**
 * Chemins `/app…` navigables (bloque `//evil`, `/\\…`, `/application`, `..`).
 * Délègue à `isSafeAppPath` — à utiliser avant tout `router.push` notif / OS.
 */
export function isSafeAppNotificationPath(path: string | null | undefined): boolean {
    return isSafeAppPath(path);
}

/**
 * Mappe les `link` API (chemins logiques) vers les routes front réelles.
 * Ex. `/security/devices` → `/app/parametres/securite` ;
 * `/app/comptes?tab=Security` → `/app/parametres/securite`.
 * Avec une notif ami + metadata, ajoute `?tab=` / `?friendship=`.
 * Ne renvoie jamais de chemin hors `/app…` (open-redirect).
 */
export function resolveNotificationLink(
    link: string | null | undefined,
    notification?: Pick<AppNotification, 'type' | 'metadata'> | null
): string | null {
    const friendsDeepLink = resolveFriendsDeepLink(notification);
    if (friendsDeepLink) return friendsDeepLink;

    const accountsDeepLink = resolveAccountsDeepLink(notification);
    if (accountsDeepLink) return accountsDeepLink;

    const budgetsDeepLink = resolveBudgetsDeepLink(notification);
    if (budgetsDeepLink) return budgetsDeepLink;

    if (!link) return null;
    const trimmed = link.trim();
    if (!trimmed.startsWith('/')) return null;

    const legacySettings = rewriteLegacySettingsLink(trimmed);
    if (legacySettings) return legacySettings;

    if (isSafeAppPath(trimmed)) return trimmed;
    if (trimmed === '/security' || trimmed.startsWith('/security/')) {
        return '/app/parametres/securite';
    }
    if (trimmed === '/friends' || trimmed.startsWith('/friends/')) {
        return '/app/friends';
    }
    if (trimmed === '/accounts/shares' || trimmed.startsWith('/accounts/shares')) {
        return '/app/finances/comptes?tab=Invitations';
    }
    if (trimmed === '/accounts' || trimmed.startsWith('/accounts/')) {
        return '/app/finances/comptes';
    }
    if (trimmed === '/budgets' || trimmed.startsWith('/budgets/')) {
        return mapBudgetsApiLink(trimmed);
    }
    return null;
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

/** Types alerte budget produits en inbox. */
export function isBudgetAlertNotificationType(type: string): boolean {
    return type === 'budgetAlert';
}

/** Types partage de comptes produits en inbox. */
export function isAccountShareNotificationType(type: string): boolean {
    return (
        type === 'accountShareInvite' ||
        type === 'accountShareAccepted' ||
        type === 'accountShareRefused' ||
        type === 'accountShareRevoked' ||
        type === 'accountShareLeft' ||
        type === 'accountShareRoleChanged'
    );
}

function accountsTabForType(type: NotificationType | string): 'Accounts' | 'Invitations' | null {
    switch (type) {
        case 'accountShareInvite':
            return 'Invitations';
        case 'accountShareAccepted':
        case 'accountShareRefused':
        case 'accountShareRevoked':
        case 'accountShareLeft':
        case 'accountShareRoleChanged':
            return 'Accounts';
        default:
            return null;
    }
}

function resolveAccountsDeepLink(notification?: Pick<AppNotification, 'type' | 'metadata'> | null): string | null {
    if (!notification) return null;
    const tab = accountsTabForType(notification.type);
    if (tab == null) return null;

    const params = new URLSearchParams();
    params.set('tab', tab);
    const share = getAccountSharePublicId(notification.metadata);
    if (share && tab === 'Invitations') params.set('share', share);
    return `/app/finances/comptes?${params.toString()}`;
}

function mapBudgetsApiLink(link: string): string {
    const rest = link.slice('/budgets'.length);
    if (rest.startsWith('/')) {
        const id = normalizePublicId(decodeURIComponent(rest.slice(1).split(/[?#]/)[0] ?? ''));
        if (id) return budgetDetailPath(id);
    }
    return BUDGETS_PATHS.list;
}

function resolveBudgetsDeepLink(notification?: Pick<AppNotification, 'type' | 'metadata'> | null): string | null {
    if (!notification || !isBudgetAlertNotificationType(String(notification.type))) return null;
    const id = getBudgetPublicId(notification.metadata);
    if (id) return budgetDetailPath(id);
    if (typeof notification.metadata?.link === 'string') {
        const mapped = mapBudgetsApiLink(notification.metadata.link);
        if (mapped) return mapped;
    }
    return BUDGETS_PATHS.list;
}
