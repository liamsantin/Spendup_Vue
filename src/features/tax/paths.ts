import { asAppPath } from '@/features/demo/session';

/** Brouillon de déclaration : `/app/analyses/impots`. */
export const TAX_BASE = '/app/analyses/impots';

export function taxDetailPath(publicId: string): string {
    const id = publicId.trim();
    return id ? `${TAX_BASE}/${encodeURIComponent(id)}` : TAX_BASE;
}

export function taxPublicIdFromPath(path: string): string | null {
    const trimmed = asAppPath(path);
    if (trimmed === TAX_BASE || trimmed === `${TAX_BASE}/`) return null;
    if (!trimmed.startsWith(`${TAX_BASE}/`)) return null;
    const rest = trimmed.slice(`${TAX_BASE}/`.length).split(/[/?#]/)[0] ?? '';
    const decoded = decodeURIComponent(rest).trim();
    return decoded || null;
}
