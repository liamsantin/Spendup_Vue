export { vaultApi } from '@/features/vault/api';
export { toBase64Url, fromBase64Url, isBase64Url } from '@/features/vault/base64url';
export {
    VaultCryptoError,
    createVaultSetup,
    decryptField,
    deriveKek,
    encryptField,
    fieldAad,
    generateDekBytes,
    generateSalt,
    ibanFingerprint,
    importVaultKeys,
    isCipher,
    normalizeIbanForFingerprint,
    unwrapDek,
    unwrapDekWithSecret,
    wrapDek
} from '@/features/vault/crypto';
export type { VaultKeys, VaultCryptoErrorCode, VaultKdfParams } from '@/features/vault/crypto';
export { clearVaultKeys, loadVaultKeys, saveVaultKeys } from '@/features/vault/key-storage';
export { runVaultMigration, VAULT_MIGRATE_TAKE } from '@/features/vault/migration';
export type { MigrationOutcome, MigrationProgress } from '@/features/vault/migration';
export {
    RECOVERY_ALPHABET,
    RECOVERY_CODE_LENGTH,
    RECOVERY_GROUPS,
    RECOVERY_GROUP_SIZE,
    formatRecoveryCode,
    generateRecoveryCode,
    isValidRecoveryCode,
    normalizeRecoveryCode
} from '@/features/vault/recovery-code';
export { useVaultStore } from '@/features/vault/stores/vault-store';
export type { VaultUnlockOutcome } from '@/features/vault/stores/vault-store';
export { resolveSensitiveFieldDisplay, type SensitiveFieldDisplay } from '@/features/vault/display';
export * from '@/features/vault/types';
