import { describe, expect, it } from 'vitest';
import {
    VAULT_CATALOG,
    VAULT_FILE_CONTENT_AAD,
    VAULT_TABLES,
    canEncryptField,
    isVaultField,
    scopeAllows,
    vaultAad,
    vaultField,
    vaultFieldScope
} from '@/features/vault/catalog';
import { fieldAad } from '@/features/vault/crypto';

describe('catalogue du Coffre', () => {
    it('reprend les onze tables de VaultCatalog.cs avec leurs colonnes et périmètres', () => {
        expect(VAULT_TABLES).toEqual([
            'account',
            'asset',
            'vehicle_asset',
            'crypto_asset',
            'valuable_item_asset',
            'real_estate_asset',
            'tier',
            'tier_person',
            'tier_company',
            'file',
            'attachment'
        ]);
        const columns = (table: keyof typeof VAULT_CATALOG) => VAULT_CATALOG[table].map((f) => `${f.column}:${f.scope}`);
        expect(columns('account')).toEqual(['iban:core', 'account_number:core']);
        expect(columns('vehicle_asset')).toEqual(['immatriculation:core', 'chassis_number:core']);
        expect(columns('crypto_asset')).toEqual(['wallet_address:core']);
        expect(columns('valuable_item_asset')).toEqual(['serial_number:core', 'storage_location:extended']);
        expect(columns('real_estate_asset')).toEqual([
            'address_line1:extended',
            'address_line2:extended',
            'postal_code:extended',
            'ville:extended'
        ]);
        expect(columns('asset')).toEqual(['notes:extended']);
        expect(columns('tier')).toEqual(['email:extended', 'phone:extended', 'website:extended', 'notes:extended']);
        expect(columns('tier_person')).toEqual(['first_name:extended', 'name:extended']);
        expect(columns('tier_company')).toEqual(['vat_number:extended', 'company_registration_number:extended']);
        expect(columns('file')).toEqual(['name_original:extended', 'description:extended']);
        expect(columns('attachment')).toEqual(['name_fichier:extended']);
        expect(vaultField('account', 'iban')?.fingerprint).toBe(true);
        expect(vaultField('tier', 'notes')?.long).toBe(true);
    });

    it('résout l’AAD table:colonne:publicId, identique à fieldAad du module crypto', () => {
        expect(vaultAad('tier_person', 'first_name', 'TIER-42')).toBe('tier_person:first_name:TIER-42');
        expect(fieldAad('account', 'iban', 'ACC-1')).toBe(vaultAad('account', 'iban', 'ACC-1'));
        expect(VAULT_FILE_CONTENT_AAD).toBe('file:content');
    });

    it('connaît le périmètre d’un champ et ignore ce qui n’est pas au catalogue', () => {
        expect(vaultFieldScope('account', 'iban')).toBe('core');
        expect(vaultFieldScope('file', 'description')).toBe('extended');
        expect(vaultFieldScope('account', 'name')).toBeNull();
        expect(vaultFieldScope('transaction', 'notes')).toBeNull();
        expect(isVaultField('tier_company', 'vat_number')).toBe(true);
        expect(isVaultField('tier_company', 'legal_name')).toBe(false);
    });

    it('le périmètre étendu couvre tout, le socle seulement le socle', () => {
        expect(scopeAllows('extended', 'core')).toBe(true);
        expect(scopeAllows('extended', 'extended')).toBe(true);
        expect(scopeAllows('core', 'core')).toBe(true);
        expect(scopeAllows('core', 'extended')).toBe(false);
        expect(canEncryptField('core', 'account', 'iban')).toBe(true);
        expect(canEncryptField('core', 'tier', 'email')).toBe(false);
        expect(canEncryptField('extended', 'tier', 'email')).toBe(true);
        expect(canEncryptField('extended', 'tier', 'name')).toBe(false);
    });
});
