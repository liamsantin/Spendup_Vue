import { asAppPath } from '@/features/demo/session';

export const ACCOUNTS_BASE = '/app/finances/comptes';

export const ACCOUNT_DETAIL_TABS = ['details', 'snapshots', 'paymentMethods', 'shares', 'documents'] as const;

export type AccountDetailTab = (typeof ACCOUNT_DETAIL_TABS)[number];

/** Chemin de la fiche d’un compte : `/app/finances/comptes/:publicId`. */
export function accountDetailPath(publicId: string): string {
    return `${ACCOUNTS_BASE}/${encodeURIComponent(publicId)}`;
}

/** `publicId` du compte désigné par le chemin, ou `null` sur la liste. */
export function accountIdFromPath(path: string): string | null {
    path = asAppPath(path);
    if (!path.startsWith(`${ACCOUNTS_BASE}/`)) return null;
    const raw = path.slice(ACCOUNTS_BASE.length + 1).split('/')[0];
    const publicId = decodeURIComponent(raw).trim();
    return publicId || null;
}

/** Onglet d’URL (`?tab=`), ou Détails. */
export function activeAccountDetailTab(value: unknown): AccountDetailTab {
    return typeof value === 'string' && (ACCOUNT_DETAIL_TABS as readonly string[]).includes(value)
        ? (value as AccountDetailTab)
        : ACCOUNT_DETAIL_TABS[0];
}
