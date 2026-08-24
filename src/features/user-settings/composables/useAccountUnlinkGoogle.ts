import { reactive, ref, watch, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth';
import { withStepUpRetry } from '@/features/auth/step-up';
import { getErrorMessage } from '@/utils/errors/app-error';

/**
 * Modal / flux pour délier le compte Google (nécessite le mot de passe).
 * @param options Refs de feedback compte.
 * @returns État et actions (objet réactif).
 */
export function useAccountUnlinkGoogle(options: { accountSuccess: Ref<string | null>; accountError: Ref<string | null> }) {
    const auth = useAuthStore();
    const { t } = useI18n();

    const unlinkGoogleOpen = ref(false);
    const unlinkGooglePassword = ref('');
    const unlinkGoogleSaving = ref(false);
    const unlinkGoogleError = ref<string | null>(null);

    /** Ouvre le modal et réinitialise le champ mot de passe. */
    function openUnlinkGoogleModal() {
        unlinkGooglePassword.value = '';
        unlinkGoogleError.value = null;
        options.accountError.value = null;
        options.accountSuccess.value = null;
        unlinkGoogleOpen.value = true;
    }

    /** Valide et soumet le déliage Google. */
    async function submitUnlinkGoogle() {
        if (unlinkGoogleSaving.value) return;
        if (!unlinkGooglePassword.value) {
            unlinkGoogleError.value = t('accounts.unlinkGoogleModal.errors.currentRequired');
            return;
        }

        unlinkGoogleSaving.value = true;
        unlinkGoogleError.value = null;
        try {
            await withStepUpRetry((stepUp) => auth.unlinkGoogle(unlinkGooglePassword.value, stepUp));
            unlinkGoogleOpen.value = false;
            options.accountError.value = null;
            options.accountSuccess.value = t('accounts.credentials.success.googleUnlinked');
        } catch (e: unknown) {
            unlinkGoogleError.value = getErrorMessage(e);
        } finally {
            unlinkGoogleSaving.value = false;
        }
    }

    watch(unlinkGoogleOpen, (open) => {
        if (!open) {
            unlinkGoogleError.value = null;
            unlinkGooglePassword.value = '';
        }
    });

    return reactive({
        unlinkGoogleOpen,
        unlinkGooglePassword,
        unlinkGoogleSaving,
        unlinkGoogleError,
        openUnlinkGoogleModal,
        submitUnlinkGoogle
    });
}
