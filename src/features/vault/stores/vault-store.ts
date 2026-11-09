import { defineStore } from 'pinia';
import { computed, reactive, ref, shallowRef } from 'vue';
import { AppError } from '@/utils/errors/app-error';
import { useAuthStore } from '@/features/auth/stores/auth-store';
import type { StepUpProof } from '@/features/auth/types';
import { vaultApi } from '@/features/vault/api';
import { fromBase64Url, toBase64Url } from '@/features/vault/base64url';
import {
    createVaultSetup,
    decryptField,
    deriveKek,
    encryptField,
    generateSalt,
    ibanFingerprint,
    importVaultKeys,
    isCipher,
    unwrapDekWithSecret,
    VaultCryptoError,
    wrapDek,
    type VaultKeys
} from '@/features/vault/crypto';
import { clearVaultKeys, loadVaultKeys, saveVaultKeys } from '@/features/vault/key-storage';
import { runVaultMigration, type MigrationProgress } from '@/features/vault/migration';
import { formatRecoveryCode, generateRecoveryCode } from '@/features/vault/recovery-code';
import type { DecryptResult, VaultScope, VaultSetupRequest, VaultState, VaultStatus, VaultWrapRequest } from '@/features/vault/types';

/** Résultat d’une tentative d’ouverture après connexion. */
export type VaultUnlockOutcome = 'unlocked' | 'absent' | 'already' | 'failed';

/**
 * Store du Coffre : clés d’usage en mémoire (non extractibles, aussi dans IndexedDB), état serveur,
 * chiffrement / déchiffrement des champs, migration silencieuse, code de récupération.
 *
 * `locked` vrai = pas de DEK sur l’appareil : les écrans lisent et écrivent en clair, sans erreur.
 */
export const useVaultStore = defineStore('vault', () => {
    const status = ref<VaultStatus | null>(null);
    const statusLoading = ref(false);
    const keys = shallowRef<VaultKeys | null>(null);
    /** Clés préparées à l’inscription, confirmées une fois le compte créé. */
    let pendingSetupKeys: VaultKeys | null = null;
    /** Mot de passe gardé en mémoire entre `login` et la validation 2FA, puis effacé. */
    let pendingPassword: string | null = null;
    let deviceLoadFor: string | null = null;
    let deviceLoad: Promise<VaultKeys | null> | null = null;

    const migration = reactive({
        running: false,
        total: 0,
        done: 0,
        error: null as string | null
    });

    const locked = computed(() => keys.value == null);
    const exists = computed(() => status.value?.exists === true);
    const state = computed<VaultState | null>(() => status.value?.state ?? null);
    const pendingCount = computed(() => status.value?.pendingCount ?? 0);
    const hasRecovery = computed(() => status.value?.hasRecovery === true);
    const allowedScope = computed<VaultScope>(() => status.value?.allowedScope ?? 'core');
    /** Clés disponibles : les champs du socle sont chiffrés à l’envoi et déchiffrés à l’affichage. */
    const active = computed(() => keys.value != null);

    function currentUserId(): string | null {
        return useAuthStore().user?.userPublicId ?? null;
    }

    /**
     * Relit les clés de l’appareil pour l’utilisateur connecté (une seule fois par identité).
     * @returns Les clés, ou `null` si l’appareil n’en a pas.
     */
    async function ensureReady(): Promise<VaultKeys | null> {
        if (keys.value) return keys.value;
        const userId = currentUserId();
        if (!userId) return null;
        if (deviceLoad && deviceLoadFor === userId) return deviceLoad;
        deviceLoadFor = userId;
        deviceLoad = loadVaultKeys(userId)
            .then((loaded) => {
                if (loaded && !keys.value) keys.value = loaded;
                return keys.value;
            })
            .catch(() => null);
        return deviceLoad;
    }

    /** `GET /api/vault` ; `null` si la route est absente (404) ou en erreur. */
    async function loadStatus(): Promise<VaultStatus | null> {
        statusLoading.value = true;
        try {
            status.value = await vaultApi.status();
            return status.value;
        } catch {
            return null;
        } finally {
            statusLoading.value = false;
        }
    }

    /**
     * Inscription : génère DEK, sel et emballage à envoyer dans `POST /api/auth/register`.
     * Les clés restent en attente jusqu’à `commitRegistration`.
     * @param password Mot de passe saisi.
     */
    async function prepareRegistration(password: string): Promise<VaultSetupRequest | null> {
        try {
            const { setup, keys: prepared } = await createVaultSetup(password);
            pendingSetupKeys = prepared;
            return setup;
        } catch {
            pendingSetupKeys = null;
            return null;
        }
    }

    /** Inscription réussie et session ouverte : conserve les clés préparées sur l’appareil. */
    async function commitRegistration(): Promise<void> {
        const prepared = pendingSetupKeys;
        pendingSetupKeys = null;
        pendingPassword = null;
        const userId = currentUserId();
        if (!prepared || !userId) return;
        keys.value = prepared;
        deviceLoadFor = userId;
        deviceLoad = Promise.resolve(prepared);
        await saveVaultKeys(userId, prepared);
    }

    /** Abandonne les clés préparées (inscription refusée). */
    function discardRegistration(): void {
        pendingSetupKeys = null;
    }

    /** Garde le mot de passe pour ouvrir le Coffre après la validation 2FA. */
    function rememberPassword(password: string | null): void {
        pendingPassword = password;
    }

    /**
     * Après connexion : si la DEK n’est pas sur l’appareil, lit l’état serveur, dérive la KEK du mot
     * de passe et déballe la DEK. Coffre absent (`exists` faux) : l’app fonctionne en clair.
     * @param password Mot de passe tout juste saisi (ou gardé pour la 2FA).
     */
    async function unlockWithPassword(password?: string | null): Promise<VaultUnlockOutcome> {
        const secret = password ?? pendingPassword;
        pendingPassword = null;
        const userId = currentUserId();
        if (!userId || !secret) return 'failed';
        if (await ensureReady()) return 'already';
        const current = await loadStatus();
        if (!current?.exists) return 'absent';
        if (!current.dekWrappedPassword) return 'failed';
        try {
            const dekBytes = await unwrapDekWithSecret(secret, current, current.dekWrappedPassword);
            const imported = await importVaultKeys(dekBytes);
            keys.value = imported;
            deviceLoadFor = userId;
            deviceLoad = Promise.resolve(imported);
            await saveVaultKeys(userId, imported);
            return 'unlocked';
        } catch {
            return 'failed';
        }
    }

    /** Oublie les clés (mémoire et appareil) et l’état : déconnexion, inactivité, révocation. */
    function lock(): void {
        keys.value = null;
        pendingSetupKeys = null;
        pendingPassword = null;
        status.value = null;
        deviceLoadFor = null;
        deviceLoad = null;
        migration.running = false;
        migration.total = 0;
        migration.done = 0;
        migration.error = null;
        void clearVaultKeys();
    }

    /**
     * Chiffre un champ si le Coffre est ouvert, sinon renvoie la valeur telle quelle.
     * @param table Table SQL du catalogue.
     * @param column Colonne SQL.
     * @param publicId Identifiant public de l’agrégat.
     * @param plaintext Valeur en clair (`null` / vide : inchangé).
     */
    async function encrypt(table: string, column: string, publicId: string, plaintext: string | null | undefined): Promise<string | null> {
        if (plaintext == null || plaintext === '') return plaintext ?? null;
        const current = await ensureReady();
        if (!current) return plaintext;
        if (isCipher(plaintext)) return plaintext;
        return encryptField(current.dek, table, column, publicId, plaintext);
    }

    /**
     * Déchiffre un champ `enc:v1:` ; une valeur en clair est renvoyée telle quelle.
     * Ne lance jamais : `{ ok: false }` si illisible ou Coffre verrouillé.
     */
    async function decrypt(table: string, column: string, publicId: string, value: string | null | undefined): Promise<DecryptResult> {
        if (value == null) return { ok: true, value: '' };
        if (!isCipher(value)) return { ok: true, value };
        const current = await ensureReady();
        if (!current) return { ok: false, reason: 'unreadable' };
        return decryptField(current.dek, table, column, publicId, value);
    }

    /** Empreinte `h:…` d’un IBAN (Coffre ouvert), sinon `null`. */
    async function fingerprint(iban: string | null | undefined): Promise<string | null> {
        if (!iban) return null;
        const current = await ensureReady();
        if (!current) return null;
        return ibanFingerprint(current.fingerprintKey, iban);
    }

    /**
     * Migration silencieuse en arrière-plan si des éléments restent et que le Coffre est ouvert.
     * Une seule exécution à la fois ; les erreurs réseau sont gardées dans `migration.error`.
     */
    async function runMigration(): Promise<void> {
        if (migration.running) return;
        const current = await ensureReady();
        if (!current) return;
        const snapshot = status.value ?? (await loadStatus());
        if (!snapshot?.exists || snapshot.pendingCount <= 0) return;
        if (snapshot.state !== 'migrating' && snapshot.state !== 'active') return;
        migration.running = true;
        migration.error = null;
        migration.total = snapshot.pendingCount;
        migration.done = 0;
        const onProgress = (progress: MigrationProgress) => {
            migration.total = Math.max(migration.total, progress.total);
            migration.done = progress.done;
        };
        try {
            await runVaultMigration(current, snapshot.state, onProgress);
            await loadStatus();
        } catch (e: unknown) {
            migration.error = AppError.fromUnknown(e).message;
        } finally {
            migration.running = false;
        }
    }

    /** Ouverture de session terminée : clés relues et migration lancée sans bloquer l’UI. */
    function startBackgroundMigration(): void {
        void runMigration();
    }

    /**
     * Changement de mot de passe : ré-emballe la DEK avec la KEK du nouveau mot de passe et le sel actuel.
     * @param currentPassword Mot de passe actuel (déballe la DEK).
     * @param newPassword Nouveau mot de passe.
     * @returns `vaultWrap` à envoyer, ou `null` si aucun Coffre n’existe.
     * @throws VaultCryptoError `wrong_password` si le mot de passe actuel ne déballe pas la DEK.
     */
    async function rewrapForPassword(currentPassword: string, newPassword: string): Promise<VaultWrapRequest | null> {
        const current = await loadStatus();
        if (!current?.exists || !current.dekWrappedPassword || !current.salt) return null;
        const dekBytes = await unwrapDekWithSecret(currentPassword, current, current.dekWrappedPassword);
        try {
            const salt = fromBase64Url(current.salt);
            const kek = await deriveKek(newPassword, salt, current.iterations ?? undefined);
            return { dekWrappedPassword: await wrapDek(dekBytes, kek) };
        } finally {
            dekBytes.fill(0);
        }
    }

    /**
     * Génère un code de récupération, emballe la DEK avec et l’enregistre (`POST /api/vault/recovery`).
     * @param password Mot de passe actuel : déballe la DEK et sert de preuve step-up.
     * @param extraProof Preuve complémentaire (OTP) si le serveur l’exige.
     * @returns Le code formaté, à montrer une seule fois.
     */
    async function createRecoveryCode(password: string, extraProof?: StepUpProof): Promise<string> {
        const current = await loadStatus();
        if (!current?.exists || !current.dekWrappedPassword) {
            throw new VaultCryptoError('invalid_format', 'Aucun Coffre à protéger.');
        }
        const dekBytes = await unwrapDekWithSecret(password, current, current.dekWrappedPassword);
        try {
            const code = generateRecoveryCode();
            const recoverySalt = generateSalt();
            const recoveryKek = await deriveKek(code, recoverySalt);
            const dekWrappedRecovery = await wrapDek(dekBytes, recoveryKek);
            const result = await vaultApi.setRecovery(
                { recoverySalt: toBase64Url(recoverySalt), dekWrappedRecovery },
                { password, ...(extraProof ?? {}) }
            );
            if (result && typeof result === 'object' && 'exists' in result) status.value = result;
            else await loadStatus();
            return formatRecoveryCode(code);
        } finally {
            dekBytes.fill(0);
        }
    }

    return {
        status,
        statusLoading,
        migration,
        locked,
        active,
        exists,
        state,
        pendingCount,
        hasRecovery,
        allowedScope,
        ensureReady,
        loadStatus,
        prepareRegistration,
        commitRegistration,
        discardRegistration,
        rememberPassword,
        unlockWithPassword,
        lock,
        encrypt,
        decrypt,
        fingerprint,
        runMigration,
        startBackgroundMigration,
        rewrapForPassword,
        createRecoveryCode
    };
});
