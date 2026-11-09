import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type { StepUpProof } from '@/features/auth/types';
import type {
    VaultMigrateBatch,
    VaultMigrateWriteItem,
    VaultMigrateWriteResult,
    VaultRecoveryRequest,
    VaultStatus
} from '@/features/vault/types';

/** Routes `/api/vault` — réponses enveloppées `{ success, message, result }` comme le reste du projet. */
export const vaultApi = {
    /** État du Coffre (paramètres de dérivation, DEK emballées, périmètre, reste à migrer). */
    status() {
        return fetchWrapper.get('/api/vault') as Promise<VaultStatus>;
    },

    /** Prochain lot de valeurs à chiffrer / déchiffrer. */
    migrateBatch(take: number) {
        const params = new URLSearchParams({ take: String(take) });
        return fetchWrapper.get(`/api/vault/migrate?${params}`) as Promise<VaultMigrateBatch>;
    },

    /** Renvoie un lot traité. Tout ou rien : `409 CONFLICT` si une ligne a changé entre-temps. */
    migrateWrite(items: VaultMigrateWriteItem[]) {
        return fetchWrapper.post('/api/vault/migrate', { items }) as Promise<VaultMigrateWriteResult>;
    },

    /** Passe le Coffre en `active` quand plus rien n’est à migrer. */
    complete() {
        return fetchWrapper.post('/api/vault/complete') as Promise<VaultStatus | undefined>;
    },

    /** Enregistre ou renouvelle l’emballage par code de récupération (step-up). */
    setRecovery(body: VaultRecoveryRequest, stepUp?: StepUpProof) {
        return fetchWrapper.post('/api/vault/recovery', { ...body, ...(stepUp ? { stepUp } : {}) }) as Promise<VaultStatus | undefined>;
    },

    /** Ré-emballage de la DEK hors changement de mot de passe (step-up). */
    setPasswordWrap(dekWrappedPassword: string, stepUp?: StepUpProof) {
        return fetchWrapper.put('/api/vault/password-wrap', {
            dekWrappedPassword,
            ...(stepUp ? { stepUp } : {})
        }) as Promise<VaultStatus | undefined>;
    }
};
