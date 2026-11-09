/**
 * Champs chiffrés d’un actif : socle (plaque `vehicle_asset.immatriculation`) et périmètre étendu
 * (`asset.notes`, adresse d’un bien `real_estate_asset.address_line1 / address_line2 / postal_code / ville`).
 * AAD sur le `publicId` de l’actif. Déchiffrés à la lecture, chiffrés à l’envoi quand le Coffre est ouvert ;
 * le store du Coffre décide seul du périmètre (catalogue + `allowedScope`).
 */
import { useVaultStore } from '@/features/vault/stores/vault-store';
import { isCipher } from '@/features/vault/crypto';
import type { Asset, CreateAssetPayload, RealEstateDetails, UpdateAssetPayload } from '@/features/assets/types';

export const ASSET_VAULT_TABLE = 'asset';
export const ASSET_NOTES_COLUMN = 'notes';
export const VEHICLE_VAULT_TABLE = 'vehicle_asset';
export const VEHICLE_PLATE_COLUMN = 'immatriculation';
export const REAL_ESTATE_VAULT_TABLE = 'real_estate_asset';
export const REAL_ESTATE_VAULT_COLUMNS = {
    addressLine1: 'address_line1',
    addressLine2: 'address_line2',
    postalCode: 'postal_code',
    city: 'ville'
} as const;

type AssetPayload = CreateAssetPayload | UpdateAssetPayload;

function isPlain(value: string | null | undefined): value is string {
    return typeof value === 'string' && value !== '' && !isCipher(value);
}

/**
 * Remplace les chiffrés lisibles par leur clair ; un chiffré illisible reste tel quel (« 🔒 illisible »).
 * @param asset Actif tel que renvoyé par l’API.
 */
export async function decryptAssetFields(asset: Asset): Promise<Asset> {
    const details = asset.realEstate?.details;
    const hasCipher =
        isCipher(asset.vehicle?.plate) ||
        isCipher(asset.notes) ||
        isCipher(details?.addressLine1) ||
        isCipher(details?.addressLine2) ||
        isCipher(details?.postalCode) ||
        isCipher(details?.city);
    if (!hasCipher) return asset;
    const vault = useVaultStore();
    const read = async (table: string, column: string, value: string | null | undefined): Promise<string | null> => {
        if (!isCipher(value)) return value ?? null;
        const result = await vault.decrypt(table, column, asset.publicId, value);
        return result.ok ? result.value : value;
    };
    const next: Asset = { ...asset, notes: await read(ASSET_VAULT_TABLE, ASSET_NOTES_COLUMN, asset.notes) };
    if (asset.vehicle) {
        next.vehicle = { ...asset.vehicle, plate: await read(VEHICLE_VAULT_TABLE, VEHICLE_PLATE_COLUMN, asset.vehicle.plate) };
    }
    if (asset.realEstate && details) {
        const [addressLine1, addressLine2, postalCode, city] = await Promise.all([
            read(REAL_ESTATE_VAULT_TABLE, REAL_ESTATE_VAULT_COLUMNS.addressLine1, details.addressLine1),
            read(REAL_ESTATE_VAULT_TABLE, REAL_ESTATE_VAULT_COLUMNS.addressLine2, details.addressLine2),
            read(REAL_ESTATE_VAULT_TABLE, REAL_ESTATE_VAULT_COLUMNS.postalCode, details.postalCode),
            read(REAL_ESTATE_VAULT_TABLE, REAL_ESTATE_VAULT_COLUMNS.city, details.city)
        ]);
        next.realEstate = { ...asset.realEstate, details: { ...details, addressLine1, addressLine2, postalCode, city } };
    }
    return next;
}

/** Vrai si le payload porte au moins une valeur en clair d’un champ chiffrable (tous périmètres). */
export function hasSensitiveAssetFields(payload: AssetPayload): boolean {
    const re = payload.realEstate;
    return (
        isPlain(payload.vehicle?.plate) ||
        isPlain(payload.notes) ||
        isPlain(re?.addressLine1) ||
        isPlain(re?.addressLine2) ||
        isPlain(re?.postalCode) ||
        isPlain(re?.city)
    );
}

/**
 * Vrai si le payload porte une valeur en clair que le Coffre chiffrerait vraiment (champ du catalogue,
 * Coffre ouvert, périmètre autorisé). Décide le double appel POST puis PUT à la création.
 * @param payload Payload en clair.
 */
export async function needsAssetVaultWrite(payload: AssetPayload): Promise<boolean> {
    const vault = useVaultStore();
    if (isPlain(payload.vehicle?.plate) && (await vault.canEncrypt(VEHICLE_VAULT_TABLE, VEHICLE_PLATE_COLUMN))) return true;
    if (isPlain(payload.notes) && (await vault.canEncrypt(ASSET_VAULT_TABLE, ASSET_NOTES_COLUMN))) return true;
    const re = payload.realEstate;
    if (!re) return false;
    const candidates: [string | null | undefined, string][] = [
        [re.addressLine1, REAL_ESTATE_VAULT_COLUMNS.addressLine1],
        [re.addressLine2, REAL_ESTATE_VAULT_COLUMNS.addressLine2],
        [re.postalCode, REAL_ESTATE_VAULT_COLUMNS.postalCode],
        [re.city, REAL_ESTATE_VAULT_COLUMNS.city]
    ];
    for (const [value, column] of candidates) {
        if (isPlain(value) && (await vault.canEncrypt(REAL_ESTATE_VAULT_TABLE, column))) return true;
    }
    return false;
}

/**
 * Chiffre les champs chiffrables d’un payload pour un actif connu. Coffre verrouillé ou champ hors
 * périmètre : valeur inchangée.
 * @param publicId Identifiant public de l’actif (AAD).
 * @param payload Payload en clair.
 */
export async function encryptAssetPayload<T extends AssetPayload>(publicId: string, payload: T): Promise<T> {
    if (!hasSensitiveAssetFields(payload)) return payload;
    const vault = useVaultStore();
    if (!(await vault.ensureReady())) return payload;
    const seal = (table: string, column: string, value: string | null | undefined) =>
        isPlain(value) ? vault.encrypt(table, column, publicId, value) : Promise.resolve(value ?? null);
    const next: T = { ...payload, notes: await seal(ASSET_VAULT_TABLE, ASSET_NOTES_COLUMN, payload.notes) };
    if (payload.vehicle) {
        next.vehicle = { ...payload.vehicle, plate: await seal(VEHICLE_VAULT_TABLE, VEHICLE_PLATE_COLUMN, payload.vehicle.plate) };
    }
    if (payload.realEstate) {
        const re: RealEstateDetails = payload.realEstate;
        const [addressLine1, addressLine2, postalCode, city] = await Promise.all([
            seal(REAL_ESTATE_VAULT_TABLE, REAL_ESTATE_VAULT_COLUMNS.addressLine1, re.addressLine1),
            seal(REAL_ESTATE_VAULT_TABLE, REAL_ESTATE_VAULT_COLUMNS.addressLine2, re.addressLine2),
            seal(REAL_ESTATE_VAULT_TABLE, REAL_ESTATE_VAULT_COLUMNS.postalCode, re.postalCode),
            seal(REAL_ESTATE_VAULT_TABLE, REAL_ESTATE_VAULT_COLUMNS.city, re.city)
        ]);
        next.realEstate = { ...re, addressLine1, addressLine2, postalCode, city };
    }
    return next;
}

/** Payload de création sans les champs chiffrables : ils sont posés par un PUT une fois le `publicId` connu. */
export function stripSensitiveAssetFields<T extends AssetPayload>(payload: T): T {
    const next: T = { ...payload, notes: null };
    if (payload.vehicle) next.vehicle = { ...payload.vehicle, plate: null };
    if (payload.realEstate) {
        next.realEstate = { ...payload.realEstate, addressLine1: null, addressLine2: null, postalCode: null, city: null };
    }
    return next;
}
