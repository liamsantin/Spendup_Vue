import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type { StepUpProof } from '@/features/auth/types';
import type {
    VaultMigrateBatch,
    VaultMigrateWriteItem,
    VaultMigrateWriteResult,
    VaultPasswordWrapRequest,
    VaultRecoveryRequest,
    VaultSetupRequest,
    VaultStatus
} from '@/features/vault/types';

/**
 * Les versions de ligne (`version`, `currentVersion`) sont des entiers 64 bits (ticks `updated_at`) :
 * au-delà de 2^53, `JSON.parse` les arrondit et le serveur répond 409 à chaque lot. Elles sont donc
 * gardées en chaînes décimales à la lecture, et réinjectées comme nombres bruts à l’écriture.
 */
const VERSION_KEYS = /"(version|currentVersion)"\s*:\s*(-?\d+)/g;

/** `JSON.parse` qui garde `version` / `currentVersion` en chaînes. */
export function parseVaultJson(text: string): unknown {
    return JSON.parse(text.replace(VERSION_KEYS, '"$1":"$2"'));
}

/** Sérialise un lot en remettant `version` en entier brut (jamais arrondi par JS). */
export function serializeMigrateWrite(items: VaultMigrateWriteItem[]): string {
    return JSON.stringify({ items }).replace(/"version":"(-?\d+)"/g, '"version":$1');
}

/** Routes `/api/vault` — réponses enveloppées `{ success, message, result }` comme le reste du projet. */
export const vaultApi = {
    /** État du Coffre (paramètres de dérivation, DEK emballées, périmètre, reste à migrer). */
    status() {
        return fetchWrapper.get('/api/vault') as Promise<VaultStatus>;
    },

    /** Prochain lot de valeurs à chiffrer / déchiffrer. */
    migrateBatch(take: number) {
        const params = new URLSearchParams({ take: String(take) });
        return fetchWrapper.getWithParser(`/api/vault/migrate?${params}`, parseVaultJson) as Promise<VaultMigrateBatch>;
    },

    /** Renvoie un lot traité. Tout ou rien : `409 CONFLICT` si une ligne a changé entre-temps. */
    migrateWrite(items: VaultMigrateWriteItem[]) {
        return fetchWrapper.postJsonText(
            '/api/vault/migrate',
            serializeMigrateWrite(items),
            parseVaultJson
        ) as Promise<VaultMigrateWriteResult>;
    },

    /** Passe le Coffre en `active` quand plus rien n’est à migrer. */
    complete() {
        return fetchWrapper.post('/api/vault/complete') as Promise<VaultStatus | undefined>;
    },

    /** Enregistre ou renouvelle l’emballage par code de récupération (step-up). */
    setRecovery(body: VaultRecoveryRequest, stepUp?: StepUpProof) {
        return fetchWrapper.post('/api/vault/recovery', { ...body, ...(stepUp ? { stepUp } : {}) }) as Promise<VaultStatus | undefined>;
    },

    /** Ré-emballage de la DEK hors changement de mot de passe (step-up) : secours par code, phrase. */
    setPasswordWrap(body: VaultPasswordWrapRequest, stepUp?: StepUpProof) {
        return fetchWrapper.put('/api/vault/password-wrap', { ...body, ...(stepUp ? { stepUp } : {}) }) as Promise<VaultStatus | undefined>;
    },

    /** Crée le Coffre d’un compte existant (Google avec phrase, ancien compte) — step-up. */
    create(vault: VaultSetupRequest, stepUp?: StepUpProof) {
        return fetchWrapper.post('/api/vault', { vault, ...(stepUp ? { stepUp } : {}) }) as Promise<VaultStatus | undefined>;
    },

    /** Passe le Coffre en `disabling` (step-up) : les lots `decrypt` suivent, puis `remove`. */
    disable(stepUp?: StepUpProof) {
        return fetchWrapper.post('/api/vault/disable', stepUp ? { stepUp } : {}) as Promise<VaultStatus | undefined>;
    },

    /** Supprime le Coffre (step-up) ; refusé tant qu’une valeur `enc:v1:` subsiste. */
    remove(stepUp?: StepUpProof) {
        return fetchWrapper.delete('/api/vault', stepUp ? { stepUp } : {}) as Promise<void>;
    },

    /** Remise à zéro (step-up) : efface les valeurs chiffrées irrécupérables et crée un Coffre neuf. */
    reset(vault: VaultSetupRequest, stepUp?: StepUpProof) {
        return fetchWrapper.post('/api/vault/reset', { vault, ...(stepUp ? { stepUp } : {}) }) as Promise<VaultStatus | undefined>;
    }
};
