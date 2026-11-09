/**
 * Champs du périmètre étendu d’un fichier (`file.name_original`, `file.description`) : déchiffrés à la
 * lecture, chiffrés dans le PATCH quand le Coffre est ouvert et que l’offre le permet. Le contenu du PDF
 * est traité à part (`vault/file-content.ts`, `FileDto.encrypted`).
 */
import { useVaultStore } from '@/features/vault/stores/vault-store';
import { isCipher } from '@/features/vault/crypto';
import type { FileDto, UpdateFileRequest } from '@/features/files/types';

export const FILE_VAULT_TABLE = 'file';
export const FILE_VAULT_COLUMNS = { nameOriginal: 'name_original', description: 'description' } as const;

/**
 * Remplace les chiffrés lisibles par leur clair ; un chiffré illisible reste tel quel (« 🔒 illisible »).
 * @param file Fichier tel que renvoyé par l’API.
 */
export async function decryptFileFields(file: FileDto): Promise<FileDto> {
    if (!isCipher(file.nameOriginal) && !isCipher(file.description)) return file;
    const vault = useVaultStore();
    const next: FileDto = { ...file };
    if (isCipher(file.nameOriginal)) {
        const result = await vault.decrypt(FILE_VAULT_TABLE, FILE_VAULT_COLUMNS.nameOriginal, file.publicId, file.nameOriginal);
        if (result.ok) next.nameOriginal = result.value;
    }
    if (isCipher(file.description)) {
        const result = await vault.decrypt(FILE_VAULT_TABLE, FILE_VAULT_COLUMNS.description, file.publicId, file.description);
        if (result.ok) next.description = result.value;
    }
    return next;
}

/**
 * Chiffre `nameOriginal` / `description` d’un PATCH pour un fichier connu. Hors périmètre : inchangé.
 * @param publicId Identifiant public du fichier (AAD).
 * @param request PATCH partiel en clair.
 */
export async function encryptFileUpdate(publicId: string, request: UpdateFileRequest): Promise<UpdateFileRequest> {
    const vault = useVaultStore();
    const next: UpdateFileRequest = { ...request };
    if (typeof request.nameOriginal === 'string' && request.nameOriginal && !isCipher(request.nameOriginal)) {
        next.nameOriginal =
            (await vault.encrypt(FILE_VAULT_TABLE, FILE_VAULT_COLUMNS.nameOriginal, publicId, request.nameOriginal)) ?? undefined;
    }
    if (typeof request.description === 'string' && request.description && !isCipher(request.description)) {
        next.description = await vault.encrypt(FILE_VAULT_TABLE, FILE_VAULT_COLUMNS.description, publicId, request.description);
    }
    return next;
}

/**
 * PATCH à poser juste après un `POST /api/files` chiffré : le nom réel du fichier, chiffré avec le
 * `publicId` attribué par le serveur (le POST est parti sous un nom neutre).
 * @param publicId Identifiant public du fichier créé.
 * @param nameOriginal Nom réel du fichier choisi par l’utilisateur.
 */
export async function buildEncryptedNamePatch(publicId: string, nameOriginal: string): Promise<UpdateFileRequest> {
    return encryptFileUpdate(publicId, { nameOriginal });
}
