import { asAppPath } from '@/features/demo/session';

export const IMPORTS_BASE = '/app/finances/imports';

export const IMPORTS_PATHS = {
    list: IMPORTS_BASE,
    templates: `${IMPORTS_BASE}/modeles`
} as const;

export function importDetailPath(publicId: string): string {
    const id = publicId.trim();
    return id ? `${IMPORTS_BASE}/${encodeURIComponent(id)}` : IMPORTS_BASE;
}

export function importPublicIdFromPath(path: string): string | null {
    // En démo l'URL est `/demo/...` : ramenée au chemin applicatif.
    const trimmed = asAppPath(path);
    if (!trimmed.startsWith(`${IMPORTS_BASE}/`)) return null;
    const rest = trimmed.slice(`${IMPORTS_BASE}/`.length).split(/[/?#]/)[0] ?? '';
    const decoded = decodeURIComponent(rest).trim();
    if (!decoded || decoded === 'modeles') return null;
    return decoded;
}
