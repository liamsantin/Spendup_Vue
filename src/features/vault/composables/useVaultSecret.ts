import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth/stores/auth-store';
import type { StepUpProof } from '@/features/auth/types';

/** Nature du secret qui ouvre le Coffre : mot de passe du compte, ou phrase de Coffre (compte Google seul). */
export type VaultSecretKind = 'password' | 'phrase';

/**
 * Quel secret ouvre le Coffre de l’utilisateur connecté, avec le libellé et la preuve step-up associés.
 * Un compte Google sans mot de passe a une phrase de Coffre : elle ne prouve rien au serveur (le step-up
 * passe alors par le dialogue existant : OTP ou jeton Google).
 */
export function useVaultSecret() {
    const auth = useAuthStore();
    const { t } = useI18n();

    const kind = computed<VaultSecretKind>(() => (auth.user?.hasPassword === false ? 'phrase' : 'password'));
    const label = computed(() => t(kind.value === 'phrase' ? 'vault.secret.phrase' : 'vault.secret.password'));
    const autocomplete = computed(() => (kind.value === 'phrase' ? 'off' : 'current-password'));

    /**
     * Preuve step-up à joindre : le mot de passe quand c’est lui le secret, rien pour une phrase.
     * @param secret Secret saisi.
     * @param extra Preuve complémentaire renvoyée par le dialogue step-up (OTP, jeton Google).
     */
    function proof(secret: string, extra?: StepUpProof): StepUpProof | undefined {
        const merged: StepUpProof = { ...(kind.value === 'password' ? { password: secret } : {}), ...(extra ?? {}) };
        return Object.keys(merged).length ? merged : undefined;
    }

    return { kind, label, autocomplete, proof };
}
