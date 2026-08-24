import { computed, reactive, ref, watch, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth';
import { withStepUpRetry } from '@/features/auth/step-up';
import { getErrorMessage } from '@/utils/errors/app-error';
import { isValidAccountPassword } from '@/features/user-settings/account-profile';

export function useAccountPasswordChange(options: {
    accountSuccess: Ref<string | null>;
    accountError: Ref<string | null>;
}) {
    const auth = useAuthStore();
    const { t } = useI18n();

    const passwordSaving = ref(false);
    const passwordError = ref<string | null>(null);
    const passwordOpen = ref(false);
    const currentPassword = ref('');
    const newPassword = ref('');
    const confirmPassword = ref('');

    const requiresCurrentPassword = computed(() => auth.user?.hasPassword === true);

    function openPasswordModal() {
        currentPassword.value = '';
        newPassword.value = '';
        confirmPassword.value = '';
        passwordError.value = null;
        options.accountSuccess.value = null;
        options.accountError.value = null;
        passwordOpen.value = true;
    }

    async function submitPasswordChange() {
        if (passwordSaving.value) return;
        passwordError.value = null;

        if (requiresCurrentPassword.value && !currentPassword.value) {
            passwordError.value = t('accounts.passwordModal.errors.currentRequired');
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
                    stepUp
                )
            );
        } catch (e: unknown) {
            passwordError.value = getErrorMessage(e);
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
        requiresCurrentPassword,
        openPasswordModal,
        submitPasswordChange
    });
}
