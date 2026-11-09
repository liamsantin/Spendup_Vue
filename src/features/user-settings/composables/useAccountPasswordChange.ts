import { computed, reactive, ref, watch, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth';
import { withStepUpRetry } from '@/features/auth/step-up';
import { getErrorMessage } from '@/utils/errors/app-error';
import { VaultCryptoError } from '@/features/vault/crypto';
import { isValidAccountPassword } from '@/features/user-settings/account-profile';
import { useVaultStore } from '@/features/vault/stores/vault-store';

/**
 * Modal / flux de changement (ou définition) de mot de passe.
 * @param options Refs de feedback compte.
 * @returns État et actions (objet réactif).
 */
export function useAccountPasswordChange(options: { accountSuccess: Ref<string | null>; accountError: Ref<string | null> }) {
    const auth = useAuthStore();
    const vault = useVaultStore();
    const { t } = useI18n();

    const passwordSaving = ref(false);
    const passwordError = ref<string | null>(null);
    const passwordOpen = ref(false);
    const currentPassword = ref('');
    const newPassword = ref('');
    const confirmPassword = ref('');
    const vaultPhrase = ref('');

    const requiresCurrentPassword = computed(() => auth.user?.hasPassword === true);
    /** Compte Google avec une phrase de Coffre qui pose son premier mot de passe : la phrase ré-emballe la clé. */
    const requiresVaultPhrase = computed(() => !requiresCurrentPassword.value && vault.exists && !vault.passwordWrapLost);

    /** Ouvre le modal et réinitialise les champs. */
    function openPasswordModal() {
        currentPassword.value = '';
        newPassword.value = '';
        confirmPassword.value = '';
        vaultPhrase.value = '';
        passwordError.value = null;
        options.accountSuccess.value = null;
        options.accountError.value = null;
        passwordOpen.value = true;
        if (!requiresCurrentPassword.value) void vault.ensureStatus();
    }

    /** Valide et soumet le changement de mot de passe (force re-login côté auth). */
    async function submitPasswordChange() {
        if (passwordSaving.value) return;
        passwordError.value = null;

        if (requiresCurrentPassword.value && !currentPassword.value) {
            passwordError.value = t('accounts.passwordModal.errors.currentRequired');
            return;
        }
        if (requiresVaultPhrase.value && !vaultPhrase.value) {
            passwordError.value = t('accounts.passwordModal.errors.vaultPhraseRequired');
            return;
        }
        if (!isValidAccountPassword(newPassword.value)) {
            passwordError.value = t('accounts.passwordModal.errors.invalidNew');
            return;
        }
        if (newPassword.value !== confirmPassword.value) {
            passwordError.value = t('accounts.passwordModal.errors.mismatch');
            return;
        }

        passwordSaving.value = true;
        try {
            await withStepUpRetry((stepUp) =>
                auth.changePassword(
                    requiresCurrentPassword.value ? currentPassword.value : null,
                    newPassword.value,
                    undefined,
                    stepUp,
                    requiresVaultPhrase.value ? vaultPhrase.value : null
                )
            );
        } catch (e: unknown) {
            // Le Coffre ne s’ouvre pas avec le secret actuel : rien n’a été envoyé au serveur.
            passwordError.value =
                e instanceof VaultCryptoError && e.code === 'wrong_password'
                    ? t(
                          requiresVaultPhrase.value
                              ? 'accounts.passwordModal.errors.vaultPhraseIncorrect'
                              : 'accounts.passwordModal.errors.currentIncorrect'
                      )
                    : getErrorMessage(e);
            passwordSaving.value = false;
        }
    }

    watch(passwordOpen, (open) => {
        if (!open) passwordError.value = null;
    });

    return reactive({
        passwordSaving,
        passwordError,
        passwordOpen,
        currentPassword,
        newPassword,
        confirmPassword,
        vaultPhrase,
        requiresCurrentPassword,
        requiresVaultPhrase,
        openPasswordModal,
        submitPasswordChange
    });
}
