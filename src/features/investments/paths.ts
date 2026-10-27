import { WEALTH_BASE } from '@/features/net-worth/paths';

/** Placements : positions et opérations d’un compte `investissement` / `crypto`. */
export const INVESTMENTS_BASE = `${WEALTH_BASE}/placements`;

export const INVESTMENTS_PATHS = {
    list: INVESTMENTS_BASE
} as const;

/** `/app/patrimoine/placements/{accountPublicId}` — compte de placement sélectionné. */
export function investmentsAccountPath(accountPublicId: string): string {
    const id = accountPublicId.trim();
    return id ? `${INVESTMENTS_BASE}/${encodeURIComponent(id)}` : INVESTMENTS_BASE;
}

export function investmentsAccountPublicIdFromPath(path: string): string | null {
    const trimmed = path.trim();
    if (trimmed === INVESTMENTS_BASE || trimmed === `${INVESTMENTS_BASE}/`) return null;
    if (!trimmed.startsWith(`${INVESTMENTS_BASE}/`)) return null;
    const rest = trimmed.slice(`${INVESTMENTS_BASE}/`.length).split(/[/?#]/)[0] ?? '';
    const decoded = decodeURIComponent(rest).trim();
    return decoded || null;
}
