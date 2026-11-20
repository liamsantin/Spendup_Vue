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

/**
 * Query de la revue des lignes. En démo, la recherche reste dans la page et n'entre jamais dans
 * l'adresse : un mot du relevé, rechargé, partirait vers le serveur du site.
 */
export function importLinesRouteQuery(
    state: { status?: string; q?: string; sort?: string },
    options: { inDemo: boolean; maxSearch: number; defaultSort: string }
): Record<string, string> {
    const next: Record<string, string> = {};
    if (state.status) next.status = state.status;
    if (state.q && !options.inDemo) next.q = state.q.slice(0, options.maxSearch);
    if (state.sort && state.sort !== options.defaultSort) next.sort = state.sort;
    return next;
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
