/**
 * Immobilier — sous-ressources d’un actif `immobilier` (`/api/assets/{assetPublicId}/real-estate/*`).
 * Voir `docs/features/real-estate/contract.md`. Le bien lui-même (racine + `realEstate.details` / `summary`)
 * est porté par `@/features/assets`.
 */
import type { AssetCurrency } from '@/features/assets/types';

export type UnitType =
    | 'appartement'
    | 'chambre'
    | 'localCommercial'
    | 'bureau'
    | 'garage'
    | 'placeParking'
    | 'cave'
    | 'grenier'
    | 'terrain'
    | 'other';

export type ChargeType =
    | 'ppe'
    | 'syndic'
    | 'eau'
    | 'electricite'
    | 'chauffage'
    | 'assuranceBatiment'
    | 'taxeFonciere'
    | 'impotImmobilier'
    | 'entretien'
    | 'fondsRenovation'
    | 'ordures'
    | 'other';

export type ChargePeriodicity = 'ponctuelle' | 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle';

export type RealEstateMaintenanceType =
    | 'peinture'
    | 'plomberie'
    | 'electricite'
    | 'chauffage'
    | 'toiture'
    | 'facade'
    | 'sols'
    | 'fenetres'
    | 'cuisine'
    | 'salleBain'
    | 'renovation'
    | 'reparation'
    | 'controle'
    | 'other';

export type DocumentType =
    | 'acteVente'
    | 'contratBail'
    | 'hypotheque'
    | 'assurance'
    | 'factureTravaux'
    | 'diagnostic'
    | 'photo'
    | 'plan'
    | 'impot'
    | 'other';

/** Statut **effectif** d’un bail (dérivé côté serveur). `aVenir` n’est jamais envoyé. */
export type RentalStatus = 'active' | 'suspendue' | 'terminee' | 'aVenir';

/** Statut stocké (envoyable en PUT). */
export type RentalStoredStatus = Exclude<RentalStatus, 'aVenir'>;

/* ── lots ────────────────────────────────────────────────────────────────── */

export type RealEstateUnit = {
    publicId: string;
    name: string;
    unitType: UnitType;
    surfaceM2: number | null;
    rooms: number | null;
    floor: number | null;
    isRentable: boolean;
    /** Dérivé : un bail effectif actif couvre le lot. */
    isOccupied: boolean;
    notes: string | null;
    createdAt: string;
    updatedAt: string | null;
};

/** POST et PUT (état complet). */
export type SaveRealEstateUnitPayload = {
    name: string;
    unitType: UnitType;
    surfaceM2: number | null;
    rooms: number | null;
    floor: number | null;
    isRentable: boolean;
    notes: string | null;
};

/* ── charges ─────────────────────────────────────────────────────────────── */

export type RealEstateCharge = {
    publicId: string;
    name: string;
    chargeType: ChargeType;
    amount: number;
    periodicity: ChargePeriodicity;
    startDate: string | null;
    endDate: string | null;
    unitPublicId: string | null;
    tierPublicId: string | null;
    tierName: string | null;
    transactionPublicId: string | null;
    /** = devise du bien. */
    currency: AssetCurrency;
    /** Ponctuelle 0, mensuelle ×1, trimestrielle /3, semestrielle /6, annuelle /12. */
    monthlyEquivalent: number;
    /** En cours aujourd’hui (fuseau des settings). */
    isCurrent: boolean;
    createdAt: string;
    updatedAt: string | null;
};

export type SaveRealEstateChargePayload = {
    name: string;
    chargeType: ChargeType;
    amount: number;
    periodicity: ChargePeriodicity;
    startDate: string | null;
    endDate: string | null;
    unitPublicId: string | null;
    tierPublicId: string | null;
    /** Dépense possédée. */
    transactionPublicId: string | null;
};

/* ── travaux ─────────────────────────────────────────────────────────────── */

export type RealEstateMaintenance = {
    publicId: string;
    maintenanceDate: string;
    maintenanceType: RealEstateMaintenanceType;
    description: string | null;
    cost: number | null;
    currency: AssetCurrency;
    nextMaintenanceDate: string | null;
    unitPublicId: string | null;
    providerTierPublicId: string | null;
    providerTierName: string | null;
    transactionPublicId: string | null;
    createdAt: string;
    updatedAt: string | null;
};

export type SaveRealEstateMaintenancePayload = {
    maintenanceDate: string;
    maintenanceType: RealEstateMaintenanceType;
    description: string | null;
    cost: number | null;
    nextMaintenanceDate: string | null;
    unitPublicId: string | null;
    providerTierPublicId: string | null;
    transactionPublicId: string | null;
};

/* ── documents ───────────────────────────────────────────────────────────── */

export type RealEstateDocumentFile = {
    publicId: string;
    nameOriginal: string;
    sizeBytes: number;
    mimeType: string;
};

export type RealEstateDocument = {
    publicId: string;
    /** Défaut = nom du fichier. */
    name: string;
    documentType: DocumentType;
    /** Défaut = date du fichier. */
    documentDate: string | null;
    notes: string | null;
    unitPublicId: string | null;
    file: RealEstateDocumentFile;
    createdAt: string;
    updatedAt: string | null;
};

export type CreateRealEstateDocumentPayload = {
    /** Fichier déjà uploadé sur `/api/files`. */
    filePublicId: string;
    documentType: DocumentType;
    name: string | null;
    documentDate: string | null;
    notes: string | null;
    unitPublicId: string | null;
};

/** Le fichier ne change pas (supprimer puis recréer). */
export type UpdateRealEstateDocumentPayload = {
    name: string | null;
    documentType: DocumentType;
    documentDate: string | null;
    notes: string | null;
    unitPublicId: string | null;
};

/* ── baux ────────────────────────────────────────────────────────────────── */

export type RealEstateRental = {
    publicId: string;
    tenantTierPublicId: string;
    tenantName: string | null;
    unitPublicId: string | null;
    startDate: string;
    endDate: string | null;
    monthlyRent: number;
    monthlyCharges: number | null;
    deposit: number | null;
    currency: AssetCurrency;
    /** Effectif (dérivé). */
    status: RentalStatus;
    storedStatus: RentalStoredStatus;
    recurringIncomePublicId: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string | null;
};

export type CreateRealEstateRentalPayload = {
    tenantTierPublicId: string;
    startDate: string;
    monthlyRent: number;
    endDate: string | null;
    monthlyCharges: number | null;
    deposit: number | null;
    unitPublicId: string | null;
    recurringIncomePublicId: string | null;
    notes: string | null;
};

/** PUT : mêmes champs + `status` (`null` = le serveur décide). */
export type UpdateRealEstateRentalPayload = CreateRealEstateRentalPayload & {
    status: RentalStoredStatus | null;
};

export type ListRealEstateRentalsQuery = {
    status?: RentalStatus;
};

/* ── listes ──────────────────────────────────────────────────────────────── */

export type RealEstateListResult<T> = {
    items: T[];
    totalCount: number;
};

export type RealEstateResourceKind = 'units' | 'charges' | 'maintenance' | 'documents' | 'rentals';

/* ── constantes ──────────────────────────────────────────────────────────── */

export const UNIT_TYPES: UnitType[] = [
    'appartement',
    'chambre',
    'localCommercial',
    'bureau',
    'garage',
    'placeParking',
    'cave',
    'grenier',
    'terrain',
    'other'
];

export const CHARGE_TYPES: ChargeType[] = [
    'ppe',
    'syndic',
    'eau',
    'electricite',
    'chauffage',
    'assuranceBatiment',
    'taxeFonciere',
    'impotImmobilier',
    'entretien',
    'fondsRenovation',
    'ordures',
    'other'
];

export const CHARGE_PERIODICITIES: ChargePeriodicity[] = ['ponctuelle', 'mensuelle', 'trimestrielle', 'semestrielle', 'annuelle'];

export const REAL_ESTATE_MAINTENANCE_TYPES: RealEstateMaintenanceType[] = [
    'peinture',
    'plomberie',
    'electricite',
    'chauffage',
    'toiture',
    'facade',
    'sols',
    'fenetres',
    'cuisine',
    'salleBain',
    'renovation',
    'reparation',
    'controle',
    'other'
];

export const DOCUMENT_TYPES: DocumentType[] = [
    'acteVente',
    'contratBail',
    'hypotheque',
    'assurance',
    'factureTravaux',
    'diagnostic',
    'photo',
    'plan',
    'impot',
    'other'
];

export const RENTAL_STATUSES: RentalStatus[] = ['active', 'aVenir', 'suspendue', 'terminee'];

/** Statuts envoyables en PUT (jamais `aVenir`). */
export const RENTAL_STORED_STATUSES: RentalStoredStatus[] = ['active', 'suspendue', 'terminee'];

export const REAL_ESTATE_RESOURCE_KINDS: RealEstateResourceKind[] = ['units', 'charges', 'maintenance', 'documents', 'rentals'];

export const REAL_ESTATE_NAME_MAX = 150;
export const REAL_ESTATE_DESCRIPTION_MAX = 500;
export const REAL_ESTATE_NOTES_MAX = 2000;

export const REAL_ESTATE_UNIT_NOT_FOUND_MESSAGE = 'Lot introuvable.';
export const REAL_ESTATE_CHARGE_NOT_FOUND_MESSAGE = 'Charge introuvable.';
export const REAL_ESTATE_MAINTENANCE_NOT_FOUND_MESSAGE = 'Travaux introuvables.';
export const REAL_ESTATE_DOCUMENT_NOT_FOUND_MESSAGE = 'Document introuvable.';
export const REAL_ESTATE_RENTAL_NOT_FOUND_MESSAGE = 'Bail introuvable.';
export const REAL_ESTATE_ASSET_NOT_FOUND_MESSAGE = 'Bien introuvable.';
