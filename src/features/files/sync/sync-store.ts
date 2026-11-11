/**
 * Synchro des PDF façon drive (app de bureau uniquement).
 *
 * Le dossier local est la référence ; l'Object Storage est un miroir limité au quota, rempli du plus ancien au
 * plus récent (ordre strict, voir `sync-plan.ts`). Le serveur reste la source de vérité des métadonnées : chaque
 * passage lit `GET /api/files/changes`, range les suppressions venues d'ailleurs dans la corbeille locale, repère
 * les fichiers disparus du dossier, puis vide la file d'envoi si la synchro est activée sur cet appareil.
 * Dans le navigateur, `available` reste faux et rien ne s'exécute.
 */
import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { AppError } from '@/utils/errors/app-error';
import { isTauri } from '@/utils/helpers/platform-helpers';
import { useAuthStore } from '@/features/auth';
import { getOrCreateDeviceId } from '@/features/auth/device';
import { filesApi } from '@/features/files/api';
import { FILE_MAX_BYTES, type FileDto, type FileUsage } from '@/features/files/types';
import { decryptFileFields } from '@/features/files/vault-fields';
import { useVaultStore } from '@/features/vault/stores/vault-store';
import { generatePublicId, isConflictError } from '@/features/vault/public-id';
import { isLocalNotFound, isRootUnavailable, localStore, type LocalRoot } from '@/features/files/sync/local-store';
import {
    fileSyncStatus,
    localFileName,
    parseIndex,
    planUploads,
    sha256Hex,
    type LocalIndex,
    type SyncStatus,
    type UploadPlan
} from '@/features/files/sync/sync-plan';

const ENABLED_KEY = 'spendup_file_sync_enabled';
const PROMPTED_KEY = 'spendup_file_sync_prompted';
/** Durée de conservation de la corbeille locale. */
export const TRASH_RETENTION_DAYS = 30;
/** Passage périodique pendant que l'app est ouverte. */
const SYNC_INTERVAL_MS = 5 * 60_000;

function readFlag(key: string): boolean {
    try {
        return localStorage.getItem(key) === '1';
    } catch {
        return false;
    }
}

function writeFlag(key: string, value: boolean) {
    try {
        localStorage.setItem(key, value ? '1' : '0');
    } catch {
        /* préférence non mémorisée : sans conséquence */
    }
}

function isRateOrQuota(err: AppError): boolean {
    return err.status === 400 && /quota|trop d'uploads|trop d’uploads/i.test(err.message);
}

export type SyncPause = 'quota' | 'rate' | 'root_unavailable' | 'offline' | null;

export const useFileSyncStore = defineStore('fileSync', () => {
    const available = isTauri();
    const deviceId = available ? getOrCreateDeviceId() : '';

    const root = ref<LocalRoot | null>(null);
    const enabled = ref(readFlag(ENABLED_KEY));
    const prompted = ref(readFlag(PROMPTED_KEY));
    const index = ref<LocalIndex>({ version: 1, entries: {} });
    /** Fichiers connus du serveur (métadonnées déchiffrées), par identifiant. */
    const remote = reactive(new Map<string, FileDto>());
    /** Entrées de l'index dont le fichier a disparu du dossier. */
    const missing = reactive(new Set<string>());
    const running = ref(false);
    const progress = reactive({ done: 0, total: 0 });
    const pause = ref<SyncPause>(null);
    const plan = ref<UploadPlan>({ upload: [], blocked: null, blockedNeverFits: false });
    const lastError = ref<string | null>(null);
    const lastRunAt = ref<Date | null>(null);
    let account: string | null = null;
    let serverSince: string | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let pending: Promise<void> | null = null;

    const ready = computed(() => available && account !== null && root.value?.available === true);

    function isHere(publicId: string): boolean {
        return !!index.value.entries[publicId] && !missing.has(publicId);
    }

    function statusOf(file: FileDto): SyncStatus {
        return fileSyncStatus(file, { deviceId, isHere, syncEnabled: enabled.value, desktop: ready.value });
    }

    /** Fichiers seulement sur ce poste (hors quota), pour le compteur « pas sauvegardés en ligne ». */
    const localOnlyHere = computed(() =>
        [...remote.values()].filter((f) => f.contentLocation === 'local_only' && f.localDevice?.deviceIdentifier === deviceId)
    );

    async function saveIndex() {
        if (!account) return;
        await localStore.writeIndex(account, JSON.stringify(index.value));
    }

    function requireAccount(): string {
        if (!account) throw new AppError('Le dossier local n’est pas prêt.', 0);
        return account;
    }

    /** Démarre la synchro pour le compte connecté (appelé après la connexion). */
    async function start() {
        if (!available) return;
        const me = useAuthStore().user;
        if (!me?.userPublicId) return;
        account = me.userPublicId;
        serverSince = null;
        remote.clear();
        missing.clear();
        try {
            root.value = await localStore.getRoot();
            if (root.value.available) {
                index.value = parseIndex(await localStore.readIndex(account));
            }
        } catch (e: unknown) {
            pause.value = isRootUnavailable(e) ? 'root_unavailable' : pause.value;
            lastError.value = AppError.fromUnknown(e).message;
        }
        if (!timer) timer = setInterval(() => void run(), SYNC_INTERVAL_MS);
        void run();
    }

    /** Arrête la synchro (déconnexion). Le dossier local est conservé. */
    function stop() {
        if (timer) clearInterval(timer);
        timer = null;
        account = null;
        serverSince = null;
        remote.clear();
        missing.clear();
        index.value = { version: 1, entries: {} };
        plan.value = { upload: [], blocked: null, blockedNeverFits: false };
        pause.value = null;
    }

    /** Un passage complet ; les appels concurrents attendent le passage en cours. */
    function run(): Promise<void> {
        if (!available || !account) return Promise.resolve();
        if (pending) return pending;
        pending = runOnce().finally(() => {
            pending = null;
        });
        return pending;
    }

    async function runOnce() {
        const acc = account!;
        running.value = true;
        lastError.value = null;
        try {
            root.value = await localStore.getRoot();
            if (!root.value.available) {
                pause.value = 'root_unavailable';
                return;
            }
            if (pause.value === 'root_unavailable') pause.value = null;

            await pullChanges(acc);
            await checkIntegrity(acc);
            await localStore.purgeTrash(acc, TRASH_RETENTION_DAYS).catch(() => 0);
            await uploadQueue();
            lastRunAt.value = new Date();
        } catch (e: unknown) {
            if (isRootUnavailable(e)) {
                pause.value = 'root_unavailable';
                return;
            }
            const err = AppError.fromUnknown(e);
            if (err.status === 0) pause.value = 'offline';
            lastError.value = err.message;
        } finally {
            running.value = false;
        }
    }

    /** Applique les changements serveur ; les suppressions venues d'un autre appareil vont dans la corbeille. */
    async function pullChanges(acc: string) {
        const full = serverSince === null;
        const changes = await filesApi.changes(serverSince);
        const items = await Promise.all(changes.items.map(decryptFileFields));
        const deleted = new Set(changes.deletedPublicIds);
        if (full) {
            const alive = new Set(items.map((f) => f.publicId));
            remote.clear();
            for (const id of Object.keys(index.value.entries)) {
                if (!alive.has(id)) deleted.add(id);
            }
        }
        for (const file of items) remote.set(file.publicId, file);

        let indexChanged = false;
        for (const id of deleted) {
            remote.delete(id);
            const entry = index.value.entries[id];
            if (!entry) continue;
            await localStore.remove(acc, entry.name, true);
            delete index.value.entries[id];
            missing.delete(id);
            indexChanged = true;
        }
        if (indexChanged) await saveIndex();
        serverSince = changes.serverTime;
        if (pause.value === 'offline') pause.value = null;
    }

    /** Repère les fichiers de l'index disparus du dossier (supprimés ou déplacés à la main). */
    async function checkIntegrity(acc: string) {
        const present = new Set((await localStore.list(acc)).map((e) => e.name));
        missing.clear();
        for (const [id, entry] of Object.entries(index.value.entries)) {
            if (!present.has(entry.name)) missing.add(id);
        }
        for (const file of remote.values()) {
            if (
                file.contentLocation === 'local_only' &&
                file.localDevice?.deviceIdentifier === deviceId &&
                !index.value.entries[file.publicId]
            ) {
                missing.add(file.publicId);
            }
        }
    }

    function computePlan(usage: FileUsage): UploadPlan {
        return planUploads([...remote.values()], {
            deviceId,
            isHere,
            remainingBytes: usage.remainingBytes,
            quotaBytes: usage.quotaBytes,
            unlimited: usage.isUnlimited,
            maxFileBytes: FILE_MAX_BYTES
        });
    }

    /** Envoie la file en ordre strict ; s'arrête au premier refus de quota ou de débit. */
    async function uploadQueue() {
        const usage = await filesApi.usage();
        plan.value = computePlan(usage);
        if (!enabled.value) return;
        const acc = requireAccount();
        const queue = plan.value.upload;
        progress.total = queue.length;
        progress.done = 0;
        if (pause.value === 'quota' || pause.value === 'rate') pause.value = null;
        for (const file of queue) {
            const entry = index.value.entries[file.publicId];
            if (!entry) continue;
            try {
                const bytes = await localStore.read(acc, entry.name);
                const updated = await filesApi.uploadContent(file.publicId, new Blob([bytes]));
                remote.set(file.publicId, await decryptFileFields(updated));
                progress.done += 1;
            } catch (e: unknown) {
                if (isLocalNotFound(e)) {
                    missing.add(file.publicId);
                    continue;
                }
                const err = AppError.fromUnknown(e);
                if (isRateOrQuota(err)) {
                    pause.value = /quota/i.test(err.message) ? 'quota' : 'rate';
                    break;
                }
                throw err;
            }
        }
        if (queue.length) plan.value = computePlan(await filesApi.usage());
    }

    /**
     * Ajoute un PDF depuis l'app de bureau : scellé par le Coffre s'il est ouvert, écrit dans le dossier, enregistré
     * côté serveur (hors quota), puis envoyé par la file si la synchro est activée.
     */
    async function addFile(file: File): Promise<FileDto> {
        const acc = requireAccount();
        const vault = useVaultStore();
        for (let attempt = 0; ; attempt += 1) {
            const publicId = generatePublicId();
            const sealed = await vault.encryptPdf(file, publicId);
            const blob = sealed ?? file;
            const bytes = new Uint8Array(await blob.arrayBuffer());
            const sha256 = await sha256Hex(bytes);
            const name = localFileName(publicId, file.name, !!sealed);
            const written = await localStore.write(acc, name, bytes);
            if (written.sha256 !== sha256) {
                await localStore.remove(acc, name, false).catch(() => undefined);
                throw new AppError('L’écriture du fichier sur le disque a échoué.', 0);
            }
            try {
                const created = await decryptFileFields(
                    await filesApi.registerLocal({
                        nameOriginal: sealed?.name ?? file.name,
                        sizeBytes: bytes.byteLength,
                        sha256Hash: sha256,
                        encrypted: !!sealed,
                        publicId
                    })
                );
                index.value.entries[publicId] = { name, sha256, size: bytes.byteLength };
                await saveIndex();
                remote.set(publicId, created);
                void run();
                return created;
            } catch (e: unknown) {
                await localStore.remove(acc, name, false).catch(() => undefined);
                if (!isConflictError(e) || attempt >= 3) throw e;
            }
        }
    }

    /** Copie locale lisible telle que stockée (scellée si chiffrée), ou `null` si le fichier n'est pas sur ce poste. */
    async function readLocal(publicId: string): Promise<Blob | null> {
        const entry = index.value.entries[publicId];
        if (!ready.value || !entry || missing.has(publicId)) return null;
        try {
            return new Blob([await localStore.read(requireAccount(), entry.name)]);
        } catch (e: unknown) {
            if (isLocalNotFound(e)) {
                missing.add(publicId);
                return null;
            }
            throw e;
        }
    }

    /** Garde sur ce poste un contenu téléchargé (« fichier à la demande » ouvert). */
    async function keepDownloaded(file: FileDto, raw: Blob): Promise<void> {
        if (!ready.value || index.value.entries[file.publicId]) return;
        const acc = requireAccount();
        const bytes = new Uint8Array(await raw.arrayBuffer());
        const sha256 = await sha256Hex(bytes);
        if (file.sha256Hash && sha256 !== file.sha256Hash) return;
        const name = localFileName(file.publicId, file.nameOriginal, !!file.encrypted);
        const written = await localStore.write(acc, name, bytes);
        if (written.sha256 !== sha256) return;
        index.value.entries[file.publicId] = { name, sha256, size: bytes.byteLength };
        missing.delete(file.publicId);
        await saveIndex();
    }

    /** Retire la copie de ce poste (le fichier reste en ligne). */
    async function removeLocalCopy(publicId: string, toTrash = false): Promise<void> {
        const entry = index.value.entries[publicId];
        if (!ready.value || !entry) return;
        await localStore.remove(requireAccount(), entry.name, toTrash);
        delete index.value.entries[publicId];
        missing.delete(publicId);
        await saveIndex();
    }

    /** Oublie un fichier supprimé (côté serveur déjà fait). */
    async function forget(publicId: string): Promise<void> {
        remote.delete(publicId);
        await removeLocalCopy(publicId);
    }

    /** Tient compte d'une ligne renvoyée par l'API (édition, exclusion). */
    function upsertRemote(file: FileDto) {
        if (available) remote.set(file.publicId, file);
    }

    /**
     * Garde un fichier seulement sur ce poste : télécharge la copie si besoin, la vérifie, puis retire la copie en
     * ligne (quota libéré). Le contenu en ligne n'est supprimé qu'une fois la copie locale vérifiée.
     */
    async function keepOnlyHere(file: FileDto, raw?: Blob): Promise<FileDto> {
        if (!isHere(file.publicId)) {
            const content = raw ?? (await filesApi.getContent(file.publicId));
            await keepDownloaded(file, content);
        }
        if (!isHere(file.publicId)) throw new AppError('La copie locale n’a pas pu être vérifiée.', 0);
        const updated = await decryptFileFields(await filesApi.removeOnlineContent(file.publicId));
        remote.set(file.publicId, updated);
        void run();
        return updated;
    }

    function setEnabled(value: boolean) {
        enabled.value = value;
        prompted.value = true;
        writeFlag(ENABLED_KEY, value);
        writeFlag(PROMPTED_KEY, true);
        if (value) void run();
    }

    function dismissPrompt() {
        prompted.value = true;
        writeFlag(PROMPTED_KEY, true);
    }

    /** Choisit un nouveau dossier (sélecteur natif) et y déplace les documents de ce compte. */
    async function changeRoot(): Promise<boolean> {
        const picked = await localStore.pickRoot();
        if (!picked) return false;
        await localStore.setRoot(picked, account ?? undefined);
        root.value = await localStore.getRoot();
        if (account && root.value.available) {
            index.value = parseIndex(await localStore.readIndex(account));
            pause.value = null;
        }
        void run();
        return true;
    }

    /** Ré-essaie un fichier disparu en le retéléchargeant (s'il est en ligne). */
    async function restoreMissing(file: FileDto): Promise<void> {
        delete index.value.entries[file.publicId];
        missing.delete(file.publicId);
        await keepDownloaded(file, await filesApi.getContent(file.publicId));
    }

    return {
        available,
        deviceId,
        root,
        enabled,
        prompted,
        index,
        remote,
        missing,
        running,
        progress,
        pause,
        plan,
        lastError,
        lastRunAt,
        ready,
        localOnlyHere,
        isHere,
        statusOf,
        start,
        stop,
        run,
        addFile,
        readLocal,
        keepDownloaded,
        removeLocalCopy,
        forget,
        upsertRemote,
        keepOnlyHere,
        setEnabled,
        dismissPrompt,
        changeRoot,
        restoreMissing
    };
});
