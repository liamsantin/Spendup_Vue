/**
 * Mappe les `link` API (chemins logiques) vers les routes front réelles.
 * Ex. `/security/devices` → `/app/comptes` (onglet Sécurité).
 */
export function resolveNotificationLink(link: string | null | undefined): string | null {
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

export function isSecurityNotificationType(type: string): boolean {
    return type === 'loginNewDevice' || type === 'securityAlert';
}

export function isFriendNotificationType(type: string): boolean {
    return type === 'friendRequest' || type === 'friendAccepted';
}
