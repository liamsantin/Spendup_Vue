/**
 * Chiffrement du contenu d’un PDF (périmètre étendu) : AES-256-GCM avec la DEK, format binaire brut
 * `iv[12] || chiffré || tag[16]` (pas de base64, pas de préfixe : le serveur range des octets opaques,
 * `file.encrypted` dit qu’il faut déchiffrer). AAD `file:content` : le `publicId` n’est connu qu’après
 * `POST /api/files`, le contenu ne peut donc pas y être lié ; le nom et la description le sont (PATCH).
 */
import { VAULT_FILE_CONTENT_AAD } from '@/features/vault/catalog';

const IV_BYTES = 12;
const TAG_BITS = 128;
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF
const PDF_MIME = 'application/pdf';

const encoder = new TextEncoder();

function asBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** Octets d’un blob (`arrayBuffer()` n’existe pas dans tous les environnements de test : repli FileReader). */
export async function blobBytes(blob: Blob): Promise<Uint8Array> {
    if (typeof blob.arrayBuffer === 'function') return new Uint8Array(await blob.arrayBuffer());
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
        reader.onerror = () => reject(reader.error ?? new Error('Lecture du blob impossible.'));
        reader.readAsArrayBuffer(blob);
    });
}

/**
 * Chiffre les octets d’un fichier.
 * @param dek Clé de données du Coffre.
 * @param plain Octets du PDF.
 * @returns `iv || chiffré || tag`.
 */
export async function encryptFileBytes(dek: CryptoKey, plain: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
    const iv = new Uint8Array(new ArrayBuffer(IV_BYTES));
    globalThis.crypto.getRandomValues(iv);
    const sealed = new Uint8Array(
        await globalThis.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv, tagLength: TAG_BITS, additionalData: encoder.encode(VAULT_FILE_CONTENT_AAD) },
            dek,
            asBuffer(plain)
        )
    );
    const out = new Uint8Array(new ArrayBuffer(iv.length + sealed.length));
    out.set(iv, 0);
    out.set(sealed, iv.length);
    return out;
}

/**
 * Déchiffre les octets d’un fichier chiffré par `encryptFileBytes`.
 * @param dek Clé de données du Coffre.
 * @param sealed `iv || chiffré || tag`.
 * @returns Les octets en clair, ou `null` si la clé, le format ou l’AAD ne correspondent pas.
 */
export async function decryptFileBytes(dek: CryptoKey, sealed: Uint8Array): Promise<Uint8Array<ArrayBuffer> | null> {
    if (sealed.length < IV_BYTES + TAG_BITS / 8 + 1) return null;
    try {
        const plain = await globalThis.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: asBuffer(sealed.subarray(0, IV_BYTES)),
                tagLength: TAG_BITS,
                additionalData: encoder.encode(VAULT_FILE_CONTENT_AAD)
            },
            dek,
            asBuffer(sealed.subarray(IV_BYTES))
        );
        return new Uint8Array(plain);
    } catch {
        return null;
    }
}

/** Vrai si les octets commencent par `%PDF` (contenu en clair). */
export function looksLikePdf(bytes: Uint8Array): boolean {
    return bytes.length >= PDF_MAGIC.length && PDF_MAGIC.every((byte, index) => bytes[index] === byte);
}

/**
 * Chiffre un `File` PDF pour `POST /api/files` (`encrypted=true`). Le nom envoyé est neutre : le nom
 * réel part chiffré par PATCH une fois le `publicId` connu.
 * @param dek Clé de données.
 * @param file PDF choisi par l’utilisateur.
 * @param neutralName Nom de fichier neutre envoyé au serveur.
 */
export async function encryptPdfFile(dek: CryptoKey, file: File, neutralName = 'document.pdf'): Promise<File> {
    const plain = await blobBytes(file);
    const sealed = await encryptFileBytes(dek, plain);
    return new File([sealed], neutralName, { type: 'application/octet-stream', lastModified: file.lastModified });
}

/**
 * Déchiffre un blob téléchargé si nécessaire : un blob qui commence déjà par `%PDF` est renvoyé tel quel.
 * @param dek Clé de données, ou `null` (Coffre fermé).
 * @param blob Contenu renvoyé par `GET /api/files/{id}/content`.
 * @returns Le PDF en clair, ou `null` si chiffré et indéchiffrable (Coffre fermé, autre clé).
 */
export async function decryptPdfBlob(dek: CryptoKey | null, blob: Blob): Promise<Blob | null> {
    const bytes = await blobBytes(blob);
    if (looksLikePdf(bytes)) return blob;
    if (!dek) return null;
    const plain = await decryptFileBytes(dek, bytes);
    if (!plain) return null;
    return new Blob([plain], { type: PDF_MIME });
}
