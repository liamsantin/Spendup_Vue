import { WEALTH_BASE } from '@/features/net-worth/paths';

/** Biens immobiliers (actifs de type `immobilier`) et leur fiche. */
export const REAL_ESTATE_BASE = `${WEALTH_BASE}/immobilier`;

export const REAL_ESTATE_PATHS = {
    list: REAL_ESTATE_BASE
} as const;

export function realEstateDetailPath(assetPublicId: string): string {
    const id = assetPublicId.trim();
    return id ? `${REAL_ESTATE_BASE}/${encodeURIComponent(id)}` : REAL_ESTATE_BASE;
}

export function realEstatePublicIdFromPath(path: string): string | null {
    const trimmed = path.trim();
    if (trimmed === REAL_ESTATE_BASE || trimmed === `${REAL_ESTATE_BASE}/`) return null;
    if (!trimmed.startsWith(`${REAL_ESTATE_BASE}/`)) return null;
    const rest = trimmed.slice(`${REAL_ESTATE_BASE}/`.length).split(/[/?#]/)[0] ?? '';
    const decoded = decodeURIComponent(rest).trim();
    return decoded || null;
}
