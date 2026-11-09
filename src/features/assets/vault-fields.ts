/**
 * Champs du socle d’un actif : la plaque d’immatriculation d’un véhicule (`vehicle_asset.immatriculation`,
 * AAD sur le `publicId` de l’actif). Déchiffrée à la lecture, chiffrée à l’envoi quand le Coffre est ouvert.
 */
import { useVaultStore } from '@/features/vault/stores/vault-store';
import { isCipher } from '@/features/vault/crypto';
import type { Asset, CreateAssetPayload, UpdateAssetPayload } from '@/features/assets/types';

export const VEHICLE_VAULT_TABLE = 'vehicle_asset';
export const VEHICLE_PLATE_COLUMN = 'immatriculation';

/**
 * Remplace la plaque chiffrée par son clair ; un chiffré illisible reste tel quel (« 🔒 illisible »).
 * @param asset Actif tel que renvoyé par l’API.
 */
export async function decryptAssetFields(asset: Asset): Promise<Asset> {
    const plate = asset.vehicle?.plate;
    if (!asset.vehicle || !isCipher(plate)) return asset;
    const result = await useVaultStore().decrypt(VEHICLE_VAULT_TABLE, VEHICLE_PLATE_COLUMN, asset.publicId, plate);
    if (!result.ok) return asset;
    return { ...asset, vehicle: { ...asset.vehicle, plate: result.value } };
}

/** Vrai si le payload porte une plaque en clair à chiffrer. */
export function hasSensitiveAssetFields(payload: CreateAssetPayload | UpdateAssetPayload): boolean {
    const plate = payload.vehicle?.plate;
    return typeof plate === 'string' && plate !== '' && !isCipher(plate);
}

/**
 * Chiffre la plaque d’un payload pour un actif connu. Coffre verrouillé : payload inchangé.
 * @param publicId Identifiant public de l’actif (AAD).
 * @param payload Payload en clair.
 */
export async function encryptAssetPayload<T extends CreateAssetPayload | UpdateAssetPayload>(publicId: string, payload: T): Promise<T> {
    if (!hasSensitiveAssetFields(payload) || !payload.vehicle) return payload;
    const vault = useVaultStore();
    if (!(await vault.ensureReady())) return payload;
    const plate = await vault.encrypt(VEHICLE_VAULT_TABLE, VEHICLE_PLATE_COLUMN, publicId, payload.vehicle.plate);
    return { ...payload, vehicle: { ...payload.vehicle, plate } };
}

/** Payload de création sans la plaque : elle est posée par un PUT une fois le `publicId` connu. */
export function stripSensitiveAssetFields<T extends CreateAssetPayload | UpdateAssetPayload>(payload: T): T {
    if (!payload.vehicle) return payload;
    return { ...payload, vehicle: { ...payload.vehicle, plate: null } };
}
