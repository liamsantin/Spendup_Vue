export { vaultApi } from '@/features/vault/api';
export {
    VAULT_CATALOG,
    VAULT_FILE_CONTENT_AAD,
    VAULT_TABLES,
    canEncryptField,
    fileContentAad,
    isVaultField,
    scopeAllows,
    vaultAad,
    vaultField,
    vaultFieldScope
} from '@/features/vault/catalog';
export type { VaultFieldSpec, VaultTableName } from '@/features/vault/catalog';
export { decryptFileBytes, decryptPdfBlob, encryptFileBytes, encryptPdfFile, looksLikePdf } from '@/features/vault/file-content';
export { generatePublicId, isConflictError, isValidPublicId, withFreshPublicId } from '@/features/vault/public-id';
export { useVaultSecret } from '@/features/vault/composables/useVaultSecret';
export type { VaultSecretKind } from '@/features/vault/composables/useVaultSecret';
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
    rewrapDek,
    rewrapWithRecoveryCode,
    unwrapDek,
    unwrapDekWithRecoveryCode,
    unwrapDekWithSecret,
    wrapDek
} from '@/features/vault/crypto';
export type { VaultKeys, VaultCryptoErrorCode, VaultKdfParams, VaultRecoveryParams } from '@/features/vault/crypto';
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
export type { VaultUnlockOutcome, VaultDisableStep } from '@/features/vault/stores/vault-store';
export { resolveSensitiveFieldDisplay, sensitiveExportValue, type SensitiveFieldDisplay } from '@/features/vault/display';
export * from '@/features/vault/types';
