export const TIERS_PATH = '/app/gestion/tiers';

/** Chemin de la fiche d’un tiers. */
export function tierDetailPath(publicId: string): string {
    return `${TIERS_PATH}/${encodeURIComponent(publicId)}`;
}

/** Tiers désigné par le chemin, ou `null` sur la liste. */
export function tierPublicIdFromPath(path: string): string | null {
    if (!path.startsWith(`${TIERS_PATH}/`)) return null;
    const raw = path.slice(TIERS_PATH.length + 1).split('/')[0];
    const publicId = decodeURIComponent(raw).trim();
    return publicId || null;
}
