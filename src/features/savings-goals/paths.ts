export const SAVINGS_GOALS_BASE = '/app/planning/objectifs';

export const SAVINGS_GOALS_PATHS = {
    list: SAVINGS_GOALS_BASE
} as const;

export function savingsGoalDetailPath(publicId: string): string {
    const id = publicId.trim();
    return id ? `${SAVINGS_GOALS_BASE}/${encodeURIComponent(id)}` : SAVINGS_GOALS_BASE;
}

export function savingsGoalPublicIdFromPath(path: string): string | null {
    const trimmed = path.trim();
    if (trimmed === SAVINGS_GOALS_BASE || trimmed === `${SAVINGS_GOALS_BASE}/`) return null;
    if (!trimmed.startsWith(`${SAVINGS_GOALS_BASE}/`)) return null;
    const rest = trimmed.slice(`${SAVINGS_GOALS_BASE}/`.length).split(/[/?#]/)[0] ?? '';
    const decoded = decodeURIComponent(rest).trim();
    return decoded || null;
}
