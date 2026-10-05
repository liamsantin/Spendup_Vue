import { computed, reactive, ref, watch, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth';
import { withStepUpRetry } from '@/features/auth/step-up';
import { getErrorMessage } from '@/utils/errors/app-error';

/**
 * Modal / flux de changement d’e-mail (mdp ou Google + step-up).
 * @param options Refs de feedback compte.
 * @returns État et actions (objet réactif).
 */
export function useAccountEmailChange(options: { accountSuccess: Ref<string | null>; accountError: Ref<string | null> }) {
    const auth = useAuthStore();
    const router = useRouter();
    const { t } = useI18n();

    const emailSaving = ref(false);
    const emailError = ref<string | null>(null);
    const emailDraft = ref('');
    const emailCurrentPassword = ref('');
    const emailOpen = ref(false);
    const emailGoogleIdToken = ref<string | null>(null);

    const currentEmail = computed(() => auth.user?.email ?? null);
    const pendingEmail = computed(() => auth.user?.pendingEmail ?? null);
    const isGoogleOnlyAccount = computed(() => auth.user?.hasPassword === false);
    const showEmailPassword = computed(() => !isGoogleOnlyAccount.value);
    const showEmailGoogle = computed(() => isGoogleOnlyAccount.value || auth.user?.hasGoogle !== false);
    const canSubmitEmailChange = computed(() => {
        if (showEmailPassword.value && emailCurrentPassword.value) return true;
        if (showEmailGoogle.value && emailGoogleIdToken.value) return true;
        return false;
    });

    /** Ouvre le modal et réinitialise les champs. */
    function openEmailModal() {
        emailDraft.value = '';
        emailCurrentPassword.value = '';
        emailGoogleIdToken.value = null;
        emailError.value = null;
        options.accountSuccess.value = null;
        options.accountError.value = null;
        emailOpen.value = true;
    }

    /** Soumet le changement d’e-mail puis redirige vers la confirmation. */
    async function submitEmailChange() {
        if (emailSaving.value) return;
        emailError.value = null;

        const email = emailDraft.value.trim();
        if (!email || !/.+@.+\..+/.test(email)) {
            emailError.value = t('accounts.emailModal.errors.invalidEmail');
            return;
        }
        if (!canSubmitEmailChange.value) {
            emailError.value = isGoogleOnlyAccount.value
                ? t('accounts.emailModal.errors.confirmGoogle')
                : t('accounts.emailModal.errors.currentPasswordRequired');
            return;
        }

        emailSaving.value = true;
        try {
            await withStepUpRetry((stepUp) =>
                auth.changeEmail({
                    newEmail: email,
                    currentPassword: showEmailPassword.value ? emailCurrentPassword.value : null,
                    googleIdToken: emailGoogleIdToken.value,
                    stepUp
                })
            );
            emailOpen.value = false;
            options.accountSuccess.value = null;
            options.accountError.value = null;
            await router.push({
                path: '/auth/confirm-email-change',
                query: { email, from: 'app' }
            });
        } catch (e: unknown) {
            emailError.value = getErrorMessage(e);
            emailGoogleIdToken.value = null;
        } finally {
            emailSaving.value = false;
        }
    }

    /**
     * Reçoit le credential Google puis soumet automatiquement.
     * @param idToken Jeton Google.
     */
    async function onEmailGoogleCredential(idToken: string) {
        emailGoogleIdToken.value = idToken;
        emailError.value = null;
        await submitEmailChange();
    }

    watch(emailOpen, (open) => {
        if (!open) {
            emailError.value = null;
            emailGoogleIdToken.value = null;
            emailCurrentPassword.value = '';
        }
    });

    return reactive({
        emailSaving,
        emailError,
        emailDraft,
        emailCurrentPassword,
        emailOpen,
        emailGoogleIdToken,
        currentEmail,
        pendingEmail,
        isGoogleOnlyAccount,
        showEmailPassword,
        showEmailGoogle,
        canSubmitEmailChange,
        openEmailModal,
        submitEmailChange,
        onEmailGoogleCredential
    });
}
