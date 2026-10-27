import { WEALTH_BASE } from '@/features/net-worth/paths';

/**
 * Page Dettes : trois onglets de module (passifs, prêts entre personnes, dettes entre amis),
 * un chemin par onglet comme les récurrences.
 */
export const DEBTS_BASE = `${WEALTH_BASE}/dettes`;

export const DEBTS_PATHS = {
    liabilities: DEBTS_BASE,
    loans: `${DEBTS_BASE}/prets`,
    shared: `${DEBTS_BASE}/amis`
} as const;

export type DebtsTab = 'liabilities' | 'loans' | 'shared';

export function debtsPathForTab(tab: DebtsTab): string {
    if (tab === 'loans') return DEBTS_PATHS.loans;
    if (tab === 'shared') return DEBTS_PATHS.shared;
    return DEBTS_PATHS.liabilities;
}

export function debtsTabFromPath(path: string): DebtsTab {
    if (path === DEBTS_PATHS.loans || path.startsWith(`${DEBTS_PATHS.loans}/`)) return 'loans';
    if (path === DEBTS_PATHS.shared || path.startsWith(`${DEBTS_PATHS.shared}/`)) return 'shared';
    return 'liabilities';
}

function detailPath(base: string, publicId: string): string {
    const id = publicId.trim();
    return id ? `${base}/${encodeURIComponent(id)}` : base;
}

function publicIdFromPath(base: string, path: string): string | null {
    const trimmed = path.trim();
    if (trimmed === base || trimmed === `${base}/`) return null;
    if (!trimmed.startsWith(`${base}/`)) return null;
    const rest = trimmed.slice(`${base}/`.length).split(/[/?#]/)[0] ?? '';
    const decoded = decodeURIComponent(rest).trim();
    return decoded || null;
}

export function liabilityDetailPath(publicId: string): string {
    return detailPath(DEBTS_PATHS.liabilities, publicId);
}

/** Un segment sous `/dettes` qui n’est ni `prets` ni `amis` est un publicId de passif. */
export function liabilityPublicIdFromPath(path: string): string | null {
    if (debtsTabFromPath(path) !== 'liabilities') return null;
    return publicIdFromPath(DEBTS_PATHS.liabilities, path);
}

export function personalLoanDetailPath(publicId: string): string {
    return detailPath(DEBTS_PATHS.loans, publicId);
}

export function personalLoanPublicIdFromPath(path: string): string | null {
    return publicIdFromPath(DEBTS_PATHS.loans, path);
}

export function sharedDebtDetailPath(publicId: string): string {
    return detailPath(DEBTS_PATHS.shared, publicId);
}

export function sharedDebtPublicIdFromPath(path: string): string | null {
    return publicIdFromPath(DEBTS_PATHS.shared, path);
}
