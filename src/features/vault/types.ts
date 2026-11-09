/** État d’un Coffre côté serveur (`user_vault.state`). */
export type VaultState = 'migrating' | 'active' | 'disabling';

/** Périmètre autorisé par l’offre : socle pour tous, étendu pour `plus`. */
export type VaultScope = 'core' | 'extended';

/** Fonction de dérivation annoncée au serveur. V1 : PBKDF2-SHA-256 uniquement. */
export type VaultKdf = 'pbkdf2' | 'argon2id';

/** Paramètres d’un nouveau Coffre — `POST /api/auth/register` (`vault`), `POST /api/vault`. */
export type VaultSetupRequest = {
    kdf: VaultKdf;
    iterations: number;
    memoryKiB: number | null;
    parallelism: number | null;
    /** Sel de la dérivation du mot de passe (base64url sans `=`). */
    salt: string;
    /** DEK emballée par la clé dérivée du mot de passe (base64url sans `=`). */
    dekWrappedPassword: string;
};

/** Nouvel emballage de la DEK par le nouveau mot de passe — `vaultWrap` du changement de mot de passe. */
export type VaultWrapRequest = {
    dekWrappedPassword: string;
};

/** État du Coffre — `GET /api/vault`. `exists` faux : compte sans Coffre (Google sans phrase, client ancien). */
export type VaultStatus = {
    exists: boolean;
    state: VaultState | null;
    version: number | null;
    kdf: VaultKdf | null;
    iterations: number | null;
    memoryKiB: number | null;
    parallelism: number | null;
    salt: string | null;
    dekWrappedPassword: string | null;
    recoverySalt: string | null;
    dekWrappedRecovery: string | null;
    hasRecovery: boolean;
    recoveryCreatedAt: string | null;
    /** Aucune DEK emballée ne subsiste : les champs chiffrés sont irrécupérables. */
    locked: boolean;
    plan: string;
    allowedScope: VaultScope;
    pendingCount: number;
    activatedAt: string | null;
};

/** Une valeur à traiter par le navigateur — `GET /api/vault/migrate`. */
export type VaultMigrateItem = {
    table: string;
    publicId: string;
    field: string;
    scope: VaultScope;
    action: 'encrypt' | 'decrypt';
    value: string;
    /**
     * Version de ligne, opaque, à renvoyer telle quelle. Le serveur l’envoie comme un entier 64 bits
     * (ticks) : au-delà de 2^53, `JSON.parse` la fausserait, elle est donc gardée en chaîne décimale.
     */
    version: string;
};

export type VaultMigrateBatch = {
    items: VaultMigrateItem[];
    remaining: number;
};

/** Valeur renvoyée au serveur — `POST /api/vault/migrate`. */
export type VaultMigrateWriteItem = {
    table: string;
    publicId: string;
    field: string;
    value: string | null;
    /** Version lue, renvoyée telle quelle (chaîne décimale, envoyée au serveur comme un entier). */
    version: string;
    /** Empreinte `h:…`, obligatoire pour `account.iban` chiffré. */
    fingerprint?: string | null;
};

export type VaultMigrateWriteResult = {
    applied: number;
    remaining: number;
    state: VaultState;
};

/** Détails d’un 409 de migration. */
export type VaultMigrateConflict = {
    index: number;
    table: string;
    publicId: string;
    currentVersion: string;
};

/** Emballage par le code de récupération — `POST /api/vault/recovery`. */
export type VaultRecoveryRequest = {
    recoverySalt: string;
    dekWrappedRecovery: string;
};

/** Ré-emballage hors changement de mot de passe — `PUT /api/vault/password-wrap` (step-up). */
export type VaultPasswordWrapRequest = {
    dekWrappedPassword: string;
    /** Nouveau sel et paramètres si la dérivation change (sinon omis : ceux du Coffre restent). */
    salt?: string | null;
    kdf?: VaultKdf | null;
    iterations?: number | null;
    memoryKiB?: number | null;
    parallelism?: number | null;
};

/**
 * Paramètres du Coffre lisibles avec un jeton de réinitialisation valide —
 * `GET /api/auth/reset-password/vault?token=`. `exists` faux : aucun Coffre à ré-emballer.
 */
export type VaultResetParams = {
    exists: boolean;
    hasRecovery: boolean;
    kdf: VaultKdf | null;
    iterations: number | null;
    memoryKiB: number | null;
    parallelism: number | null;
    salt: string | null;
    recoverySalt: string | null;
    dekWrappedRecovery: string | null;
};

/** Résultat d’un déchiffrement : jamais d’exception vers l’UI. */
export type DecryptResult = { ok: true; value: string } | { ok: false; reason: 'unreadable' };

/** Tables et colonnes du socle chiffrées par ce module (le catalogue complet est côté API). */
export const VAULT_PREFIX = 'enc:v1:';
export const VAULT_FINGERPRINT_PREFIX = 'h:';
export const VAULT_KDF_ITERATIONS = 600_000;
