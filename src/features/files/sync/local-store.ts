/**
 * Accès au dossier local des PDF (app de bureau). Le webview n'a pas d'accès disque générique : chaque
 * opération passe par une commande Rust fermée sur `<racine>/<compte>/` (voir `src-tauri/src/local_files.rs`).
 * Contenus binaires en IPC brut (pas de JSON) ; noms et compte passés en en-têtes `encodeURIComponent`.
 */
import { invoke } from '@tauri-apps/api/core';

/** Erreur Rust quand le dossier choisi est introuvable (disque débranché) : ne jamais l'interpréter comme une suppression. */
export const LOCAL_ROOT_UNAVAILABLE = 'ROOT_UNAVAILABLE';
/** Erreur Rust quand le fichier demandé n'existe pas. */
export const LOCAL_NOT_FOUND = 'NOT_FOUND';

export type LocalRoot = {
    path: string;
    /** Dossier choisi par l'utilisateur (sinon `Documents/Spend.Up`). */
    configured: boolean;
    /** Faux si le dossier choisi est introuvable. */
    available: boolean;
};

export type LocalEntry = { name: string; size: number; modifiedMs: number };
export type LocalWriteResult = { sha256: string; size: number };

function errorText(e: unknown): string {
    return typeof e === 'string' ? e : e instanceof Error ? e.message : String(e);
}

/** Vrai si l'erreur signale un dossier racine introuvable. */
export function isRootUnavailable(e: unknown): boolean {
    return errorText(e).includes(LOCAL_ROOT_UNAVAILABLE);
}

/** Vrai si l'erreur signale un fichier absent. */
export function isLocalNotFound(e: unknown): boolean {
    return errorText(e).includes(LOCAL_NOT_FOUND);
}

export const localStore = {
    async getRoot(): Promise<LocalRoot> {
        const [path, configured, available] = await invoke<[string, boolean, boolean]>('local_files_get_root');
        return { path, configured, available };
    },

    /** Sélecteur natif ; `null` si annulé. */
    pickRoot(): Promise<string | null> {
        return invoke<string | null>('local_files_pick_root');
    },

    /** Change la racine ; avec `moveAccount`, déplace le dossier de ce compte. Renvoie le chemin retenu. */
    setRoot(path: string, moveAccount?: string): Promise<string> {
        return invoke<string>('local_files_set_root', { path, moveAccount: moveAccount ?? null });
    },

    list(account: string): Promise<LocalEntry[]> {
        return invoke<LocalEntry[]>('local_files_list', { account });
    },

    async read(account: string, name: string): Promise<Uint8Array<ArrayBuffer>> {
        const buffer = await invoke<ArrayBuffer>('local_files_read', { account, name });
        return new Uint8Array(buffer);
    },

    /** Écriture atomique ; renvoie l'empreinte relue sur le disque. */
    write(account: string, name: string, bytes: Uint8Array): Promise<LocalWriteResult> {
        return invoke<LocalWriteResult>('local_files_write', bytes, {
            headers: { 'x-account': encodeURIComponent(account), 'x-name': encodeURIComponent(name) }
        });
    },

    hash(account: string, name: string): Promise<LocalWriteResult> {
        return invoke<LocalWriteResult>('local_files_hash', { account, name });
    },

    rename(account: string, from: string, to: string): Promise<void> {
        return invoke('local_files_rename', { account, from, to });
    },

    /** `toTrash` : dans `.corbeille/` (suppression venue d'un autre appareil), sinon définitif. */
    remove(account: string, name: string, toTrash: boolean): Promise<void> {
        return invoke('local_files_delete', { account, name, toTrash });
    },

    purgeTrash(account: string, maxAgeDays: number): Promise<number> {
        return invoke<number>('local_files_purge_trash', { account, maxAgeDays });
    },

    readIndex(account: string): Promise<string | null> {
        return invoke<string | null>('local_files_read_index', { account });
    },

    writeIndex(account: string, json: string): Promise<void> {
        return invoke('local_files_write_index', { account, json });
    }
};
