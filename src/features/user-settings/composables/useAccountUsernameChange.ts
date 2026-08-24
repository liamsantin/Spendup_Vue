import { reactive, ref, watch, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { isValidUsername, normalizeUsername, useAuthStore } from '@/features/auth';
import { withStepUpRetry } from '@/features/auth/step-up';
import { getErrorMessage } from '@/utils/errors/app-error';
import { isValidAccountPassword } from '@/features/user-settings/account-profile';

export function useAccountUsernameChange(options: {
    username: Ref<string>;
    accountSuccess: Ref<string | null>;
    accountError: Ref<string | null>;
}) {
    const auth = useAuthStore();
    const { t } = useI18n();

    const usernameSaving = ref(false);
    const usernameError = ref<string | null>(null);
    const usernameDraft = ref('');
    const usernamePassword = ref('');
    const usernamePasswordConfirm = ref('');
    const usernameModalIncludesPassword = ref(false);
    const usernameOpen = ref(false);

    function openUsernameModal() {
        usernameDraft.value = options.username.value;
        usernamePassword.value = '';
        usernamePasswordConfirm.value = '';
        usernameModalIncludesPassword.value = !options.username.value.trim() && auth.user?.hasPassword !== true;
        usernameError.value = null;
        options.accountSuccess.value = null;
        options.accountError.value = null;
        usernameOpen.value = true;
    }

    async function saveUsername() {
        if (usernameSaving.value) return;
        usernameError.value = null;

        const value = normalizeUsername(usernameDraft.value);
        if (!isValidUsername(value)) {
            usernameError.value = t('accounts.usernameModal.errors.invalidUsername');
            return;
        }

        const withPassword = usernameModalIncludesPassword.value;
        if (withPassword) {
            if (!isValidAccountPassword(usernamePassword.value)) {
                usernameError.value = t('accounts.usernameModal.errors.invalidPassword');
                return;
            }
            if (usernamePassword.value !== usernamePasswordConfirm.value) {
                usernameError.value = t('accounts.usernameModal.errors.passwordMismatch');
                return;
            }
        }

        usernameSaving.value = true;
        try {
            await auth.setUsername(value);
            options.username.value = auth.user?.username ?? value;

            if (withPassword) {
                await withStepUpRetry((stepUp) =>
                    auth.changePassword(
                        null,
                        usernamePassword.value,
                        t('accounts.usernameModal.success.credentialsCreated', { username: value }),
                        stepUp
                    )
                );
                return;
            }

            usernameOpen.value = false;
            options.accountSuccess.value = t('accounts.credentials.success.usernameUpdated');
            options.accountError.value = null;
        } catch (e: unknown) {
            usernameError.value = getErrorMessage(e);
        } finally {
            usernameSaving.value = false;
        }
    }

    watch(usernameOpen, (open) => {
        if (!open) usernameError.value = null;
    });

    return reactive({
        usernameSaving,
        usernameError,
        usernameDraft,
        usernamePassword,
        usernamePasswordConfirm,
        usernameModalIncludesPassword,
        usernameOpen,
        openUsernameModal,
        saveUsername
    });
}
