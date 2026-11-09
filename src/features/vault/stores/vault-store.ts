import { defineStore } from 'pinia';
import { computed, reactive, ref, shallowRef } from 'vue';
import { AppError } from '@/utils/errors/app-error';
import { useAuthStore } from '@/features/auth/stores/auth-store';
import type { StepUpProof } from '@/features/auth/types';
import { vaultApi } from '@/features/vault/api';
import { fromBase64Url, toBase64Url } from '@/features/vault/base64url';
import { canEncryptField, vaultFieldScope } from '@/features/vault/catalog';
import {
    createVaultSetup,
    decryptField,
    deriveKek,
    encryptField,
    generateSalt,
    ibanFingerprint,
    importVaultKeys,
    isCipher,
    rewrapDek,
    unwrapDekWithRecoveryCode,
    unwrapDekWithSecret,
    VaultCryptoError,
    wrapDek,
    type VaultKeys
} from '@/features/vault/crypto';
import { decryptPdfBlob, encryptPdfFile } from '@/features/vault/file-content';
import { clearVaultKeys, loadVaultKeys, saveVaultKeys } from '@/features/vault/key-storage';
import { runVaultMigration, type MigrationProgress } from '@/features/vault/migration';
import { formatRecoveryCode, generateRecoveryCode } from '@/features/vault/recovery-code';
import type { DecryptResult, VaultScope, VaultSetupRequest, VaultState, VaultStatus, VaultWrapRequest } from '@/features/vault/types';

/**
 * Résultat d’une tentative d’ouverture après connexion. `lost` : plus d’emballage par mot de passe côté
 * serveur (réinitialisation sans code) ; le bandeau « Coffre verrouillé » prend le relais.
 */
export type VaultUnlockOutcome = 'unlocked' | 'absent' | 'already' | 'failed' | 'lost';

/** Étapes de la désactivation, pour l’affichage. */
export type VaultDisableStep = 'idle' | 'disabling' | 'decrypting' | 'deleting' | 'done';

/**
 * Store du Coffre : clés d’usage en mémoire (non extractibles, aussi dans IndexedDB), état serveur,
 * chiffrement / déchiffrement des champs selon le catalogue et le périmètre autorisé, migration
 * silencieuse, code de récupération, phrase de Coffre (Google), secours, remise à zéro, désactivation.
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
    let statusLoad: Promise<VaultStatus | null> | null = null;

    const migration = reactive({
        running: false,
        total: 0,
        done: 0,
        error: null as string | null
    });

    const disabling = reactive({
        step: 'idle' as VaultDisableStep,
        total: 0,
        done: 0
    });

    /** Connexion Google sans clés sur l’appareil : l’hôte `/app` propose la saisie de la phrase. */
    const phraseUnlockRequested = ref(false);

    const locked = computed(() => keys.value == null);
    const exists = computed(() => status.value?.exists === true);
    const state = computed<VaultState | null>(() => status.value?.state ?? null);
    const pendingCount = computed(() => status.value?.pendingCount ?? 0);
    const hasRecovery = computed(() => status.value?.hasRecovery === true);
    const allowedScope = computed<VaultScope>(() => status.value?.allowedScope ?? 'core');
    const extendedScope = computed(() => allowedScope.value === 'extended');
    /** Clés disponibles : les champs du catalogue sont chiffrés à l’envoi et déchiffrés à l’affichage. */
    const active = computed(() => keys.value != null);
    /** Plus aucun emballage par mot de passe : secours par code possible si `hasRecovery`, sinon remise à zéro. */
    const passwordWrapLost = computed(() => exists.value && status.value?.dekWrappedPassword == null);
    /** Aucune DEK emballée ne subsiste côté serveur : les champs chiffrés sont irrécupérables. */
    const lost = computed(() => status.value?.locked === true);

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
            const result = await vaultApi.status();
            // Une réponse vide (route absente, enveloppe inattendue) ne doit pas effacer un état connu.
            if (result && typeof result === 'object' && 'exists' in result) status.value = result;
            return status.value;
        } catch {
            return null;
        } finally {
            statusLoading.value = false;
        }
    }

    /** État serveur connu, chargé une seule fois à la demande (périmètre pour les écritures). */
    async function ensureStatus(): Promise<VaultStatus | null> {
        if (status.value) return status.value;
        if (!currentUserId()) return null;
        if (!statusLoad) {
            statusLoad = loadStatus().finally(() => {
                statusLoad = null;
            });
        }
        return statusLoad;
    }

    /**
     * Entrée dans `/app` : clés de l’appareil puis état serveur, pour les bandeaux (secours, phrase Google,
     * proposition de Coffre) et le périmètre des écritures.
     */
    async function bootstrap(): Promise<VaultStatus | null> {
        await ensureReady();
        return ensureStatus();
    }

    function adoptKeys(userId: string, imported: VaultKeys): Promise<void> {
        keys.value = imported;
        deviceLoadFor = userId;
        deviceLoad = Promise.resolve(imported);
        return saveVaultKeys(userId, imported);
    }

    function applyStatusResult(result: VaultStatus | undefined): Promise<VaultStatus | null> {
        if (result && typeof result === 'object' && 'exists' in result) {
            status.value = result;
            return Promise.resolve(result);
        }
        return loadStatus();
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
        await adoptKeys(userId, prepared);
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
     * de passe (ou de la phrase de Coffre) et déballe la DEK. Coffre absent (`exists` faux) : l’app
     * fonctionne en clair.
     * @param password Mot de passe tout juste saisi (ou gardé pour la 2FA), ou phrase de Coffre.
     */
    async function unlockWithPassword(password?: string | null): Promise<VaultUnlockOutcome> {
        const secret = password ?? pendingPassword;
        pendingPassword = null;
        const userId = currentUserId();
        if (!userId || !secret) return 'failed';
        if (await ensureReady()) return 'already';
        const current = await loadStatus();
        if (!current?.exists) return 'absent';
        if (!current.dekWrappedPassword) return 'lost';
        try {
            const dekBytes = await unwrapDekWithSecret(secret, current, current.dekWrappedPassword);
            await adoptKeys(userId, await importVaultKeys(dekBytes));
            return 'unlocked';
        } catch {
            return 'failed';
        }
    }

    /** Connexion Google : demander la phrase de Coffre si un Coffre existe et que l’appareil n’a pas la clé. */
    function requestPhraseUnlock(): void {
        phraseUnlockRequested.value = true;
    }

    /** Phrase saisie (ou ignorée) : la demande est consommée. */
    function clearPhraseUnlockRequest(): void {
        phraseUnlockRequested.value = false;
    }

    /** Oublie les clés (mémoire et appareil) et l’état : déconnexion, inactivité, révocation. */
    function lock(): void {
        keys.value = null;
        pendingSetupKeys = null;
        pendingPassword = null;
        status.value = null;
        deviceLoadFor = null;
        deviceLoad = null;
        statusLoad = null;
        phraseUnlockRequested.value = false;
        migration.running = false;
        migration.total = 0;
        migration.done = 0;
        migration.error = null;
        disabling.step = 'idle';
        disabling.total = 0;
        disabling.done = 0;
        void clearVaultKeys();
    }

    /**
     * Vrai si `table.colonne` doit partir chiffré : Coffre ouvert, champ du catalogue, périmètre autorisé.
     * Le socle ne dépend que des clés (elles n’existent que si un Coffre existe) : un état serveur
     * indisponible ne fait jamais repasser un IBAN en clair. Le périmètre étendu exige l’état serveur.
     * @param table Table SQL du catalogue.
     * @param column Colonne SQL.
     */
    async function canEncrypt(table: string, column: string): Promise<boolean> {
        const scope = vaultFieldScope(table, column);
        if (scope == null) return false;
        return canEncryptScope(scope);
    }

    /**
     * Vrai si les champs d’un périmètre partent chiffrés (évite un double appel POST + PUT inutile).
     * @param scope Périmètre des champs concernés.
     */
    async function canEncryptScope(scope: VaultScope): Promise<boolean> {
        if (!(await ensureReady())) return false;
        const current = await ensureStatus();
        if (current?.state === 'disabling') return false;
        if (scope === 'core') return true;
        return current?.exists === true && canEncryptField(current.allowedScope ?? 'core', 'asset', 'notes');
    }

    /**
     * Chiffre un champ si le Coffre est ouvert et que le périmètre l’autorise, sinon renvoie la valeur telle quelle.
     * @param table Table SQL du catalogue.
     * @param column Colonne SQL.
     * @param publicId Identifiant public de l’agrégat.
     * @param plaintext Valeur en clair (`null` / vide : inchangé).
     */
    async function encrypt(table: string, column: string, publicId: string, plaintext: string | null | undefined): Promise<string | null> {
        if (plaintext == null || plaintext === '') return plaintext ?? null;
        if (isCipher(plaintext)) return plaintext;
        if (!(await canEncrypt(table, column))) return plaintext;
        const current = keys.value;
        if (!current) return plaintext;
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
     * Chiffre un PDF avant `POST /api/files` si le périmètre étendu est ouvert, sinon `null` (envoi en clair).
     * @param file PDF choisi par l’utilisateur.
     */
    async function encryptPdf(file: File): Promise<File | null> {
        if (!(await canEncrypt('file', 'name_original'))) return null;
        const current = keys.value;
        if (!current) return null;
        return encryptPdfFile(current.dek, file);
    }

    /**
     * Déchiffre un contenu téléchargé si nécessaire ; un PDF en clair est renvoyé tel quel.
     * @returns Le PDF lisible, ou `null` si chiffré et indéchiffrable sur cet appareil.
     */
    async function decryptPdf(blob: Blob): Promise<Blob | null> {
        const current = await ensureReady();
        return decryptPdfBlob(current?.dek ?? null, blob);
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
     * @param currentSecret Mot de passe actuel, ou phrase de Coffre d’un compte Google (déballe la DEK).
     * @param newPassword Nouveau mot de passe.
     * @returns `vaultWrap` à envoyer, ou `null` si aucun Coffre n’existe.
     * @throws VaultCryptoError `wrong_password` si le secret actuel ne déballe pas la DEK.
     */
    async function rewrapForPassword(currentSecret: string, newPassword: string): Promise<VaultWrapRequest | null> {
        const current = await loadStatus();
        if (!current?.exists || !current.dekWrappedPassword || !current.salt) return null;
        const dekBytes = await unwrapDekWithSecret(currentSecret, current, current.dekWrappedPassword);
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
     * @param secret Mot de passe actuel (ou phrase de Coffre) : déballe la DEK et sert de preuve step-up.
     * @param extraProof Preuve complémentaire (OTP) si le serveur l’exige.
     * @returns Le code formaté, à montrer une seule fois.
     */
    async function createRecoveryCode(secret: string, extraProof?: StepUpProof): Promise<string> {
        const current = await loadStatus();
        if (!current?.exists || !current.dekWrappedPassword) {
            throw new VaultCryptoError('invalid_format', 'Aucun Coffre à protéger.');
        }
        const dekBytes = await unwrapDekWithSecret(secret, current, current.dekWrappedPassword);
        try {
            const code = generateRecoveryCode();
            const recoverySalt = generateSalt();
            const recoveryKek = await deriveKek(code, recoverySalt);
            const dekWrappedRecovery = await wrapDek(dekBytes, recoveryKek);
            const proof: StepUpProof =
                useAuthStore().user?.hasPassword === false ? { ...(extraProof ?? {}) } : { password: secret, ...(extraProof ?? {}) };
            const result = await vaultApi.setRecovery({ recoverySalt: toBase64Url(recoverySalt), dekWrappedRecovery }, proof);
            await applyStatusResult(result);
            return formatRecoveryCode(code);
        } finally {
            dekBytes.fill(0);
        }
    }

    /**
     * Crée le Coffre d’un compte existant (`POST /api/vault`, step-up) : compte Google avec une phrase de
     * Coffre, ou compte à mot de passe sans Coffre (inscrit avec un client ancien).
     * @param secret Phrase de Coffre ou mot de passe : dérive la KEK et emballe une DEK neuve.
     * @param stepUp Preuve step-up (mot de passe, OTP ou jeton Google) si le serveur l’exige.
     */
    async function createWithSecret(secret: string, stepUp?: StepUpProof): Promise<void> {
        const userId = currentUserId();
        if (!userId) throw new VaultCryptoError('crypto_unavailable', 'Aucune session.');
        const { setup, keys: prepared } = await createVaultSetup(secret);
        const result = await vaultApi.create(setup, stepUp);
        await adoptKeys(userId, prepared);
        await applyStatusResult(result);
        startBackgroundMigration();
    }

    /**
     * Secours après une réinitialisation sans code : le code de récupération déballe la DEK, ré-emballée
     * par le mot de passe courant (même sel) et enregistrée par `PUT /api/vault/password-wrap` (step-up).
     * @param code Code de récupération.
     * @param secret Mot de passe actuel (ou phrase de Coffre à définir pour un compte Google).
     * @param stepUp Preuve step-up si le serveur l’exige.
     * @throws VaultCryptoError `wrong_password` si le code est faux.
     */
    async function restoreWithRecoveryCode(code: string, secret: string, stepUp?: StepUpProof): Promise<void> {
        const userId = currentUserId();
        const current = await loadStatus();
        if (!userId || !current?.exists) throw new VaultCryptoError('invalid_format', 'Aucun Coffre à restaurer.');
        const dekBytes = await unwrapDekWithRecoveryCode(code, current);
        try {
            const dekWrappedPassword = await rewrapDek(dekBytes, secret, current);
            const result = await vaultApi.setPasswordWrap({ dekWrappedPassword }, stepUp);
            await adoptKeys(userId, await importVaultKeys(dekBytes));
            await applyStatusResult(result);
            startBackgroundMigration();
        } finally {
            dekBytes.fill(0);
        }
    }

    /**
     * Remise à zéro (`POST /api/vault/reset`, step-up) : mot de passe et code perdus, les valeurs chiffrées
     * sont effacées définitivement et un Coffre neuf est créé avec le secret donné.
     * @param secret Mot de passe actuel ou phrase de Coffre.
     * @param stepUp Preuve step-up si le serveur l’exige.
     */
    async function resetVault(secret: string, stepUp?: StepUpProof): Promise<void> {
        const userId = currentUserId();
        if (!userId) throw new VaultCryptoError('crypto_unavailable', 'Aucune session.');
        const { setup, keys: prepared } = await createVaultSetup(secret);
        const result = await vaultApi.reset(setup, stepUp);
        await clearVaultKeys();
        await adoptKeys(userId, prepared);
        await applyStatusResult(result);
        startBackgroundMigration();
    }

    /**
     * Désactivation : `POST /api/vault/disable` (step-up), lots `decrypt` jusqu’à `pendingCount = 0`,
     * puis `DELETE /api/vault` (step-up). Le Coffre doit être ouvert sur l’appareil pour déchiffrer.
     * @param stepUp Preuve step-up (réutilisée pour les deux appels).
     * @throws AppError du serveur (par exemple des valeurs encore chiffrées au moment du DELETE).
     */
    async function disableVault(stepUp?: StepUpProof): Promise<void> {
        const current = await ensureReady();
        if (!current) throw new VaultCryptoError('crypto_unavailable', 'Le Coffre doit être ouvert sur cet appareil.');
        const snapshot = await loadStatus();
        if (!snapshot?.exists) throw new VaultCryptoError('invalid_format', 'Aucun Coffre à désactiver.');
        disabling.step = 'disabling';
        disabling.total = 0;
        disabling.done = 0;
        try {
            if (snapshot.state !== 'disabling') {
                await applyStatusResult(await vaultApi.disable(stepUp));
            }
            disabling.step = 'decrypting';
            const outcome = await runVaultMigration(current, 'disabling', (progress) => {
                disabling.total = Math.max(disabling.total, progress.total);
                disabling.done = progress.done;
            });
            const after = await loadStatus();
            if (after && after.pendingCount > 0) {
                throw new AppError(
                    outcome.skipped > 0
                        ? `${after.pendingCount} valeur(s) chiffrée(s) restent illisibles sur cet appareil et ne peuvent pas être déchiffrées.`
                        : `${after.pendingCount} valeur(s) restent à déchiffrer.`,
                    409,
                    'VAULT_PENDING'
                );
            }
            disabling.step = 'deleting';
            await vaultApi.remove(stepUp);
            disabling.step = 'done';
            keys.value = null;
            deviceLoad = null;
            deviceLoadFor = null;
            await clearVaultKeys();
            await loadStatus();
        } catch (e: unknown) {
            disabling.step = 'idle';
            throw e;
        }
    }

    return {
        status,
        statusLoading,
        migration,
        disabling,
        phraseUnlockRequested,
        locked,
        active,
        exists,
        state,
        pendingCount,
        hasRecovery,
        allowedScope,
        extendedScope,
        passwordWrapLost,
        lost,
        ensureReady,
        ensureStatus,
        bootstrap,
        loadStatus,
        prepareRegistration,
        commitRegistration,
        discardRegistration,
        rememberPassword,
        unlockWithPassword,
        requestPhraseUnlock,
        clearPhraseUnlockRequest,
        lock,
        canEncrypt,
        canEncryptScope,
        encrypt,
        decrypt,
        fingerprint,
        encryptPdf,
        decryptPdf,
        runMigration,
        startBackgroundMigration,
        rewrapForPassword,
        createRecoveryCode,
        createWithSecret,
        restoreWithRecoveryCode,
        resetVault,
        disableVault
    };
});
