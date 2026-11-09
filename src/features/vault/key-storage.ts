/**
 * Conservation des clés du Coffre sur l’appareil : `CryptoKey` **non extractibles** dans IndexedDB
 * (jamais `localStorage` / `sessionStorage`). Sans IndexedDB (tests, navigation privée stricte),
 * repli en mémoire : la clé vit le temps de l’onglet.
 */
import type { VaultKeys } from '@/features/vault/crypto';

const DB_NAME = 'spendup-vault';
const DB_VERSION = 1;
const STORE_NAME = 'keys';
const RECORD_ID = 'current';

type StoredRecord = {
    id: string;
    userPublicId: string;
    dek: CryptoKey;
    fingerprintKey: CryptoKey;
};

let memoryRecord: StoredRecord | null = null;

function hasIndexedDb(): boolean {
    return typeof indexedDB !== 'undefined' && indexedDB != null;
}

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB indisponible.'));
        request.onblocked = () => reject(new Error('IndexedDB bloquée.'));
    });
}

function runTransaction<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return openDb().then(
        (db) =>
            new Promise<T>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, mode);
                const request = work(tx.objectStore(STORE_NAME));
                tx.oncomplete = () => {
                    db.close();
                    resolve(request.result);
                };
                tx.onerror = () => {
                    db.close();
                    reject(tx.error ?? new Error('Transaction IndexedDB en échec.'));
                };
                tx.onabort = () => {
                    db.close();
                    reject(tx.error ?? new Error('Transaction IndexedDB annulée.'));
                };
            })
    );
}

/**
 * Enregistre les clés d’usage pour l’utilisateur courant (remplace les précédentes).
 * @param userPublicId Identifiant public de l’utilisateur propriétaire des clés.
 * @param keys DEK et clé d’empreinte, non extractibles.
 */
export async function saveVaultKeys(userPublicId: string, keys: VaultKeys): Promise<void> {
    const record: StoredRecord = { id: RECORD_ID, userPublicId, dek: keys.dek, fingerprintKey: keys.fingerprintKey };
    memoryRecord = record;
    if (!hasIndexedDb()) return;
    try {
        await runTransaction('readwrite', (store) => store.put(record));
    } catch {
        // Le repli mémoire suffit pour la session en cours.
    }
}

/**
 * Relit les clés de l’appareil si elles appartiennent à l’utilisateur donné.
 * @param userPublicId Identifiant public attendu (une autre identité → `null`).
 */
export async function loadVaultKeys(userPublicId: string): Promise<VaultKeys | null> {
    let record: StoredRecord | null = memoryRecord;
    if (!record && hasIndexedDb()) {
        try {
            record = (await runTransaction<StoredRecord | undefined>('readonly', (store) => store.get(RECORD_ID))) ?? null;
        } catch {
            record = null;
        }
    }
    if (!record || record.userPublicId !== userPublicId) return null;
    if (!(record.dek instanceof CryptoKey) || !(record.fingerprintKey instanceof CryptoKey)) return null;
    memoryRecord = record;
    return { dek: record.dek, fingerprintKey: record.fingerprintKey };
}

/** Efface les clés de l’appareil (déconnexion, inactivité, révocation). */
export async function clearVaultKeys(): Promise<void> {
    memoryRecord = null;
    if (!hasIndexedDb()) return;
    try {
        await runTransaction('readwrite', (store) => store.delete(RECORD_ID));
    } catch {
        // Rien à faire : la base n’existe pas ou est inaccessible.
    }
}
