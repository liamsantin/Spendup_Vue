import { parseAccountAmount } from '@/features/accounts/format';
import { emptyToNull, isAssetCurrency, isAssetType, isValidYmd } from '@/features/assets/format';
import {
    ASSET_DESCRIPTION_MAX,
    ASSET_NAME_MAX,
    ASSET_NOTES_MAX,
    PROPERTY_TYPES,
    SAVINGS_TYPES,
    VALUABLE_ITEM_TYPES,
    VEHICLE_FUELS,
    VEHICLE_MAINTENANCE_DESCRIPTION_MAX,
    VEHICLE_MAINTENANCE_TYPES,
    VEHICLE_TYPES,
    type Asset,
    type AssetCurrency,
    type AssetDetailsPayload,
    type AssetType,
    type CreateAssetPayload,
    type CryptoDetails,
    type OtherAssetDetails,
    type PropertyType,
    type RealEstateDetails,
    type SaveAssetValuationPayload,
    type SaveVehicleMaintenancePayload,
    type SaveVehicleMileagePayload,
    type SavingsAccountDetails,
    type SavingsType,
    type UpdateAssetPayload,
    type ValuableItemDetails,
    type ValuableItemType,
    type VehicleDetails,
    type VehicleFuel,
    type VehicleMaintenance,
    type VehicleMaintenanceType,
    type VehicleType
} from '@/features/assets/types';

/* ── codes d’erreur ──────────────────────────────────────────────────────── */

export type AssetPayloadErrorCode =
    | 'nameRequired'
    | 'nameTooLong'
    | 'typeInvalid'
    | 'estimatedValueInvalid'
    | 'estimatedValueNegative'
    | 'acquisitionPriceInvalid'
    | 'acquisitionPriceNegative'
    | 'acquisitionDateInvalid'
    | 'descriptionTooLong'
    | 'notesTooLong'
    | 'currencyInvalid'
    | 'currencyLocked'
    | 'vehicleBrandRequired'
    | 'vehicleModelRequired'
    | 'vehicleTypeInvalid'
    | 'vehicleFuelInvalid'
    | 'vehicleYearInvalid'
    | 'vehicleMileageInvalid'
    | 'cryptoNameRequired'
    | 'cryptoSymbolRequired'
    | 'cryptoQuantityInvalid'
    | 'cryptoAveragePriceInvalid'
    | 'valuableItemTypeInvalid'
    | 'insuredValueInvalid'
    | 'savingsTypeInvalid'
    | 'accountInvalid'
    | 'interestRateInvalid'
    | 'releaseDateInvalid'
    | 'propertyTypeInvalid'
    | 'countryInvalid'
    | 'realEstateNumberInvalid'
    | 'valuationDateInvalid'
    | 'valuationDateFuture'
    | 'valuationValueInvalid'
    | 'valuationValueNegative'
    | 'mileageDateInvalid'
    | 'mileageDateFuture'
    | 'kilometrageInvalid'
    | 'maintenanceTypeInvalid'
    | 'maintenanceDateInvalid'
    | 'maintenanceDateFuture'
    | 'costInvalid'
    | 'nextMaintenanceDateInvalid'
    | 'nextMaintenanceBeforeDate'
    | 'nextMaintenanceKmInvalid'
    | 'maintenanceDescriptionTooLong';

export type BuildAssetPayloadOk<T> = { ok: true; payload: T };
export type BuildAssetPayloadFail = { ok: false; code: AssetPayloadErrorCode; field?: string };
export type BuildAssetPayloadResult<T> = BuildAssetPayloadOk<T> | BuildAssetPayloadFail;

function fail(code: AssetPayloadErrorCode, field?: string): BuildAssetPayloadFail {
    return field ? { ok: false, code, field } : { ok: false, code };
}

/* ── champs de formulaire ────────────────────────────────────────────────── */

export type VehicleFormFields = {
    brand: string;
    model: string;
    vehicleType: VehicleType | '';
    fuel: VehicleFuel | '';
    firstRegistrationYear: string;
    plate: string;
    currentMileage: string;
};

export type CryptoFormFields = {
    name: string;
    symbol: string;
    quantity: string;
    averagePurchasePrice: string;
    platform: string;
};

export type ValuableItemFormFields = {
    itemType: ValuableItemType | '';
    brand: string;
    model: string;
    isInsured: boolean;
    insuredValue: string;
};

export type SavingsAccountFormFields = {
    savingsType: SavingsType | '';
    accountPublicId: string;
    interestRate: string;
    isBlocked: boolean;
    releaseDate: string | null;
};

export type OtherFormFields = {
    customType: string;
};

export type RealEstateFormFields = {
    propertyType: PropertyType | '';
    addressLine1: string;
    addressLine2: string;
    postalCode: string;
    city: string;
    country: string;
    livingAreaM2: string;
    landAreaM2: string;
    rooms: string;
    bedrooms: string;
    bathrooms: string;
    floor: string;
    hasElevator: boolean;
    hasBalcony: boolean;
    hasCellar: boolean;
    hasGarage: boolean;
    constructionYear: string;
    renovationYear: string;
    taxValue: string;
};

export type AssetFormFields = {
    name: string;
    type: AssetType | '';
    estimatedValue: string;
    currency: AssetCurrency | '';
    acquisitionDate: string | null;
    acquisitionPrice: string;
    description: string;
    notes: string;
    /** Édition : « cédé / vendu » = `isActive: false`. */
    sold: boolean;
    vehicle: VehicleFormFields;
    crypto: CryptoFormFields;
    valuableItem: ValuableItemFormFields;
    savingsAccount: SavingsAccountFormFields;
    other: OtherFormFields;
    realEstate: RealEstateFormFields;
};

export type AssetPayloadContext = {
    /** Devise figée à la création — obligatoire en PUT. */
    lockedCurrency?: AssetCurrency | null;
    /** Type figé — obligatoire en PUT. */
    lockedType?: AssetType | null;
    /** Comptes actifs possédés autorisés pour une épargne adossée. */
    allowedAccountIds?: ReadonlySet<string>;
    /** Épargne adossée : la valeur saisie est ignorée, on recopie la valeur courante. */
    isValueFromAccount?: boolean;
    currentEstimatedValue?: number | null;
};

export type AssetSubPayloadContext = {
    /** `yyyy-MM-dd` dans le fuseau des settings — les dates futures sont refusées. */
    today?: string | null;
};

function numberString(value: number | null | undefined): string {
    return value == null ? '' : String(value);
}

export function emptyVehicleFormFields(): VehicleFormFields {
    return { brand: '', model: '', vehicleType: 'voiture', fuel: '', firstRegistrationYear: '', plate: '', currentMileage: '' };
}

export function emptyCryptoFormFields(): CryptoFormFields {
    return { name: '', symbol: '', quantity: '', averagePurchasePrice: '', platform: '' };
}

export function emptyValuableItemFormFields(): ValuableItemFormFields {
    return { itemType: 'montre', brand: '', model: '', isInsured: false, insuredValue: '' };
}

export function emptySavingsAccountFormFields(): SavingsAccountFormFields {
    return { savingsType: 'epargneClassique', accountPublicId: '', interestRate: '', isBlocked: false, releaseDate: null };
}

export function emptyOtherFormFields(): OtherFormFields {
    return { customType: '' };
}

export function emptyRealEstateFormFields(): RealEstateFormFields {
    return {
        propertyType: 'appartement',
        addressLine1: '',
        addressLine2: '',
        postalCode: '',
        city: '',
        country: 'CH',
        livingAreaM2: '',
        landAreaM2: '',
        rooms: '',
        bedrooms: '',
        bathrooms: '',
        floor: '',
        hasElevator: false,
        hasBalcony: false,
        hasCellar: false,
        hasGarage: false,
        constructionYear: '',
        renovationYear: '',
        taxValue: ''
    };
}

export function emptyAssetFormFields(defaults: { type?: AssetType | ''; currency?: AssetCurrency | '' } = {}): AssetFormFields {
    return {
        name: '',
        type: defaults.type ?? '',
        estimatedValue: '',
        currency: defaults.currency ?? '',
        acquisitionDate: null,
        acquisitionPrice: '',
        description: '',
        notes: '',
        sold: false,
        vehicle: emptyVehicleFormFields(),
        crypto: emptyCryptoFormFields(),
        valuableItem: emptyValuableItemFormFields(),
        savingsAccount: emptySavingsAccountFormFields(),
        other: emptyOtherFormFields(),
        realEstate: emptyRealEstateFormFields()
    };
}

export function assetToFormFields(asset: Asset): AssetFormFields {
    const fields = emptyAssetFormFields({ type: asset.type, currency: asset.currency });
    fields.name = asset.name;
    fields.estimatedValue = String(asset.estimatedValue);
    fields.acquisitionDate = asset.acquisitionDate;
    fields.acquisitionPrice = numberString(asset.acquisitionPrice);
    fields.description = asset.description ?? '';
    fields.notes = asset.notes ?? '';
    fields.sold = !asset.isActive;
    if (asset.vehicle) {
        fields.vehicle = {
            brand: asset.vehicle.brand,
            model: asset.vehicle.model,
            vehicleType: asset.vehicle.vehicleType,
            fuel: asset.vehicle.fuel ?? '',
            firstRegistrationYear: numberString(asset.vehicle.firstRegistrationYear),
            plate: asset.vehicle.plate ?? '',
            currentMileage: numberString(asset.vehicle.currentMileage)
        };
    }
    if (asset.crypto) {
        fields.crypto = {
            name: asset.crypto.name,
            symbol: asset.crypto.symbol,
            quantity: String(asset.crypto.quantity),
            averagePurchasePrice: numberString(asset.crypto.averagePurchasePrice),
            platform: asset.crypto.platform ?? ''
        };
    }
    if (asset.valuableItem) {
        fields.valuableItem = {
            itemType: asset.valuableItem.itemType,
            brand: asset.valuableItem.brand ?? '',
            model: asset.valuableItem.model ?? '',
            isInsured: asset.valuableItem.isInsured,
            insuredValue: numberString(asset.valuableItem.insuredValue)
        };
    }
    if (asset.savingsAccount) {
        fields.savingsAccount = {
            savingsType: asset.savingsAccount.savingsType,
            accountPublicId: asset.savingsAccount.accountPublicId ?? '',
            interestRate: numberString(asset.savingsAccount.interestRate),
            isBlocked: asset.savingsAccount.isBlocked,
            releaseDate: asset.savingsAccount.releaseDate
        };
    }
    if (asset.other) {
        fields.other = { customType: asset.other.customType ?? '' };
    }
    if (asset.realEstate) {
        const d = asset.realEstate.details;
        fields.realEstate = {
            propertyType: d.propertyType,
            addressLine1: d.addressLine1 ?? '',
            addressLine2: d.addressLine2 ?? '',
            postalCode: d.postalCode ?? '',
            city: d.city ?? '',
            country: d.country ?? '',
            livingAreaM2: numberString(d.livingAreaM2),
            landAreaM2: numberString(d.landAreaM2),
            rooms: numberString(d.rooms),
            bedrooms: numberString(d.bedrooms),
            bathrooms: numberString(d.bathrooms),
            floor: numberString(d.floor),
            hasElevator: d.hasElevator,
            hasBalcony: d.hasBalcony,
            hasCellar: d.hasCellar,
            hasGarage: d.hasGarage,
            constructionYear: numberString(d.constructionYear),
            renovationYear: numberString(d.renovationYear),
            taxValue: numberString(d.taxValue)
        };
    }
    return fields;
}

/* ── parseurs ────────────────────────────────────────────────────────────── */

type Parsed<T> = { ok: true; value: T } | BuildAssetPayloadFail;

/** Montant optionnel (`''` → null), ≥ 0 si `nonNegative`. */
function optionalAmount(raw: string, code: AssetPayloadErrorCode, field: string, nonNegative = true): Parsed<number | null> {
    const trimmed = raw.trim();
    if (!trimmed) return { ok: true, value: null };
    const parsed = parseAccountAmount(trimmed);
    if (parsed == null) return fail(code, field);
    if (nonNegative && parsed < 0) return fail(code, field);
    return { ok: true, value: parsed };
}

/** Nombre décimal libre (quantité crypto à 12 décimales, surfaces…), ≥ 0. */
function optionalDecimal(raw: string, code: AssetPayloadErrorCode, field: string): Parsed<number | null> {
    const trimmed = raw.trim().replace(/\s|'/g, '').replace(',', '.');
    if (!trimmed) return { ok: true, value: null };
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return fail(code, field);
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) return fail(code, field);
    return { ok: true, value: n };
}

/** Entier optionnel ≥ 0 (kilométrage, pièces, étage peut être négatif si `allowNegative`). */
function optionalInteger(raw: string, code: AssetPayloadErrorCode, field: string, allowNegative = false): Parsed<number | null> {
    const trimmed = raw.trim().replace(/\s|'/g, '');
    if (!trimmed) return { ok: true, value: null };
    if (!/^-?\d+$/.test(trimmed)) return fail(code, field);
    const n = Number(trimmed);
    if (!Number.isSafeInteger(n) || (!allowNegative && n < 0)) return fail(code, field);
    return { ok: true, value: n };
}

function optionalYear(raw: string, code: AssetPayloadErrorCode, field: string): Parsed<number | null> {
    const parsed = optionalInteger(raw, code, field);
    if (!parsed.ok) return parsed;
    if (parsed.value != null && (parsed.value < 1800 || parsed.value > 2200)) return fail(code, field);
    return parsed;
}

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
    return typeof value === 'string' && list.includes(value as T);
}

/* ── détails par type ────────────────────────────────────────────────────── */

function buildVehicle(f: VehicleFormFields): Parsed<VehicleDetails> {
    const brand = f.brand.trim();
    if (!brand) return fail('vehicleBrandRequired', 'vehicle.brand');
    const model = f.model.trim();
    if (!model) return fail('vehicleModelRequired', 'vehicle.model');
    if (!isOneOf(VEHICLE_TYPES, f.vehicleType)) return fail('vehicleTypeInvalid', 'vehicle.vehicleType');
    const fuelRaw = emptyToNull(f.fuel);
    if (fuelRaw && !isOneOf(VEHICLE_FUELS, fuelRaw)) return fail('vehicleFuelInvalid', 'vehicle.fuel');
    const year = optionalYear(f.firstRegistrationYear, 'vehicleYearInvalid', 'vehicle.firstRegistrationYear');
    if (!year.ok) return year;
    const mileage = optionalInteger(f.currentMileage, 'vehicleMileageInvalid', 'vehicle.currentMileage');
    if (!mileage.ok) return mileage;
    return {
        ok: true,
        value: {
            brand,
            model,
            vehicleType: f.vehicleType,
            fuel: (fuelRaw as VehicleFuel | null) ?? null,
            firstRegistrationYear: year.value,
            plate: emptyToNull(f.plate),
            currentMileage: mileage.value
        }
    };
}

function buildCrypto(f: CryptoFormFields): Parsed<CryptoDetails> {
    const name = f.name.trim();
    if (!name) return fail('cryptoNameRequired', 'crypto.name');
    const symbol = f.symbol.trim().toUpperCase();
    if (!symbol) return fail('cryptoSymbolRequired', 'crypto.symbol');
    const quantity = optionalDecimal(f.quantity, 'cryptoQuantityInvalid', 'crypto.quantity');
    if (!quantity.ok) return quantity;
    if (quantity.value == null) return fail('cryptoQuantityInvalid', 'crypto.quantity');
    const average = optionalAmount(f.averagePurchasePrice, 'cryptoAveragePriceInvalid', 'crypto.averagePurchasePrice');
    if (!average.ok) return average;
    return {
        ok: true,
        value: { name, symbol, quantity: quantity.value, averagePurchasePrice: average.value, platform: emptyToNull(f.platform) }
    };
}

function buildValuableItem(f: ValuableItemFormFields): Parsed<ValuableItemDetails> {
    if (!isOneOf(VALUABLE_ITEM_TYPES, f.itemType)) return fail('valuableItemTypeInvalid', 'valuableItem.itemType');
    const insured = optionalAmount(f.insuredValue, 'insuredValueInvalid', 'valuableItem.insuredValue');
    if (!insured.ok) return insured;
    return {
        ok: true,
        value: {
            itemType: f.itemType,
            brand: emptyToNull(f.brand),
            model: emptyToNull(f.model),
            isInsured: !!f.isInsured,
            insuredValue: f.isInsured ? insured.value : null
        }
    };
}

function buildSavingsAccount(f: SavingsAccountFormFields, context: AssetPayloadContext): Parsed<SavingsAccountDetails> {
    if (!isOneOf(SAVINGS_TYPES, f.savingsType)) return fail('savingsTypeInvalid', 'savingsAccount.savingsType');
    const accountPublicId = emptyToNull(f.accountPublicId);
    if (accountPublicId && context.allowedAccountIds && !context.allowedAccountIds.has(accountPublicId)) {
        return fail('accountInvalid', 'savingsAccount.accountPublicId');
    }
    const rate = optionalDecimal(f.interestRate, 'interestRateInvalid', 'savingsAccount.interestRate');
    if (!rate.ok) return rate;
    if (rate.value != null && rate.value > 100) return fail('interestRateInvalid', 'savingsAccount.interestRate');
    const releaseDate = emptyToNull(f.releaseDate);
    if (releaseDate && !isValidYmd(releaseDate)) return fail('releaseDateInvalid', 'savingsAccount.releaseDate');
    return {
        ok: true,
        value: { savingsType: f.savingsType, accountPublicId, interestRate: rate.value, isBlocked: !!f.isBlocked, releaseDate }
    };
}

function buildOther(f: OtherFormFields): Parsed<OtherAssetDetails> {
    return { ok: true, value: { customType: emptyToNull(f.customType) } };
}

function buildRealEstate(f: RealEstateFormFields): Parsed<RealEstateDetails> {
    if (!isOneOf(PROPERTY_TYPES, f.propertyType)) return fail('propertyTypeInvalid', 'realEstate.propertyType');
    const countryRaw = emptyToNull(f.country)?.toUpperCase() ?? null;
    if (countryRaw && !/^[A-Z]{2}$/.test(countryRaw)) return fail('countryInvalid', 'realEstate.country');
    const livingArea = optionalDecimal(f.livingAreaM2, 'realEstateNumberInvalid', 'realEstate.livingAreaM2');
    if (!livingArea.ok) return livingArea;
    const landArea = optionalDecimal(f.landAreaM2, 'realEstateNumberInvalid', 'realEstate.landAreaM2');
    if (!landArea.ok) return landArea;
    const rooms = optionalDecimal(f.rooms, 'realEstateNumberInvalid', 'realEstate.rooms');
    if (!rooms.ok) return rooms;
    const bedrooms = optionalInteger(f.bedrooms, 'realEstateNumberInvalid', 'realEstate.bedrooms');
    if (!bedrooms.ok) return bedrooms;
    const bathrooms = optionalInteger(f.bathrooms, 'realEstateNumberInvalid', 'realEstate.bathrooms');
    if (!bathrooms.ok) return bathrooms;
    const floor = optionalInteger(f.floor, 'realEstateNumberInvalid', 'realEstate.floor', true);
    if (!floor.ok) return floor;
    const constructionYear = optionalYear(f.constructionYear, 'realEstateNumberInvalid', 'realEstate.constructionYear');
    if (!constructionYear.ok) return constructionYear;
    const renovationYear = optionalYear(f.renovationYear, 'realEstateNumberInvalid', 'realEstate.renovationYear');
    if (!renovationYear.ok) return renovationYear;
    const taxValue = optionalAmount(f.taxValue, 'realEstateNumberInvalid', 'realEstate.taxValue');
    if (!taxValue.ok) return taxValue;
    return {
        ok: true,
        value: {
            propertyType: f.propertyType,
            addressLine1: emptyToNull(f.addressLine1),
            addressLine2: emptyToNull(f.addressLine2),
            postalCode: emptyToNull(f.postalCode),
            city: emptyToNull(f.city),
            country: countryRaw,
            livingAreaM2: livingArea.value,
            landAreaM2: landArea.value,
            rooms: rooms.value,
            bedrooms: bedrooms.value,
            bathrooms: bathrooms.value,
            floor: floor.value,
            hasElevator: !!f.hasElevator,
            hasBalcony: !!f.hasBalcony,
            hasCellar: !!f.hasCellar,
            hasGarage: !!f.hasGarage,
            constructionYear: constructionYear.value,
            renovationYear: renovationYear.value,
            taxValue: taxValue.value
        }
    };
}

/** Seul le détail du `type` est envoyé (les autres sont ignorés par l’API). */
function buildDetails(type: AssetType, fields: AssetFormFields, context: AssetPayloadContext): Parsed<AssetDetailsPayload> {
    switch (type) {
        case 'vehicule': {
            const r = buildVehicle(fields.vehicle);
            return r.ok ? { ok: true, value: { vehicle: r.value } } : r;
        }
        case 'crypto': {
            const r = buildCrypto(fields.crypto);
            return r.ok ? { ok: true, value: { crypto: r.value } } : r;
        }
        case 'objetValeur': {
            const r = buildValuableItem(fields.valuableItem);
            return r.ok ? { ok: true, value: { valuableItem: r.value } } : r;
        }
        case 'compteEpargne': {
            const r = buildSavingsAccount(fields.savingsAccount, context);
            return r.ok ? { ok: true, value: { savingsAccount: r.value } } : r;
        }
        case 'immobilier': {
            const r = buildRealEstate(fields.realEstate);
            return r.ok ? { ok: true, value: { realEstate: r.value } } : r;
        }
        default: {
            const r = buildOther(fields.other);
            return r.ok ? { ok: true, value: { other: r.value } } : r;
        }
    }
}

/* ── racine ──────────────────────────────────────────────────────────────── */

type CommonFields =
    | BuildAssetPayloadFail
    | {
          ok: true;
          name: string;
          estimatedValue: number;
          acquisitionDate: string | null;
          acquisitionPrice: number | null;
          description: string | null;
          notes: string | null;
      };

function commonFields(fields: AssetFormFields, context: AssetPayloadContext): CommonFields {
    const name = fields.name.trim();
    if (!name) return fail('nameRequired', 'name');
    if (name.length > ASSET_NAME_MAX) return fail('nameTooLong', 'name');

    let estimatedValue: number;
    if (context.isValueFromAccount) {
        // Épargne adossée : la valeur suit le solde du compte, la saisie est ignorée.
        estimatedValue = Math.max(0, Number(context.currentEstimatedValue) || 0);
    } else {
        const parsed = parseAccountAmount(fields.estimatedValue.trim() || '0');
        if (parsed == null) return fail('estimatedValueInvalid', 'estimatedValue');
        if (parsed < 0) return fail('estimatedValueNegative', 'estimatedValue');
        estimatedValue = parsed;
    }

    const priceRaw = fields.acquisitionPrice.trim();
    let acquisitionPrice: number | null = null;
    if (priceRaw) {
        const parsed = parseAccountAmount(priceRaw);
        if (parsed == null) return fail('acquisitionPriceInvalid', 'acquisitionPrice');
        if (parsed < 0) return fail('acquisitionPriceNegative', 'acquisitionPrice');
        acquisitionPrice = parsed;
    }

    const acquisitionDate = emptyToNull(fields.acquisitionDate);
    if (acquisitionDate && !isValidYmd(acquisitionDate)) return fail('acquisitionDateInvalid', 'acquisitionDate');

    const description = emptyToNull(fields.description);
    if (description && description.length > ASSET_DESCRIPTION_MAX) return fail('descriptionTooLong', 'description');
    const notes = emptyToNull(fields.notes);
    if (notes && notes.length > ASSET_NOTES_MAX) return fail('notesTooLong', 'notes');

    return { ok: true, name, estimatedValue, acquisitionDate, acquisitionPrice, description, notes };
}

export function buildCreateAssetPayload(
    fields: AssetFormFields,
    context: AssetPayloadContext = {}
): BuildAssetPayloadResult<CreateAssetPayload> {
    const type = context.lockedType ?? fields.type;
    if (!isAssetType(type)) return fail('typeInvalid', 'type');

    const common = commonFields(fields, { ...context, isValueFromAccount: false });
    if (!common.ok) return common;

    const currencyRaw = emptyToNull(fields.currency);
    let currency: AssetCurrency | null = null;
    if (currencyRaw) {
        if (!isAssetCurrency(currencyRaw)) return fail('currencyInvalid', 'currency');
        currency = currencyRaw;
    }

    const details = buildDetails(type, fields, context);
    if (!details.ok) return details;

    return {
        ok: true,
        payload: {
            name: common.name,
            type,
            estimatedValue: common.estimatedValue,
            currency,
            acquisitionDate: common.acquisitionDate,
            acquisitionPrice: common.acquisitionPrice,
            description: common.description,
            notes: common.notes,
            ...details.value
        }
    };
}

export function buildUpdateAssetPayload(
    fields: AssetFormFields,
    context: AssetPayloadContext = {}
): BuildAssetPayloadResult<UpdateAssetPayload> {
    const type = context.lockedType ?? fields.type;
    if (!isAssetType(type)) return fail('typeInvalid', 'type');

    const common = commonFields(fields, context);
    if (!common.ok) return common;

    const locked = context.lockedCurrency;
    if (!locked || !isAssetCurrency(locked)) return fail('currencyLocked', 'currency');
    const currencyRaw = emptyToNull(fields.currency);
    if (currencyRaw && currencyRaw !== locked) return fail('currencyLocked', 'currency');

    const details = buildDetails(type, fields, context);
    if (!details.ok) return details;

    return {
        ok: true,
        payload: {
            name: common.name,
            estimatedValue: common.estimatedValue,
            currency: locked,
            acquisitionDate: common.acquisitionDate,
            acquisitionPrice: common.acquisitionPrice,
            description: common.description,
            notes: common.notes,
            isActive: !fields.sold,
            ...details.value
        }
    };
}

/** Compare le formulaire à l’actif d’origine par les champs qui seraient envoyés. */
export function isAssetFormDirty(asset: Asset, fields: AssetFormFields): boolean {
    const reference = assetToFormFields(asset);
    const detailKey = detailKeyFor(asset.type);
    const rootKeys: (keyof AssetFormFields)[] = [
        'name',
        'estimatedValue',
        'acquisitionDate',
        'acquisitionPrice',
        'description',
        'notes',
        'sold'
    ];
    for (const key of rootKeys) {
        if (key === 'estimatedValue' && asset.isValueFromAccount) continue;
        if (normalizeScalar(fields[key]) !== normalizeScalar(reference[key])) return true;
    }
    const current = fields[detailKey] as Record<string, unknown>;
    const original = reference[detailKey] as Record<string, unknown>;
    for (const key of Object.keys(original)) {
        if (normalizeScalar(current[key]) !== normalizeScalar(original[key])) return true;
    }
    return false;
}

function detailKeyFor(type: AssetType): 'vehicle' | 'crypto' | 'valuableItem' | 'savingsAccount' | 'other' | 'realEstate' {
    switch (type) {
        case 'vehicule':
            return 'vehicle';
        case 'crypto':
            return 'crypto';
        case 'objetValeur':
            return 'valuableItem';
        case 'compteEpargne':
            return 'savingsAccount';
        case 'immobilier':
            return 'realEstate';
        default:
            return 'other';
    }
}

function normalizeScalar(value: unknown): string {
    if (typeof value === 'boolean') return value ? '1' : '0';
    if (value == null) return '';
    const trimmed = String(value).trim();
    if (trimmed && /^-?\d+([.,]\d+)?$/.test(trimmed)) return String(Number(trimmed.replace(',', '.')));
    return trimmed;
}

/* ── valorisations ───────────────────────────────────────────────────────── */

export type AssetValuationFormFields = {
    valuationDate: string | null;
    value: string;
};

export function emptyAssetValuationFormFields(defaults: { date?: string | null } = {}): AssetValuationFormFields {
    return { valuationDate: defaults.date ?? null, value: '' };
}

export function buildSaveValuationPayload(
    fields: AssetValuationFormFields,
    context: AssetSubPayloadContext = {}
): BuildAssetPayloadResult<SaveAssetValuationPayload> {
    const valuationDate = emptyToNull(fields.valuationDate);
    if (!valuationDate || !isValidYmd(valuationDate)) return fail('valuationDateInvalid', 'valuationDate');
    if (context.today && valuationDate > context.today) return fail('valuationDateFuture', 'valuationDate');
    const value = parseAccountAmount(fields.value.trim());
    if (value == null) return fail('valuationValueInvalid', 'value');
    if (value < 0) return fail('valuationValueNegative', 'value');
    return { ok: true, payload: { valuationDate, value } };
}

/* ── véhicule : relevés ──────────────────────────────────────────────────── */

export type VehicleMileageFormFields = {
    statementDate: string | null;
    kilometrage: string;
};

export function emptyVehicleMileageFormFields(defaults: { date?: string | null } = {}): VehicleMileageFormFields {
    return { statementDate: defaults.date ?? null, kilometrage: '' };
}

export function buildSaveMileagePayload(
    fields: VehicleMileageFormFields,
    context: AssetSubPayloadContext = {}
): BuildAssetPayloadResult<SaveVehicleMileagePayload> {
    const statementDate = emptyToNull(fields.statementDate);
    if (!statementDate || !isValidYmd(statementDate)) return fail('mileageDateInvalid', 'statementDate');
    if (context.today && statementDate > context.today) return fail('mileageDateFuture', 'statementDate');
    const km = optionalInteger(fields.kilometrage, 'kilometrageInvalid', 'kilometrage');
    if (!km.ok) return km;
    if (km.value == null) return fail('kilometrageInvalid', 'kilometrage');
    return { ok: true, payload: { statementDate, kilometrage: km.value } };
}

/* ── véhicule : entretiens ───────────────────────────────────────────────── */

export type VehicleMaintenanceFormFields = {
    maintenanceDate: string | null;
    maintenanceType: VehicleMaintenanceType | '';
    kilometrage: string;
    garageTierPublicId: string;
    cost: string;
    /** Pas encore de sélecteur de transaction : conservé tel quel. */
    transactionPublicId: string | null;
    description: string;
    nextMaintenanceDate: string | null;
    nextMaintenanceKm: string;
};

export function emptyVehicleMaintenanceFormFields(defaults: { date?: string | null } = {}): VehicleMaintenanceFormFields {
    return {
        maintenanceDate: defaults.date ?? null,
        maintenanceType: 'revision',
        kilometrage: '',
        garageTierPublicId: '',
        cost: '',
        transactionPublicId: null,
        description: '',
        nextMaintenanceDate: null,
        nextMaintenanceKm: ''
    };
}

export function vehicleMaintenanceToFormFields(item: VehicleMaintenance): VehicleMaintenanceFormFields {
    return {
        maintenanceDate: item.maintenanceDate,
        maintenanceType: item.maintenanceType,
        kilometrage: numberString(item.kilometrage),
        garageTierPublicId: item.garageTierPublicId ?? '',
        cost: numberString(item.cost),
        transactionPublicId: item.transactionPublicId,
        description: item.description ?? '',
        nextMaintenanceDate: item.nextMaintenanceDate,
        nextMaintenanceKm: numberString(item.nextMaintenanceKm)
    };
}

export function buildSaveMaintenancePayload(
    fields: VehicleMaintenanceFormFields,
    context: AssetSubPayloadContext = {}
): BuildAssetPayloadResult<SaveVehicleMaintenancePayload> {
    const maintenanceDate = emptyToNull(fields.maintenanceDate);
    if (!maintenanceDate || !isValidYmd(maintenanceDate)) return fail('maintenanceDateInvalid', 'maintenanceDate');
    if (context.today && maintenanceDate > context.today) return fail('maintenanceDateFuture', 'maintenanceDate');
    if (!isOneOf(VEHICLE_MAINTENANCE_TYPES, fields.maintenanceType)) return fail('maintenanceTypeInvalid', 'maintenanceType');
    const km = optionalInteger(fields.kilometrage, 'kilometrageInvalid', 'kilometrage');
    if (!km.ok) return km;
    const cost = optionalAmount(fields.cost, 'costInvalid', 'cost');
    if (!cost.ok) return cost;
    const description = emptyToNull(fields.description);
    if (description && description.length > VEHICLE_MAINTENANCE_DESCRIPTION_MAX) {
        return fail('maintenanceDescriptionTooLong', 'description');
    }
    const nextMaintenanceDate = emptyToNull(fields.nextMaintenanceDate);
    if (nextMaintenanceDate && !isValidYmd(nextMaintenanceDate)) return fail('nextMaintenanceDateInvalid', 'nextMaintenanceDate');
    if (nextMaintenanceDate && nextMaintenanceDate < maintenanceDate) return fail('nextMaintenanceBeforeDate', 'nextMaintenanceDate');
    const nextKm = optionalInteger(fields.nextMaintenanceKm, 'nextMaintenanceKmInvalid', 'nextMaintenanceKm');
    if (!nextKm.ok) return nextKm;
    return {
        ok: true,
        payload: {
            maintenanceDate,
            maintenanceType: fields.maintenanceType,
            kilometrage: km.value,
            garageTierPublicId: emptyToNull(fields.garageTierPublicId),
            cost: cost.value,
            transactionPublicId: emptyToNull(fields.transactionPublicId),
            description,
            nextMaintenanceDate,
            nextMaintenanceKm: nextKm.value
        }
    };
}
