/**
 * Migration silencieuse par lots : le serveur liste ce qui reste à chiffrer (valeurs en clair d’un
 * champ autorisé) ou à déchiffrer (champ sorti du périmètre, Coffre en `disabling`) ; le navigateur
 * traite et renvoie. Tout ou rien par lot : un `409 CONFLICT` fait relire le lot.
 */
import { AppError } from '@/utils/errors/app-error';
import { vaultApi } from '@/features/vault/api';
import { decryptField, encryptField, ibanFingerprint, type VaultKeys } from '@/features/vault/crypto';
import type { VaultMigrateItem, VaultMigrateWriteItem, VaultState } from '@/features/vault/types';

/** Taille de lot demandée (le serveur borne par `Vault:MigrateBatchSize`). */
export const VAULT_MIGRATE_TAKE = 200;
/** Lots relus d’affilée après 409 avant d’abandonner. */
const MAX_CONFLICT_RETRIES = 5;
/** Garde-fou contre une boucle sans progrès (serveur qui renvoie toujours le même reste). */
const MAX_ROUNDS = 1000;

export type MigrationProgress = {
    /** Éléments connus au départ (reste + lot courant). */
    total: number;
    /** Éléments appliqués. */
    done: number;
    remaining: number;
};

export type MigrationOutcome = {
    applied: number;
    /** Éléments laissés de côté (déchiffrement impossible). */
    skipped: number;
    state: VaultState | null;
    completed: boolean;
};

/**
 * Convertit un élément de lot en écriture : chiffré (+ empreinte pour `account.iban`) ou clair.
 * @returns `null` si un chiffré est illisible (laissé tel quel, compté comme ignoré).
 */
async function processItem(keys: VaultKeys, item: VaultMigrateItem): Promise<VaultMigrateWriteItem | null> {
    if (item.action === 'encrypt') {
        const value = await encryptField(keys.dek, item.table, item.field, item.publicId, item.value);
        const fingerprint =
            item.table === 'account' && item.field === 'iban' ? await ibanFingerprint(keys.fingerprintKey, item.value) : null;
        return { table: item.table, publicId: item.publicId, field: item.field, value, version: item.version, fingerprint };
    }
    const result = await decryptField(keys.dek, item.table, item.field, item.publicId, item.value);
    if (!result.ok) return null;
    return { table: item.table, publicId: item.publicId, field: item.field, value: result.value, version: item.version };
}

function isConflict(error: unknown): boolean {
    return error instanceof AppError && (error.status === 409 || error.code === 'CONFLICT');
}

/**
 * Exécute la migration jusqu’à épuisement (ou impossibilité de progresser), puis `complete` si le
 * Coffre est encore en `migrating`.
 * @param keys Clés d’usage du Coffre ouvert.
 * @param initialState État du Coffre au départ.
 * @param onProgress Rappel de progression (bandeau discret).
 */
export async function runVaultMigration(
    keys: VaultKeys,
    initialState: VaultState | null,
    onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationOutcome> {
    let applied = 0;
    let skipped = 0;
    let state = initialState;
    let total = -1;
    let conflicts = 0;
    let rounds = 0;
    let lastRemaining = -1;

    while (rounds < MAX_ROUNDS) {
        rounds += 1;
        const batch = await vaultApi.migrateBatch(VAULT_MIGRATE_TAKE);
        const items = Array.isArray(batch.items) ? batch.items : [];
        const remaining = Number(batch.remaining) || 0;
        if (total < 0) total = remaining;
        onProgress?.({ total, done: applied, remaining });

        if (!items.length) {
            break;
        }

        const writes: VaultMigrateWriteItem[] = [];
        for (const item of items) {
            const write = await processItem(keys, item);
            if (write) writes.push(write);
            else skipped += 1;
        }
        if (!writes.length) {
            // Rien d’écrivable (tout illisible) : inutile d’insister.
            break;
        }

        try {
            const result = await vaultApi.migrateWrite(writes);
            applied += result.applied;
            state = result.state;
            conflicts = 0;
            onProgress?.({ total, done: applied, remaining: result.remaining });
            if (result.remaining === 0) break;
            // Le serveur renvoie toujours le même reste : les éléments ignorés bloquent, on s’arrête.
            if (result.remaining === lastRemaining && result.applied === 0) break;
            lastRemaining = result.remaining;
        } catch (e: unknown) {
            if (!isConflict(e)) throw e;
            conflicts += 1;
            if (conflicts > MAX_CONFLICT_RETRIES) throw e;
            // Une ligne a changé entre la lecture et l’écriture : on relit le lot.
        }
    }

    let completed = false;
    if (state === 'migrating' && skipped === 0) {
        const check = await vaultApi.migrateBatch(1);
        if (!check.items?.length && (Number(check.remaining) || 0) === 0) {
            const status = await vaultApi.complete();
            state = status?.state ?? 'active';
            completed = true;
        }
    }

    return { applied, skipped, state, completed };
}
