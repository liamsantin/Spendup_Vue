/**
 * Actifs patrimoniaux — contrat API `/api/assets` (voir `docs/features/assets/contract.md`).
 * Un actif = une racine + **un** objet de détail selon `type`. Type et devise figés après création.
 */

export type AssetType = 'vehicule' | 'immobilier' | 'crypto' | 'objetValeur' | 'compteEpargne' | 'other';

export type AssetCurrency = 'CHF' | 'EUR' | 'USD' | 'GBP';

export type VehicleType = 'voiture' | 'moto' | 'scooter' | 'velo' | 'veloElectrique' | 'campingCar' | 'bateau' | 'other';

export type VehicleFuel = 'essence' | 'diesel' | 'hybride' | 'hybrideRechargeable' | 'electrique' | 'gpl' | 'other';

export type ValuableItemType = 'montre' | 'bijou' | 'oeuvreArt' | 'collection' | 'electronique' | 'meuble' | 'instrumentMusique' | 'other';

export type SavingsType = 'epargneClassique' | 'pilier3a' | 'pilier3b' | 'compteJeune' | 'compteProjet' | 'other';

export type PropertyType = 'appartement' | 'maison' | 'immeuble' | 'terrain' | 'garage' | 'placeParking' | 'localCommercial' | 'other';

export type AssetValuationSource = 'manuelle' | 'systeme' | 'import';

export type MileageSource = 'manuelle' | 'entretien' | (string & {});

export type VehicleMaintenanceType =
    | 'vidange'
    | 'pneus'
    | 'freins'
    | 'batterie'
    | 'controleTechnique'
    | 'revision'
    | 'reparation'
    | 'lavage'
    | 'other';

/* ── objets de détail ────────────────────────────────────────────────────── */

export type VehicleDetails = {
    brand: string;
    model: string;
    vehicleType: VehicleType;
    fuel: VehicleFuel | null;
    firstRegistrationYear: number | null;
    plate: string | null;
    /** Lecture : relevé le plus récent par date. Écriture : écrit aussi le relevé du jour. */
    currentMileage: number | null;
};

export type CryptoDetails = {
    name: string;
    /** Renvoyé en majuscules. */
    symbol: string;
    /** 12 décimales. */
    quantity: number;
    averagePurchasePrice: number | null;
    platform: string | null;
};

export type ValuableItemDetails = {
    itemType: ValuableItemType;
    brand: string | null;
    model: string | null;
    isInsured: boolean;
    insuredValue: number | null;
};

export type SavingsAccountDetails = {
    savingsType: SavingsType;
    /** Compte actif possédé : la valeur suit le solde (`isValueFromAccount`). */
    accountPublicId: string | null;
    interestRate: number | null;
    isBlocked: boolean;
    releaseDate: string | null;
};

export type OtherAssetDetails = {
    /** Vide = nom de l’actif. */
    customType: string | null;
};

/** Détail plat d’un bien immobilier (requête d’actif et `realEstate.details` en réponse). */
export type RealEstateDetails = {
    propertyType: PropertyType;
    addressLine1: string | null;
    addressLine2: string | null;
    postalCode: string | null;
    city: string | null;
    /** 2 lettres, renvoyé en majuscules. */
    country: string | null;
    livingAreaM2: number | null;
    landAreaM2: number | null;
    rooms: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    floor: number | null;
    hasElevator: boolean;
    hasBalcony: boolean;
    hasCellar: boolean;
    hasGarage: boolean;
    constructionYear: number | null;
    renovationYear: number | null;
    /** Informatif, jamais sommé. */
    taxValue: number | null;
};

/** Synthèse d’un bien — renseignée sur `GET /api/assets/{id}` uniquement. */
export type RealEstateSummary = {
    /** Σ passifs actifs liés, dans la devise du bien. */
    mortgageRemaining: number;
    /** Passifs liés dans une autre devise (non sommés). */
    mortgageExcludedCount: number;
    /** Valeur estimée − hypothèque. */
    equity: number;
    isRented: boolean;
    monthlyRent: number;
    monthlyRentalCharges: number;
    monthlyCharges: number;
    maintenanceTotal: number;
    unitsCount: number;
    chargesCount: number;
    maintenanceCount: number;
    documentsCount: number;
    rentalsCount: number;
    activeRentalsCount: number;
};

export type RealEstateResponse = {
    details: RealEstateDetails;
    /** `null` en liste. */
    summary: RealEstateSummary | null;
};

/* ── racine ──────────────────────────────────────────────────────────────── */

export type Asset = {
    publicId: string;
    name: string;
    type: AssetType;
    estimatedValue: number;
    currency: AssetCurrency;
    acquisitionDate: string | null;
    acquisitionPrice: number | null;
    description: string | null;
    notes: string | null;
    /** `false` = vendu / cédé : visible avec `active=false`, hors patrimoine net. */
    isActive: boolean;
    lastValuationDate: string | null;
    /** Épargne adossée à un compte : la valeur est le solde du compte, en lecture seule. */
    isValueFromAccount: boolean;
    vehicle: VehicleDetails | null;
    crypto: CryptoDetails | null;
    valuableItem: ValuableItemDetails | null;
    savingsAccount: SavingsAccountDetails | null;
    other: OtherAssetDetails | null;
    realEstate: RealEstateResponse | null;
    createdAt: string;
    updatedAt: string | null;
};

export type AssetsListResult = {
    items: Asset[];
    totalCount: number;
};

export type ListAssetsQuery = {
    type?: AssetType;
    /** `true` / `false` / omis (tous). */
    active?: boolean;
};

/** Détails envoyés : seulement celui du `type` (les autres ignorés par l’API). */
export type AssetDetailsPayload = {
    vehicle?: VehicleDetails | null;
    crypto?: CryptoDetails | null;
    valuableItem?: ValuableItemDetails | null;
    savingsAccount?: SavingsAccountDetails | null;
    other?: OtherAssetDetails | null;
    realEstate?: RealEstateDetails | null;
};

export type CreateAssetPayload = AssetDetailsPayload & {
    name: string;
    type: AssetType;
    estimatedValue: number;
    /** `null` = devise par défaut des settings. */
    currency?: AssetCurrency | null;
    acquisitionDate?: string | null;
    acquisitionPrice?: number | null;
    description?: string | null;
    notes?: string | null;
};

/** PUT état complet : sans `type`, avec `currency` (égale à la devise stockée) et `isActive`. */
export type UpdateAssetPayload = AssetDetailsPayload & {
    name: string;
    estimatedValue: number;
    currency: AssetCurrency;
    acquisitionDate: string | null;
    acquisitionPrice: number | null;
    description: string | null;
    notes: string | null;
    isActive: boolean;
};

/* ── valorisations ───────────────────────────────────────────────────────── */

export type AssetValuation = {
    /** `yyyy-MM-dd` — clé (une par jour). */
    valuationDate: string;
    value: number;
    source: AssetValuationSource;
    createdAt: string;
    updatedAt: string | null;
};

export type AssetValuationsListResult = {
    items: AssetValuation[];
    totalCount: number;
};

export type ListAssetValuationsQuery = {
    from?: string;
    to?: string;
};

export type SaveAssetValuationPayload = {
    valuationDate: string;
    value: number;
};

/* ── véhicule : relevés et entretiens ────────────────────────────────────── */

export type VehicleMileage = {
    /** `yyyy-MM-dd` — clé. */
    statementDate: string;
    kilometrage: number;
    source: MileageSource;
    createdAt: string;
};

export type VehicleMileagesListResult = {
    items: VehicleMileage[];
    totalCount: number;
};

export type SaveVehicleMileagePayload = {
    statementDate: string;
    kilometrage: number;
};

export type VehicleMaintenance = {
    publicId: string;
    maintenanceDate: string;
    maintenanceType: VehicleMaintenanceType;
    kilometrage: number | null;
    garageTierPublicId: string | null;
    garageTierName: string | null;
    cost: number | null;
    /** = devise de l’actif. */
    currency: AssetCurrency;
    transactionPublicId: string | null;
    description: string | null;
    nextMaintenanceDate: string | null;
    nextMaintenanceKm: number | null;
    createdAt: string;
    updatedAt: string | null;
};

export type VehicleMaintenancesListResult = {
    items: VehicleMaintenance[];
    totalCount: number;
};

/** POST / PUT (état complet). `transactionPublicId` = dépense possédée. */
export type SaveVehicleMaintenancePayload = {
    maintenanceDate: string;
    maintenanceType: VehicleMaintenanceType;
    kilometrage: number | null;
    garageTierPublicId: string | null;
    cost: number | null;
    transactionPublicId: string | null;
    description: string | null;
    nextMaintenanceDate: string | null;
    nextMaintenanceKm: number | null;
};

/* ── constantes ──────────────────────────────────────────────────────────── */

export const ASSET_TYPES: AssetType[] = ['vehicule', 'immobilier', 'crypto', 'objetValeur', 'compteEpargne', 'other'];

export const ASSET_CURRENCIES: AssetCurrency[] = ['CHF', 'EUR', 'USD', 'GBP'];

export const VEHICLE_TYPES: VehicleType[] = ['voiture', 'moto', 'scooter', 'velo', 'veloElectrique', 'campingCar', 'bateau', 'other'];

export const VEHICLE_FUELS: VehicleFuel[] = ['essence', 'diesel', 'hybride', 'hybrideRechargeable', 'electrique', 'gpl', 'other'];

export const VALUABLE_ITEM_TYPES: ValuableItemType[] = [
    'montre',
    'bijou',
    'oeuvreArt',
    'collection',
    'electronique',
    'meuble',
    'instrumentMusique',
    'other'
];

export const SAVINGS_TYPES: SavingsType[] = ['epargneClassique', 'pilier3a', 'pilier3b', 'compteJeune', 'compteProjet', 'other'];

export const PROPERTY_TYPES: PropertyType[] = [
    'appartement',
    'maison',
    'immeuble',
    'terrain',
    'garage',
    'placeParking',
    'localCommercial',
    'other'
];

export const VEHICLE_MAINTENANCE_TYPES: VehicleMaintenanceType[] = [
    'vidange',
    'pneus',
    'freins',
    'batterie',
    'controleTechnique',
    'revision',
    'reparation',
    'lavage',
    'other'
];

export const ASSET_NAME_MAX = 150;
export const ASSET_DESCRIPTION_MAX = 500;
export const ASSET_NOTES_MAX = 2000;
export const VEHICLE_MAINTENANCE_DESCRIPTION_MAX = 500;

export const ASSET_NOT_FOUND_MESSAGE = 'Actif introuvable.';
