import { WEALTH_BASE } from '@/features/net-worth/paths';

/** Actifs hors immobilier (véhicules, crypto, objets de valeur, épargne, autres). */
export const ASSETS_BASE = `${WEALTH_BASE}/actifs`;

export const ASSETS_PATHS = {
    list: ASSETS_BASE
} as const;

export function assetDetailPath(publicId: string): string {
    const id = publicId.trim();
    return id ? `${ASSETS_BASE}/${encodeURIComponent(id)}` : ASSETS_BASE;
}

export function assetPublicIdFromPath(path: string): string | null {
    const trimmed = path.trim();
    if (trimmed === ASSETS_BASE || trimmed === `${ASSETS_BASE}/`) return null;
    if (!trimmed.startsWith(`${ASSETS_BASE}/`)) return null;
    const rest = trimmed.slice(`${ASSETS_BASE}/`.length).split(/[/?#]/)[0] ?? '';
    const decoded = decodeURIComponent(rest).trim();
    return decoded || null;
}
