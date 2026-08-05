/** Types amis qui déclenchent un chip live (inbox + push). */
export function isFriendLiveChipType(type: string): boolean {
    return type === 'friendRequest' || type === 'friendAccepted';
}

/** Couleur filled du chip live — demande / acceptation → primary. */
export function friendLiveChipColor(): 'primary' {
    return 'primary';
}
