import type { NotificationType } from './types';

/** Types amis qui déclenchent un chip live (demande / ajout / retrait / blocage). */
export function isFriendLiveChipType(type: string): boolean {
    return type === 'friendRequest' || type === 'friendAccepted' || type === 'friendRemoved' || type === 'friendBlocked';
}

/**
 * Couleur filled du chip live :
 * - demande / ajout → primary
 * - retiré → error
 * - bloqué → warning
 */
export function friendLiveChipColor(type: NotificationType | string): 'primary' | 'error' | 'warning' {
    if (type === 'friendRemoved') return 'error';
    if (type === 'friendBlocked') return 'warning';
    return 'primary';
}
