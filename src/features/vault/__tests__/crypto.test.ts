import { describe, expect, it } from 'vitest';
import { fromBase64Url, isBase64Url, toBase64Url } from '@/features/vault/base64url';
import {
    createVaultSetup,
    decryptField,
    deriveKek,
    encryptField,
    fieldAad,
    generateDekBytes,
    generateSalt,
    ibanFingerprint,
    importVaultKeys,
    isCipher,
    unwrapDek,
    unwrapDekWithSecret,
    VaultCryptoError,
    wrapDek
} from '@/features/vault/crypto';
import { VAULT_KDF_ITERATIONS } from '@/features/vault/types';

/** Itérations réduites pour les tests (la dérivation complète est couverte une fois). */
const FAST_ITERATIONS = 1_000;

describe('base64url', () => {
    it('encode sans `=` et décode à l’identique', () => {
        const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
        const encoded = toBase64Url(bytes);
        expect(encoded).not.toContain('=');
        expect(encoded).not.toContain('+');
        expect(encoded).not.toContain('/');
        expect(Array.from(fromBase64Url(encoded))).toEqual(Array.from(bytes));
    });

    it('vecteur connu : "Hello" → SGVsbG8 (RFC 4648)', () => {
        expect(toBase64Url(new TextEncoder().encode('Hello'))).toBe('SGVsbG8');
        expect(new TextDecoder().decode(fromBase64Url('SGVsbG8'))).toBe('Hello');
        expect(new TextDecoder().decode(fromBase64Url('SGVsbG8='))).toBe('Hello');
    });

    it('refuse les caractères hors alphabet', () => {
        expect(() => fromBase64Url('ab+/')).toThrow();
        expect(isBase64Url('ab+/')).toBe(false);
        expect(isBase64Url('')).toBe(false);
        expect(isBase64Url('abc-_')).toBe(true);
    });
});

describe('DEK, KEK et emballage', () => {
    it('génère une DEK de 32 octets et un sel de 16 octets', () => {
        expect(generateDekBytes()).toHaveLength(32);
        expect(generateSalt()).toHaveLength(16);
        expect(toBase64Url(generateSalt())).toHaveLength(22);
    });

    it('emballe puis déballe la DEK avec le bon mot de passe', async () => {
        const salt = generateSalt();
        const dek = generateDekBytes();
        const original = Array.from(dek);
        const kek = await deriveKek('Motdepasse1', salt, FAST_ITERATIONS);
        const wrapped = await wrapDek(dek, kek);
        expect(isBase64Url(wrapped)).toBe(true);
        // iv 12 + dek 32 + tag 16 = 60 octets
        expect(fromBase64Url(wrapped)).toHaveLength(60);
        const unwrapped = await unwrapDek(wrapped, kek);
        expect(Array.from(unwrapped)).toEqual(original);
    });

    it('mauvais mot de passe → erreur typée wrong_password', async () => {
        const salt = generateSalt();
        const dek = generateDekBytes();
        const kek = await deriveKek('Motdepasse1', salt, FAST_ITERATIONS);
        const wrapped = await wrapDek(dek, kek);
        const wrongKek = await deriveKek('Motdepasse2', salt, FAST_ITERATIONS);
        await expect(unwrapDek(wrapped, wrongKek)).rejects.toMatchObject({ name: 'VaultCryptoError', code: 'wrong_password' });
    });

    it('unwrapDekWithSecret : refuse une KDF inconnue et un emballage malformé', async () => {
        await expect(unwrapDekWithSecret('x', { kdf: 'argon2id', iterations: 3, salt: 'AAAA' }, 'AAAA')).rejects.toBeInstanceOf(
            VaultCryptoError
        );
        await expect(
            unwrapDekWithSecret('x', { kdf: 'pbkdf2', iterations: FAST_ITERATIONS, salt: toBase64Url(generateSalt()) }, 'AAAA')
        ).rejects.toMatchObject({
            code: 'invalid_format'
        });
    });

    it('createVaultSetup annonce pbkdf2 à 600 000 itérations et renvoie des clés non extractibles', async () => {
        const { setup, keys } = await createVaultSetup('Motdepasse1');
        expect(setup.kdf).toBe('pbkdf2');
        expect(setup.iterations).toBe(VAULT_KDF_ITERATIONS);
        expect(setup.memoryKiB).toBeNull();
        expect(setup.parallelism).toBeNull();
        expect(fromBase64Url(setup.salt)).toHaveLength(16);
        expect(fromBase64Url(setup.dekWrappedPassword)).toHaveLength(60);
        expect(keys.dek.extractable).toBe(false);
        expect(keys.fingerprintKey.extractable).toBe(false);
        // Le même mot de passe rouvre le Coffre avec les paramètres annoncés.
        const dek = await unwrapDekWithSecret('Motdepasse1', setup, setup.dekWrappedPassword);
        expect(dek).toHaveLength(32);
    }, 20_000);
});

describe('champs enc:v1:', () => {
    async function keysFromBytes(bytes: Uint8Array) {
        return importVaultKeys(Uint8Array.from(bytes));
    }

    it('aller-retour chiffrer / déchiffrer avec le même AAD', async () => {
        const keys = await keysFromBytes(generateDekBytes());
        const cipher = await encryptField(keys.dek, 'account', 'iban', 'acc-1', 'CH93 0076 2011 6238 5295 7');
        expect(isCipher(cipher)).toBe(true);
        expect(cipher.startsWith('enc:v1:')).toBe(true);
        // iv 12 + 26 octets de texte + tag 16 = 54 octets
        expect(fromBase64Url(cipher.slice('enc:v1:'.length))).toHaveLength(54);
        const result = await decryptField(keys.dek, 'account', 'iban', 'acc-1', cipher);
        expect(result).toEqual({ ok: true, value: 'CH93 0076 2011 6238 5295 7' });
    });

    it('AAD différent (autre ligne ou autre colonne) → illisible, sans exception', async () => {
        const keys = await keysFromBytes(generateDekBytes());
        const cipher = await encryptField(keys.dek, 'account', 'iban', 'acc-1', 'CH9300762011623852957');
        expect(await decryptField(keys.dek, 'account', 'iban', 'acc-2', cipher)).toEqual({ ok: false, reason: 'unreadable' });
        expect(await decryptField(keys.dek, 'account', 'account_number', 'acc-1', cipher)).toEqual({ ok: false, reason: 'unreadable' });
        expect(await decryptField(keys.dek, 'vehicle_asset', 'iban', 'acc-1', cipher)).toEqual({ ok: false, reason: 'unreadable' });
    });

    it('autre clé, valeur tronquée ou en clair → illisible', async () => {
        const keys = await keysFromBytes(generateDekBytes());
        const other = await keysFromBytes(generateDekBytes());
        const cipher = await encryptField(keys.dek, 'account', 'iban', 'acc-1', 'CH9300762011623852957');
        expect(await decryptField(other.dek, 'account', 'iban', 'acc-1', cipher)).toEqual({ ok: false, reason: 'unreadable' });
        expect(await decryptField(keys.dek, 'account', 'iban', 'acc-1', 'enc:v1:AAAA')).toEqual({ ok: false, reason: 'unreadable' });
        expect(await decryptField(keys.dek, 'account', 'iban', 'acc-1', 'enc:v1:not*base64')).toEqual({ ok: false, reason: 'unreadable' });
        expect(await decryptField(keys.dek, 'account', 'iban', 'acc-1', 'CH9300762011623852957')).toEqual({
            ok: false,
            reason: 'unreadable'
        });
    });

    it('deux chiffrements du même clair diffèrent (iv aléatoire)', async () => {
        const keys = await keysFromBytes(generateDekBytes());
        const a = await encryptField(keys.dek, 'account', 'iban', 'acc-1', 'X');
        const b = await encryptField(keys.dek, 'account', 'iban', 'acc-1', 'X');
        expect(a).not.toBe(b);
    });

    it('fieldAad et isCipher', () => {
        expect(fieldAad('vehicle_asset', 'immatriculation', 'as-1')).toBe('vehicle_asset:immatriculation:as-1');
        expect(isCipher('enc:v1:abc')).toBe(true);
        expect(isCipher('enc:v2:abc')).toBe(false);
        expect(isCipher(null)).toBe(false);
        expect(isCipher(42)).toBe(false);
    });
});

describe('empreinte d’IBAN', () => {
    it('h: + 43 caractères base64url, déterministe, insensible aux espaces et à la casse', async () => {
        const keys = await importVaultKeys(generateDekBytes());
        const a = await ibanFingerprint(keys.fingerprintKey, 'CH93 0076 2011 6238 5295 7');
        const b = await ibanFingerprint(keys.fingerprintKey, 'ch9300762011623852957');
        expect(a).toBe(b);
        expect(a.startsWith('h:')).toBe(true);
        expect(a.slice(2)).toHaveLength(43);
        expect(isBase64Url(a.slice(2))).toBe(true);
    });

    it('dépend de la DEK et de l’IBAN', async () => {
        const dek = generateDekBytes();
        const keys = await importVaultKeys(Uint8Array.from(dek));
        const same = await importVaultKeys(Uint8Array.from(dek));
        const other = await importVaultKeys(generateDekBytes());
        const a = await ibanFingerprint(keys.fingerprintKey, 'CH9300762011623852957');
        expect(await ibanFingerprint(same.fingerprintKey, 'CH9300762011623852957')).toBe(a);
        expect(await ibanFingerprint(other.fingerprintKey, 'CH9300762011623852957')).not.toBe(a);
        expect(await ibanFingerprint(keys.fingerprintKey, 'CH9300762011623852958')).not.toBe(a);
    });

    it('importVaultKeys efface les octets de la DEK', async () => {
        const dek = generateDekBytes();
        await importVaultKeys(dek);
        expect(dek.every((b) => b === 0)).toBe(true);
    });
});
