import type { Component } from 'vue';
import { BoxIcon, CarIcon, CoinBitcoinIcon, DiamondIcon, HomeIcon, PigMoneyIcon } from 'vue-tabler-icons';
import { formatAccountBalance, formatSwissNumber } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import {
    ASSET_CURRENCIES,
    ASSET_TYPES,
    type Asset,
    type AssetCurrency,
    type AssetType,
    type ListAssetsQuery,
    type RealEstateDetails
} from '@/features/assets/types';
import { matchesSearchTokens } from '@/utils/helpers/text-search';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function emptyToNull(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

export function isValidYmd(value: string | null | undefined): boolean {
    if (value == null) return false;
    const trimmed = value.trim();
    if (!YMD_RE.test(trimmed)) return false;
    const [y, m, d] = trimmed.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function formatCalendarDate(value: string | null | undefined, locale?: string): string {
    if (!value) return '';
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!match) return value;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
    return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium' }).format(date);
}

export function isAssetType(value: unknown): value is AssetType {
    return typeof value === 'string' && ASSET_TYPES.includes(value as AssetType);
}

export function isAssetCurrency(value: unknown): value is AssetCurrency {
    return typeof value === 'string' && ASSET_CURRENCIES.includes(value as AssetCurrency);
}

export function formatAssetValue(amount: number, currency: string, locale?: string): string {
    return formatAccountBalance(amount, currency as Currency, locale);
}

/** Montant seul (sans devise), pour afficher la devise à part en petit gris. */
export function formatAssetAmount(amount: number): string {
    return formatSwissNumber(Number(amount) || 0);
}

/** Nombre entier (kilométrage, quantité…) en notation suisse, sans décimales. */
export function formatAssetInteger(value: number, locale?: string): string {
    return new Intl.NumberFormat(locale || 'fr-CH', { maximumFractionDigits: 0 }).format(value);
}

/** Quantité crypto : jusqu’à 8 décimales affichées. */
export function formatCryptoQuantity(value: number, locale?: string): string {
    return new Intl.NumberFormat(locale || 'fr-CH', { maximumFractionDigits: 8 }).format(value);
}

export type AssetTileTone = 'blue' | 'violet' | 'amber' | 'teal' | 'rose' | 'green' | 'gray';

/** Teinte de catégorie (carré 36 px) par type d’actif. */
export function assetTypeTone(type: AssetType): AssetTileTone {
    switch (type) {
        case 'immobilier':
            return 'rose';
        case 'vehicule':
            return 'teal';
        case 'crypto':
            return 'violet';
        case 'objetValeur':
            return 'amber';
        case 'compteEpargne':
            return 'blue';
        default:
            return 'gray';
    }
}

export function assetTypeTile(type: AssetType): string {
    return `su-tile--${assetTypeTone(type)}`;
}

export function assetTypeIcon(type: AssetType): Component {
    switch (type) {
        case 'immobilier':
            return HomeIcon;
        case 'vehicule':
            return CarIcon;
        case 'crypto':
            return CoinBitcoinIcon;
        case 'objetValeur':
            return DiamondIcon;
        case 'compteEpargne':
            return PigMoneyIcon;
        default:
            return BoxIcon;
    }
}

/** Texte secondaire court (marque / modèle, symbole, type d’objet…) utilisé pour la recherche et la sous-ligne. */
export function assetSearchText(asset: Asset): string {
    const parts: string[] = [asset.name];
    if (asset.vehicle) parts.push(asset.vehicle.brand, asset.vehicle.model, asset.vehicle.plate ?? '');
    if (asset.crypto) parts.push(asset.crypto.name, asset.crypto.symbol, asset.crypto.platform ?? '');
    if (asset.valuableItem) parts.push(asset.valuableItem.brand ?? '', asset.valuableItem.model ?? '');
    if (asset.other) parts.push(asset.other.customType ?? '');
    if (asset.realEstate) parts.push(asset.realEstate.details.city ?? '', asset.realEstate.details.addressLine1 ?? '');
    return parts.filter(Boolean).join(' ');
}

export function matchesAssetSearch(asset: Asset, needle: string): boolean {
    return matchesSearchTokens(assetSearchText(asset), needle);
}

function toNumberOrNull(value: unknown): number | null {
    if (value == null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function normalizeRealEstateDetails(details: RealEstateDetails): RealEstateDetails {
    return {
        ...details,
        hasElevator: !!details.hasElevator,
        hasBalcony: !!details.hasBalcony,
        hasCellar: !!details.hasCellar,
        hasGarage: !!details.hasGarage,
        country: details.country ? details.country.toUpperCase() : null
    };
}

/** Complète les nombres et les objets de détail absents d’une réponse. */
export function normalizeAsset(asset: Asset): Asset {
    return {
        ...asset,
        estimatedValue: Number(asset.estimatedValue) || 0,
        acquisitionPrice: toNumberOrNull(asset.acquisitionPrice),
        acquisitionDate: asset.acquisitionDate ?? null,
        description: asset.description ?? null,
        notes: asset.notes ?? null,
        isActive: asset.isActive !== false,
        lastValuationDate: asset.lastValuationDate ?? null,
        isValueFromAccount: !!asset.isValueFromAccount,
        vehicle: asset.vehicle ?? null,
        crypto: asset.crypto ? { ...asset.crypto, quantity: Number(asset.crypto.quantity) || 0 } : null,
        valuableItem: asset.valuableItem ? { ...asset.valuableItem, isInsured: !!asset.valuableItem.isInsured } : null,
        savingsAccount: asset.savingsAccount ? { ...asset.savingsAccount, isBlocked: !!asset.savingsAccount.isBlocked } : null,
        other: asset.other ?? null,
        realEstate: asset.realEstate
            ? { details: normalizeRealEstateDetails(asset.realEstate.details), summary: asset.realEstate.summary ?? null }
            : null
    };
}

export function queryMatchesAsset(query: ListAssetsQuery, asset: Asset): boolean {
    if (query.type && asset.type !== query.type) return false;
    if (typeof query.active === 'boolean' && asset.isActive !== query.active) return false;
    return true;
}

export function normalizeListQuery(query: ListAssetsQuery = {}): { type: AssetType | null; active: boolean | null } {
    return {
        type: isAssetType(query.type) ? query.type : null,
        active: typeof query.active === 'boolean' ? query.active : null
    };
}

/* ── annuaire (page Actifs) ──────────────────────────────────────────────── */

export type AssetStateFilter = 'active' | 'sold';

export const ASSET_DETAIL_TABS = ['informations', 'valuations', 'mileages', 'maintenances'] as const;

export type AssetDetailTab = (typeof ASSET_DETAIL_TABS)[number];

/** Onglets de la fiche : Informations, puis Valorisations (sauf solde de compte), puis véhicule. */
export function assetDetailTabs(asset: Pick<Asset, 'type' | 'isValueFromAccount'>): AssetDetailTab[] {
    const tabs: AssetDetailTab[] = ['informations'];
    if (!asset.isValueFromAccount) tabs.push('valuations');
    if (asset.type === 'vehicule') tabs.push('mileages', 'maintenances');
    return tabs;
}

/** Onglet d’URL, ou le premier disponible. */
export function activeAssetDetailTab(value: unknown, tabs: readonly AssetDetailTab[]): AssetDetailTab | null {
    if (!tabs.length) return null;
    return typeof value === 'string' && tabs.includes(value as AssetDetailTab) ? (value as AssetDetailTab) : tabs[0];
}

/** `state` d’URL : `active` (défaut) ou `sold`. */
export function parseAssetStateFilter(value: unknown): AssetStateFilter {
    return value === 'sold' ? 'sold' : 'active';
}

/**
 * Actifs affichés par l’annuaire : la vue « Tous » (type `null`) exclut l’immobilier, qui a sa
 * propre page ; la recherche `q` est appliquée côté client.
 */
export function filterDirectoryAssets(items: readonly Asset[], options: { type?: AssetType | null; search?: string | null } = {}): Asset[] {
    const needle = options.search?.trim() ?? '';
    return items.filter((asset) => {
        if (options.type) {
            if (asset.type !== options.type) return false;
        } else if (asset.type === 'immobilier') {
            return false;
        }
        return !needle || matchesAssetSearch(asset, needle);
    });
}

export type AssetCurrencyTotal = { currency: AssetCurrency; total: number };

/** Somme des valeurs estimées par devise (aucune conversion), dans l’ordre `ASSET_CURRENCIES`. */
export function sumAssetValuesByCurrency(items: readonly Asset[]): AssetCurrencyTotal[] {
    const totals = new Map<AssetCurrency, number>();
    for (const asset of items) {
        totals.set(asset.currency, (totals.get(asset.currency) ?? 0) + (Number(asset.estimatedValue) || 0));
    }
    return ASSET_CURRENCIES.filter((currency) => totals.has(currency)).map((currency) => ({
        currency,
        total: Math.round((totals.get(currency) ?? 0) * 100) / 100
    }));
}

/** « 12’000.00 CHF + 3’000.00 EUR » ; liste vide → 0 dans la devise de repli. */
export function formatAssetTotals(items: readonly Asset[], fallbackCurrency: string, locale?: string): string {
    const totals = sumAssetValuesByCurrency(items);
    if (!totals.length) return formatAssetValue(0, fallbackCurrency, locale);
    return totals.map((entry) => formatAssetValue(entry.total, entry.currency, locale)).join(' + ');
}
