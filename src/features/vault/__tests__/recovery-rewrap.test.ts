import { describe, expect, it } from 'vitest';
import { toBase64Url } from '@/features/vault/base64url';
import {
    deriveKek,
    generateDekBytes,
    generateSalt,
    importVaultKeys,
    rewrapDek,
    rewrapWithRecoveryCode,
    unwrapDekWithRecoveryCode,
    unwrapDekWithSecret,
    VaultCryptoError,
    wrapDek,
    encryptField,
    decryptField
} from '@/features/vault/crypto';
import { formatRecoveryCode, generateRecoveryCode } from '@/features/vault/recovery-code';
import type { VaultResetParams } from '@/features/vault/types';

/** Itérations réduites : la dérivation complète est couverte par crypto.test.ts. */
const FAST = 1_000;

/** Un Coffre avec mot de passe et code de récupération, tel que le serveur le renverrait. */
async function vaultWithRecovery(password: string) {
    const dek = generateDekBytes();
    const dekCopy = new Uint8Array(dek);
    const salt = generateSalt();
    const recoverySalt = generateSalt();
    const code = generateRecoveryCode();
    const dekWrappedPassword = await wrapDek(dek, await deriveKek(password, salt, FAST));
    const dekWrappedRecovery = await wrapDek(dek, await deriveKek(code, recoverySalt, FAST));
    const params: VaultResetParams = {
        exists: true,
        hasRecovery: true,
        kdf: 'pbkdf2',
        iterations: FAST,
        memoryKiB: null,
        parallelism: null,
        salt: toBase64Url(salt),
        recoverySalt: toBase64Url(recoverySalt),
        dekWrappedRecovery
    };
    return { dek: dekCopy, code, params, dekWrappedPassword };
}

describe('dérivation par code de récupération (mot de passe oublié, secours)', () => {
    it('le code formaté (tirets, minuscules) déballe la même DEK que le mot de passe', async () => {
        const { dek, code, params } = await vaultWithRecovery('Ancien123');
        const fromCode = await unwrapDekWithRecoveryCode(formatRecoveryCode(code).toLowerCase(), params);
        expect(Array.from(fromCode)).toEqual(Array.from(dek));
    }, 20_000);

    it('rewrapWithRecoveryCode produit un emballage que le nouveau mot de passe ouvre avec le même sel', async () => {
        const { dek, code, params } = await vaultWithRecovery('Ancien123');
        const dekWrappedPassword = await rewrapWithRecoveryCode(code, params, 'Nouveau456');
        const reopened = await unwrapDekWithSecret('Nouveau456', params, dekWrappedPassword);
        expect(Array.from(reopened)).toEqual(Array.from(dek));
        // Un champ chiffré avant la réinitialisation reste lisible après : même DEK.
        const before = await importVaultKeys(new Uint8Array(dek));
        const cipher = await encryptField(before.dek, 'account', 'iban', 'ACC-1', 'CH93 0076 2011 6238 5295 7');
        const after = await importVaultKeys(reopened);
        expect(await decryptField(after.dek, 'account', 'iban', 'ACC-1', cipher)).toEqual({
            ok: true,
            value: 'CH93 0076 2011 6238 5295 7'
        });
        // L’ancien mot de passe n’ouvre plus le nouvel emballage.
        await expect(unwrapDekWithSecret('Ancien123', params, dekWrappedPassword)).rejects.toMatchObject({ code: 'wrong_password' });
    }, 20_000);

    it('un mauvais code est une erreur typée wrong_password ; sans emballage de récupération, invalid_format', async () => {
        const { params } = await vaultWithRecovery('Ancien123');
        await expect(unwrapDekWithRecoveryCode(generateRecoveryCode(), params)).rejects.toMatchObject({ code: 'wrong_password' });
        await expect(unwrapDekWithRecoveryCode('ABCD', { ...params, dekWrappedRecovery: null })).rejects.toBeInstanceOf(VaultCryptoError);
        await expect(unwrapDekWithRecoveryCode('ABCD', { ...params, recoverySalt: null })).rejects.toMatchObject({
            code: 'invalid_format'
        });
    }, 20_000);

    it('rewrapDek refuse une dérivation inconnue ou des paramètres incomplets', async () => {
        const dek = generateDekBytes();
        await expect(rewrapDek(dek, 'x', { kdf: 'argon2id', iterations: 3, salt: 'AAAA' })).rejects.toMatchObject({
            code: 'unsupported_kdf'
        });
        await expect(rewrapDek(dek, 'x', { kdf: 'pbkdf2', iterations: null, salt: 'AAAA' })).rejects.toMatchObject({
            code: 'invalid_format'
        });
    });
});
