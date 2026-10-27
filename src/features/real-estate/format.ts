import { formatAccountBalance } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import type { Asset, RealEstateDetails } from '@/features/assets/types';
import {
    CHARGE_PERIODICITIES,
    CHARGE_TYPES,
    DOCUMENT_TYPES,
    REAL_ESTATE_MAINTENANCE_TYPES,
    RENTAL_STATUSES,
    RENTAL_STORED_STATUSES,
    UNIT_TYPES,
    type ChargePeriodicity,
    type ChargeType,
    type DocumentType,
    type RealEstateCharge,
    type RealEstateMaintenanceType,
    type RealEstateRental,
    type RentalStatus,
    type RentalStoredStatus,
    type UnitType
} from '@/features/real-estate/types';
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

export function formatRealEstateAmount(amount: number, currency: string, locale?: string): string {
    return formatAccountBalance(amount, currency as Currency, locale);
}

/** Nombre court (surface, pièces) : au plus 2 décimales, sans zéro inutile. */
export function formatShortNumber(value: number | null | undefined, locale?: string): string {
    if (value == null || !Number.isFinite(value)) return '';
    return new Intl.NumberFormat(locale || undefined, { maximumFractionDigits: 2 }).format(value);
}

/* ── gardes d’énumérations ───────────────────────────────────────────────── */

export function isUnitType(value: unknown): value is UnitType {
    return typeof value === 'string' && UNIT_TYPES.includes(value as UnitType);
}

export function isChargeType(value: unknown): value is ChargeType {
    return typeof value === 'string' && CHARGE_TYPES.includes(value as ChargeType);
}

export function isChargePeriodicity(value: unknown): value is ChargePeriodicity {
    return typeof value === 'string' && CHARGE_PERIODICITIES.includes(value as ChargePeriodicity);
}

export function isRealEstateMaintenanceType(value: unknown): value is RealEstateMaintenanceType {
    return typeof value === 'string' && REAL_ESTATE_MAINTENANCE_TYPES.includes(value as RealEstateMaintenanceType);
}

export function isDocumentType(value: unknown): value is DocumentType {
    return typeof value === 'string' && DOCUMENT_TYPES.includes(value as DocumentType);
}

export function isRentalStatus(value: unknown): value is RentalStatus {
    return typeof value === 'string' && RENTAL_STATUSES.includes(value as RentalStatus);
}

export function isRentalStoredStatus(value: unknown): value is RentalStoredStatus {
    return typeof value === 'string' && RENTAL_STORED_STATUSES.includes(value as RentalStoredStatus);
}

/* ── bien (racine assets) ────────────────────────────────────────────────── */

export function realEstateDetailsOf(asset: Pick<Asset, 'realEstate'> | null | undefined): RealEstateDetails | null {
    return asset?.realEstate?.details ?? null;
}

/** « Rue du Jura 1 · 2800 Delémont » — parties vides omises. */
export function formatRealEstateAddress(details: Partial<RealEstateDetails> | null | undefined): string {
    if (!details) return '';
    const line = emptyToNull(details.addressLine1);
    const town = [emptyToNull(details.postalCode), emptyToNull(details.city)].filter(Boolean).join(' ');
    return [line, town || null].filter(Boolean).join(' · ');
}

/** Texte de recherche d’un bien : nom, ville, adresse (lignes 1 et 2), NPA. */
export function realEstateSearchHaystack(asset: Pick<Asset, 'name' | 'realEstate'>): string {
    const details = realEstateDetailsOf(asset);
    return [asset.name, details?.city, details?.addressLine1, details?.addressLine2, details?.postalCode].filter(Boolean).join(' ');
}

export function matchesRealEstateSearch(asset: Pick<Asset, 'name' | 'realEstate'>, needle: string): boolean {
    return matchesSearchTokens(realEstateSearchHaystack(asset), needle);
}

/* ── charges ─────────────────────────────────────────────────────────────── */

/** Équivalent mensuel recalculé localement (l’API le renvoie : repli d’affichage seulement). */
export function monthlyEquivalentOf(amount: number, periodicity: ChargePeriodicity): number {
    switch (periodicity) {
        case 'mensuelle':
            return amount;
        case 'trimestrielle':
            return amount / 3;
        case 'semestrielle':
            return amount / 6;
        case 'annuelle':
            return amount / 12;
        default:
            return 0;
    }
}

/** Somme des équivalents mensuels des charges en cours. */
export function sumCurrentMonthlyCharges(charges: readonly Pick<RealEstateCharge, 'isCurrent' | 'monthlyEquivalent'>[]): number {
    return charges.filter((charge) => charge.isCurrent).reduce((sum, charge) => sum + (Number(charge.monthlyEquivalent) || 0), 0);
}

/** Liste triée : en cours d’abord, puis nom (reflète le tri serveur après une mutation locale). */
export function sortCharges<T extends Pick<RealEstateCharge, 'isCurrent' | 'name'>>(charges: T[]): T[] {
    return [...charges].sort((a, b) => {
        if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
}

/* ── baux ────────────────────────────────────────────────────────────────── */

const RENTAL_STATUS_ORDER: Record<RentalStatus, number> = { active: 0, aVenir: 1, suspendue: 2, terminee: 3 };

/** Tri serveur : actifs, à venir, suspendus, terminés, puis début décroissant. */
export function sortRentals<T extends Pick<RealEstateRental, 'status' | 'startDate'>>(rentals: T[]): T[] {
    return [...rentals].sort((a, b) => {
        const byStatus = RENTAL_STATUS_ORDER[a.status] - RENTAL_STATUS_ORDER[b.status];
        if (byStatus !== 0) return byStatus;
        return b.startDate.localeCompare(a.startDate);
    });
}

/** Un bail « vivant » (non terminé) bloque la suppression du lot et du locataire. */
export function isRentalAlive(rental: Pick<RealEstateRental, 'status'>): boolean {
    return rental.status !== 'terminee';
}

/** Loyer + charges locatives (mensuel). */
export function rentalMonthlyTotal(rental: Pick<RealEstateRental, 'monthlyRent' | 'monthlyCharges'>): number {
    return (Number(rental.monthlyRent) || 0) + (Number(rental.monthlyCharges) || 0);
}

/** Un fichier lié à un document vivant ne peut pas être supprimé sur `/api/files` (400). */
export function isFileLinkedToDocumentError(error: { status?: number; message?: string } | null | undefined): boolean {
    if (!error || error.status !== 400) return false;
    const message = (error.message ?? '').toLowerCase();
    return message.includes('document');
}

/* ── affichage ───────────────────────────────────────────────────────────── */

const MINUS = '\u2212';

/** Montant signé D.A. : `+` devant un positif, vrai signe moins (U+2212) devant un négatif. */
export function formatSignedRealEstateAmount(amount: number, currency: string, locale?: string): string {
    const value = Number(amount) || 0;
    const abs = formatRealEstateAmount(Math.abs(value), currency, locale);
    if (value > 0) return `+${abs}`;
    if (value < 0) return `${MINUS}${abs}`;
    return abs;
}

/** Période « 1 avr. 2026 – 31 mars 2027 » ; bornes vides omises (`''` si aucune). */
export function formatRealEstatePeriod(start: string | null | undefined, end: string | null | undefined, locale?: string): string {
    const from = formatCalendarDate(start, locale);
    const to = formatCalendarDate(end, locale);
    if (from && to) return `${from} – ${to}`;
    if (from) return `${from} –`;
    if (to) return `– ${to}`;
    return '';
}

/** Nom d’un lot par `publicId` (`null` si inconnu ou absent). */
export function unitNameOf(units: readonly { publicId: string; name: string }[], unitPublicId: string | null | undefined): string | null {
    if (!unitPublicId) return null;
    return units.find((unit) => unit.publicId === unitPublicId)?.name ?? null;
}
