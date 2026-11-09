/**
 * Noms de fichiers lus hors du store `files` (pièces jointes d’une transaction, documents d’un bien,
 * récurrences) : l’API les renvoie chiffrés (`enc:v1:`) quand le Coffre couvre le périmètre étendu.
 * Ce module les déchiffre à la demande via le catalogue (`file.name_original`, publicId du fichier) et
 * garde le clair dans un cache réactif : le template affiche « Illisible » le temps du déchiffrement.
 */
import { reactive } from 'vue';
import { isCipher } from '@/features/vault/crypto';
import { useVaultStore } from '@/features/vault/stores/vault-store';

const FILE_TABLE = 'file';
const NAME_COLUMN = 'name_original';

/** Clairs connus, par `publicId:chiffré` (un nom re-chiffré donne une autre clé). */
const resolved = reactive(new Map<string, string>());
const pending = new Set<string>();

function cacheKey(publicId: string, cipher: string): string {
    return `${publicId}:${cipher}`;
}

/**
 * Nom affichable d’un fichier imbriqué : le clair s’il n’est pas chiffré ou déjà déchiffré, sinon
 * `unreadableLabel` (et le déchiffrement est lancé une fois ; le cache réactif rafraîchit l’affichage).
 * @param publicId Identifiant public du fichier.
 * @param nameOriginal Nom tel que renvoyé par l’API.
 * @param unreadableLabel Libellé « Illisible » traduit.
 */
export function displayFileName(publicId: string, nameOriginal: string | null | undefined, unreadableLabel: string): string {
    if (!nameOriginal) return '';
    if (!isCipher(nameOriginal)) return nameOriginal;
    const key = cacheKey(publicId, nameOriginal);
    const known = resolved.get(key);
    if (known != null) return known;
    if (!pending.has(key)) {
        pending.add(key);
        void useVaultStore()
            .decrypt(FILE_TABLE, NAME_COLUMN, publicId, nameOriginal)
            .then((result) => {
                if (result.ok) resolved.set(key, result.value);
            })
            .finally(() => pending.delete(key));
    }
    return unreadableLabel;
}

/** Vide le cache (tests, déconnexion). */
export function clearFileNameCache(): void {
    resolved.clear();
    pending.clear();
}
