/**
 * Catalogue des champs chiffrés par le Coffre : la **seule** liste côté Vue, alignée sur
 * `Application/Vault/VaultCatalog.cs` de l’API. Une colonne absente d’ici n’est jamais chiffrée.
 *
 * Identifiant de ligne : le `publicId` de l’agrégat (l’actif pour `vehicle_asset`, le tier pour
 * `tier_person`). AAD d’un champ : `table:colonne:publicId`.
 */
import type { VaultScope } from '@/features/vault/types';

export type VaultTableName =
    | 'account'
    | 'asset'
    | 'vehicle_asset'
    | 'crypto_asset'
    | 'valuable_item_asset'
    | 'real_estate_asset'
    | 'tier'
    | 'tier_person'
    | 'tier_company'
    | 'file'
    | 'attachment';

export type VaultFieldSpec = {
    column: string;
    scope: VaultScope;
    /** Texte libre (`≤ 8192` octets chiffrés côté API) ; sinon champ court (`≤ 512`). */
    long?: boolean;
    /** `account.iban` : une empreinte `h:…` accompagne la valeur chiffrée. */
    fingerprint?: boolean;
};

const core = (column: string, extra: Partial<VaultFieldSpec> = {}): VaultFieldSpec => ({ column, scope: 'core', ...extra });
const extended = (column: string, extra: Partial<VaultFieldSpec> = {}): VaultFieldSpec => ({ column, scope: 'extended', ...extra });

/** Table par table, les colonnes chiffrables et leur périmètre. */
export const VAULT_CATALOG: Readonly<Record<VaultTableName, readonly VaultFieldSpec[]>> = {
    account: [core('iban', { fingerprint: true }), core('account_number')],
    asset: [extended('notes', { long: true })],
    vehicle_asset: [core('immatriculation'), core('chassis_number')],
    crypto_asset: [core('wallet_address')],
    valuable_item_asset: [core('serial_number'), extended('storage_location')],
    real_estate_asset: [extended('address_line1'), extended('address_line2'), extended('postal_code'), extended('ville')],
    tier: [extended('email'), extended('phone'), extended('website'), extended('notes', { long: true })],
    tier_person: [extended('first_name'), extended('name')],
    tier_company: [extended('vat_number'), extended('company_registration_number')],
    file: [extended('name_original'), extended('description', { long: true })],
    attachment: [extended('name_fichier')]
};

export const VAULT_TABLES = Object.keys(VAULT_CATALOG) as VaultTableName[];

/**
 * AAD du contenu d’un PDF chiffré : le `publicId` n’est connu qu’après `POST /api/files`, le contenu
 * est donc lié à la table et à la colonne seulement (voir `file-content.ts`).
 */
export const VAULT_FILE_CONTENT_AAD = 'file:content';

/**
 * Spécification d’un champ du catalogue, ou `null` s’il n’en fait pas partie.
 * @param table Table SQL.
 * @param column Colonne SQL.
 */
export function vaultField(table: string, column: string): VaultFieldSpec | null {
    const fields = (VAULT_CATALOG as Record<string, readonly VaultFieldSpec[] | undefined>)[table];
    return fields?.find((field) => field.column === column) ?? null;
}

/** Vrai si `table.column` est une colonne chiffrable. */
export function isVaultField(table: string, column: string): boolean {
    return vaultField(table, column) != null;
}

/**
 * Périmètre d’un champ du catalogue (`core` / `extended`), `null` hors catalogue.
 * @param table Table SQL.
 * @param column Colonne SQL.
 */
export function vaultFieldScope(table: string, column: string): VaultScope | null {
    return vaultField(table, column)?.scope ?? null;
}

/**
 * Vrai si le périmètre autorisé couvre le périmètre d’un champ (`extended` couvre tout, `core` le socle).
 * @param allowed Périmètre autorisé par l’offre.
 * @param fieldScope Périmètre du champ.
 */
export function scopeAllows(allowed: VaultScope, fieldScope: VaultScope): boolean {
    return allowed === 'extended' || fieldScope === 'core';
}

/**
 * Vrai si un champ du catalogue peut être chiffré avec le périmètre autorisé. Hors catalogue : faux.
 * @param allowed Périmètre autorisé.
 * @param table Table SQL.
 * @param column Colonne SQL.
 */
export function canEncryptField(allowed: VaultScope, table: string, column: string): boolean {
    const scope = vaultFieldScope(table, column);
    return scope != null && scopeAllows(allowed, scope);
}

/**
 * AAD d’un champ : `table:colonne:publicId`.
 * @param table Table SQL du catalogue.
 * @param column Colonne SQL.
 * @param publicId Identifiant public de l’agrégat.
 */
export function vaultAad(table: string, column: string, publicId: string): string {
    return `${table}:${column}:${publicId}`;
}
