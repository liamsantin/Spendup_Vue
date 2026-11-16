import { asAppPath } from '@/features/demo/session';
import { ASSETS_PATHS, assetDetailPath } from '@/features/assets/paths';
import { DEBTS_PATHS, liabilityDetailPath } from '@/features/liabilities/paths';
import { REAL_ESTATE_PATHS, realEstateDetailPath } from '@/features/real-estate/paths';
import { RECURRENCES_PATHS, recurrenceDetailPath } from '@/features/recurring-payments/paths';
import type { TaxSuggestion } from '@/features/tax/types';

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

/** Page de liste d'où vient une proposition, ou `null` (relevé importé, source inconnue). */
export function taxSuggestionPath(item: Pick<TaxSuggestion, 'code' | 'source'>): string | null {
    if (item.source === 'recurringIncome') return RECURRENCES_PATHS.revenus;
    if (item.source === 'liability') return DEBTS_PATHS.liabilities;
    if (item.source === 'asset') return item.code === 'asset.property' ? REAL_ESTATE_PATHS.list : ASSETS_PATHS.list;
    return null;
}

export interface TaxSuggestionTarget {
    name: string;
    path: string;
}

function sourceDetailPath(item: Pick<TaxSuggestion, 'code' | 'source'>, publicId: string): string | null {
    if (item.source === 'recurringIncome') return recurrenceDetailPath('income', publicId);
    if (item.source === 'liability') return liabilityDetailPath(publicId);
    if (item.source === 'asset') return item.code === 'asset.property' ? realEstateDetailPath(publicId) : assetDetailPath(publicId);
    return null;
}

/**
 * Fiches à ouvrir pour une proposition : une par élément qui la compose (une seule fiche ouvre directement,
 * plusieurs laissent choisir). Si l'API ne détaille pas les éléments, on retombe sur la page de liste.
 */
export function taxSuggestionTargets(item: Pick<TaxSuggestion, 'code' | 'source' | 'sources'>): TaxSuggestionTarget[] {
    const targets: TaxSuggestionTarget[] = [];
    for (const source of item.sources ?? []) {
        const path = sourceDetailPath(item, source.publicId);
        if (path) targets.push({ name: source.name, path });
    }
    if (targets.length) return targets;
    const list = taxSuggestionPath(item);
    return list ? [{ name: '', path: list }] : [];
}
