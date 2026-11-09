/**
 * Cœur cryptographique du Coffre — WebCrypto (`crypto.subtle`) uniquement, aucune primitive maison.
 *
 * - DEK : AES-256-GCM, 32 octets aléatoires.
 * - KEK : PBKDF2-SHA-256 (600 000 itérations) à partir du mot de passe (ou du code de récupération) et d’un sel de 16 octets.
 * - Emballage de la DEK : AES-GCM avec la KEK, `base64url(iv[12] || chiffré || tag[16])`.
 * - Champ : `enc:v1:<base64url(iv || chiffré || tag)>`, AAD `table:colonne:publicId`.
 * - Empreinte d’IBAN : HMAC-SHA-256 avec une clé dérivée de la DEK par HKDF (info `blind-index`), `h:` + base64url.
 */
import { fromBase64Url, isBase64Url, toBase64Url } from '@/features/vault/base64url';
import {
    VAULT_FINGERPRINT_PREFIX,
    VAULT_KDF_ITERATIONS,
    VAULT_PREFIX,
    type DecryptResult,
    type VaultKdf,
    type VaultSetupRequest
} from '@/features/vault/types';

const DEK_BYTES = 32;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BITS = 128;
const HKDF_BLIND_INDEX_INFO = 'blind-index';

/** Clés en mémoire d’un Coffre ouvert : DEK et clé d’empreinte, non extractibles. */
export type VaultKeys = {
    dek: CryptoKey;
    fingerprintKey: CryptoKey;
};

/** Erreurs typées du module. */
export type VaultCryptoErrorCode = 'wrong_password' | 'unsupported_kdf' | 'invalid_format' | 'crypto_unavailable';

export class VaultCryptoError extends Error {
    code: VaultCryptoErrorCode;

    constructor(code: VaultCryptoErrorCode, message?: string) {
        super(message ?? code);
        this.name = 'VaultCryptoError';
        this.code = code;
    }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function subtle(): SubtleCrypto {
    const api = globalThis.crypto?.subtle;
    if (!api) throw new VaultCryptoError('crypto_unavailable', 'WebCrypto indisponible.');
    return api;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
    const bytes = new Uint8Array(new ArrayBuffer(length));
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
}

function asBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(new ArrayBuffer(total));
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

/** AAD d’un champ : `table:colonne:publicId`. */
export function fieldAad(table: string, column: string, publicId: string): string {
    return `${table}:${column}:${publicId}`;
}

/** Vrai si la valeur porte le préfixe d’un champ chiffré. */
export function isCipher(value: unknown): value is string {
    return typeof value === 'string' && value.startsWith(VAULT_PREFIX);
}

/** Génère un sel aléatoire de 16 octets. */
export function generateSalt(): Uint8Array<ArrayBuffer> {
    return randomBytes(SALT_BYTES);
}

/** Génère les 32 octets d’une nouvelle DEK (à importer puis à effacer). */
export function generateDekBytes(): Uint8Array<ArrayBuffer> {
    return randomBytes(DEK_BYTES);
}

/**
 * Dérive la KEK d’un secret (mot de passe ou code de récupération) par PBKDF2-SHA-256.
 * @param secret Mot de passe ou code, tel que saisi (normalisé NFKC).
 * @param salt Sel de 16 octets.
 * @param iterations Nombre d’itérations (600 000 par défaut).
 * @returns Clé AES-GCM 256 non extractible, utilisable pour emballer / déballer.
 */
export async function deriveKek(secret: string, salt: Uint8Array, iterations = VAULT_KDF_ITERATIONS): Promise<CryptoKey> {
    const api = subtle();
    const material = await api.importKey('raw', encoder.encode(secret.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
    return api.deriveKey(
        { name: 'PBKDF2', hash: 'SHA-256', salt: asBuffer(salt), iterations },
        material,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Emballe les octets de la DEK avec une KEK : `iv || chiffré || tag`, en base64url.
 * @param dekBytes 32 octets de la DEK.
 * @param kek Clé dérivée du secret.
 */
export async function wrapDek(dekBytes: Uint8Array, kek: CryptoKey): Promise<string> {
    const iv = randomBytes(IV_BYTES);
    const sealed = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, tagLength: TAG_BITS }, kek, asBuffer(dekBytes)));
    return toBase64Url(concat(iv, sealed));
}

/**
 * Déballe une DEK emballée. Un mauvais secret produit une erreur typée `wrong_password`.
 * @param wrapped base64url de `iv || chiffré || tag`.
 * @param kek Clé dérivée du secret saisi.
 * @returns Les 32 octets de la DEK (à importer puis à effacer).
 */
export async function unwrapDek(wrapped: string, kek: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
    let bytes: Uint8Array;
    try {
        bytes = fromBase64Url(wrapped);
    } catch {
        throw new VaultCryptoError('invalid_format', 'DEK emballée illisible.');
    }
    if (bytes.length < IV_BYTES + TAG_BITS / 8 + 1) {
        throw new VaultCryptoError('invalid_format', 'DEK emballée trop courte.');
    }
    try {
        const plain = await subtle().decrypt(
            { name: 'AES-GCM', iv: asBuffer(bytes.subarray(0, IV_BYTES)), tagLength: TAG_BITS },
            kek,
            asBuffer(bytes.subarray(IV_BYTES))
        );
        const out = new Uint8Array(plain);
        if (out.length !== DEK_BYTES) throw new VaultCryptoError('invalid_format', 'Taille de DEK inattendue.');
        return out;
    } catch (e: unknown) {
        if (e instanceof VaultCryptoError) throw e;
        throw new VaultCryptoError('wrong_password', 'Mot de passe incorrect pour ce Coffre.');
    }
}

/**
 * Importe les octets d’une DEK en clés d’usage **non extractibles** : AES-GCM pour les champs,
 * HMAC-SHA-256 (HKDF, info `blind-index`) pour l’empreinte d’IBAN. Les octets sont effacés ensuite.
 * @param dekBytes 32 octets de la DEK (mis à zéro par cette fonction).
 */
export async function importVaultKeys(dekBytes: Uint8Array): Promise<VaultKeys> {
    const api = subtle();
    const raw = asBuffer(dekBytes);
    try {
        const dek = await api.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
        const hkdfBase = await api.importKey('raw', raw, 'HKDF', false, ['deriveKey']);
        const fingerprintKey = await api.deriveKey(
            { name: 'HKDF', hash: 'SHA-256', salt: new ArrayBuffer(0), info: encoder.encode(HKDF_BLIND_INDEX_INFO) },
            hkdfBase,
            { name: 'HMAC', hash: 'SHA-256', length: 256 },
            false,
            ['sign']
        );
        return { dek, fingerprintKey };
    } finally {
        dekBytes.fill(0);
        new Uint8Array(raw).fill(0);
    }
}

/**
 * Prépare un nouveau Coffre : DEK et sel aléatoires, KEK du mot de passe, DEK emballée.
 * @param password Mot de passe saisi par l’utilisateur.
 * @returns Les paramètres à envoyer au serveur et les clés d’usage (non extractibles).
 */
export async function createVaultSetup(password: string): Promise<{ setup: VaultSetupRequest; keys: VaultKeys }> {
    const salt = generateSalt();
    const dekBytes = generateDekBytes();
    const kek = await deriveKek(password, salt);
    const dekWrappedPassword = await wrapDek(dekBytes, kek);
    const keys = await importVaultKeys(dekBytes);
    return {
        setup: {
            kdf: 'pbkdf2',
            iterations: VAULT_KDF_ITERATIONS,
            memoryKiB: null,
            parallelism: null,
            salt: toBase64Url(salt),
            dekWrappedPassword
        },
        keys
    };
}

/** Paramètres de dérivation renvoyés par `GET /api/vault`. */
export type VaultKdfParams = {
    kdf: VaultKdf | string | null;
    iterations: number | null;
    salt: string | null;
};

/**
 * Déballe la DEK d’un Coffre existant avec un secret et les paramètres annoncés par le serveur.
 * @param secret Mot de passe (ou code de récupération avec `recoverySalt`).
 * @param params `kdf`, `iterations`, `salt` du Coffre.
 * @param wrapped DEK emballée par ce secret.
 * @returns Les octets de la DEK (à importer ou ré-emballer, puis effacer).
 */
export async function unwrapDekWithSecret(secret: string, params: VaultKdfParams, wrapped: string): Promise<Uint8Array<ArrayBuffer>> {
    if (params.kdf !== 'pbkdf2') {
        throw new VaultCryptoError('unsupported_kdf', `Dérivation non prise en charge : ${String(params.kdf)}.`);
    }
    if (!params.salt || !params.iterations) {
        throw new VaultCryptoError('invalid_format', 'Paramètres du Coffre incomplets.');
    }
    const kek = await deriveKek(secret, fromBase64Url(params.salt), params.iterations);
    return unwrapDek(wrapped, kek);
}

/**
 * Chiffre un champ : `enc:v1:<base64url(iv || chiffré || tag)>`, AAD `table:colonne:publicId`.
 * @param dek Clé de données.
 * @param table Table SQL du catalogue (`account`, `vehicle_asset`…).
 * @param column Colonne SQL (`iban`, `immatriculation`…).
 * @param publicId Identifiant public de l’agrégat.
 * @param plaintext Valeur en clair.
 */
export async function encryptField(dek: CryptoKey, table: string, column: string, publicId: string, plaintext: string): Promise<string> {
    const iv = randomBytes(IV_BYTES);
    const sealed = new Uint8Array(
        await subtle().encrypt(
            { name: 'AES-GCM', iv, tagLength: TAG_BITS, additionalData: encoder.encode(fieldAad(table, column, publicId)) },
            dek,
            encoder.encode(plaintext)
        )
    );
    return `${VAULT_PREFIX}${toBase64Url(concat(iv, sealed))}`;
}

/**
 * Déchiffre un champ `enc:v1:`. Ne lance jamais : renvoie `{ ok: false, reason: 'unreadable' }`
 * si le format, la clé ou l’AAD ne correspondent pas.
 * @param dek Clé de données.
 * @param table Table SQL.
 * @param column Colonne SQL.
 * @param publicId Identifiant public de l’agrégat.
 * @param value Valeur chiffrée.
 */
export async function decryptField(dek: CryptoKey, table: string, column: string, publicId: string, value: string): Promise<DecryptResult> {
    if (!isCipher(value)) return { ok: false, reason: 'unreadable' };
    const body = value.slice(VAULT_PREFIX.length);
    if (!isBase64Url(body)) return { ok: false, reason: 'unreadable' };
    try {
        const bytes = fromBase64Url(body);
        if (bytes.length < IV_BYTES + TAG_BITS / 8 + 1) return { ok: false, reason: 'unreadable' };
        const plain = await subtle().decrypt(
            {
                name: 'AES-GCM',
                iv: asBuffer(bytes.subarray(0, IV_BYTES)),
                tagLength: TAG_BITS,
                additionalData: encoder.encode(fieldAad(table, column, publicId))
            },
            dek,
            asBuffer(bytes.subarray(IV_BYTES))
        );
        return { ok: true, value: decoder.decode(plain) };
    } catch {
        return { ok: false, reason: 'unreadable' };
    }
}

/** IBAN normalisé pour l’empreinte : majuscules, sans espaces. */
export function normalizeIbanForFingerprint(iban: string): string {
    return iban.replace(/\s+/g, '').toUpperCase();
}

/**
 * Empreinte d’IBAN : `h:` + base64url(HMAC-SHA-256(iban normalisé)), 43 caractères après `h:`.
 * @param fingerprintKey Clé HMAC dérivée de la DEK (HKDF `blind-index`).
 * @param iban IBAN en clair (espaces et casse tolérés).
 */
export async function ibanFingerprint(fingerprintKey: CryptoKey, iban: string): Promise<string> {
    const mac = await subtle().sign('HMAC', fingerprintKey, encoder.encode(normalizeIbanForFingerprint(iban)));
    return `${VAULT_FINGERPRINT_PREFIX}${toBase64Url(new Uint8Array(mac))}`;
}
