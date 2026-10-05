/** Types amis qui déclenchent un chip live (inbox + push). */
export function isFriendLiveChipType(type: string): boolean {
    return type === 'friendRequest' || type === 'friendAccepted';
}

/** Types partage de compte qui déclenchent un chip live (inbox + push). */
export function isAccountShareLiveChipType(type: string): boolean {
    return type === 'accountShareInvite';
}

/** Types qui déclenchent un chip live (amis + invitation de compte). */
export function isLiveChipType(type: string): boolean {
    return isFriendLiveChipType(type) || isAccountShareLiveChipType(type);
}

/** Couleur filled du chip live — demande / acceptation / invitation → primary. */
export function friendLiveChipColor(): 'primary' {
    return 'primary';
}
