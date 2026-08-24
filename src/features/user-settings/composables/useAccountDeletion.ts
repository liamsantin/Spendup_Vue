import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth';
import { withStepUpRetry } from '@/features/auth/step-up';
import { getErrorMessage } from '@/utils/errors/app-error';

export function useAccountDeletion() {
    const auth = useAuthStore();
    const { t } = useI18n();

    const deleteOpen = ref(false);
    const deleteSaving = ref(false);
    const deletePassword = ref('');
    const deleteGoogleIdToken = ref<string | null>(null);
    const deleteError = ref<string | null>(null);
    const deletePasswordExpanded = ref(false);

    const isGoogleOnlyAccount = computed(() => auth.user?.hasPassword === false);
    const showDeleteGoogle = computed(() => isGoogleOnlyAccount.value || auth.user?.hasGoogle !== false);
    const showDeletePassword = computed(() => !isGoogleOnlyAccount.value);
    const canSubmitDelete = computed(() => !!deleteGoogleIdToken.value || (!!deletePassword.value && showDeletePassword.value));

    function openDeleteModal() {
        deletePassword.value = '';
        deleteGoogleIdToken.value = null;
        deleteError.value = null;
        deletePasswordExpanded.value = auth.user?.hasPassword === true || auth.user?.hasGoogle === false;
        deleteOpen.value = true;
    }

    async function runDeleteAccount(payload: { currentPassword?: string; googleIdToken?: string }) {
        if (deleteSaving.value) return;
        deleteError.value = null;
        deleteSaving.value = true;
        try {
            await withStepUpRetry((stepUp) => auth.deleteAccount({ ...payload, stepUp }));
        } catch (e: unknown) {
            deleteError.value = getErrorMessage(e);
            deleteSaving.value = false;
        }
    }

    async function submitDeleteAccount() {
        if (deleteGoogleIdToken.value) {
            await runDeleteAccount({ googleIdToken: deleteGoogleIdToken.value });
            return;
        }
        if (showDeletePassword.value && deletePassword.value) {
            await runDeleteAccount({ currentPassword: deletePassword.value });
            return;
        }
        if (showDeleteGoogle.value && !deleteGoogleIdToken.value) {
            deleteError.value = t('accounts.deleteModal.errors.confirmGoogleFirst');
            return;
        }
        deleteError.value = t('accounts.deleteModal.errors.passwordRequired');
    }

    function onDeleteGoogleCredential(idToken: string) {
        deleteGoogleIdToken.value = idToken;
        deleteError.value = null;
        deletePassword.value = '';
    }

    function clearDeleteGoogleCredential() {
        deleteGoogleIdToken.value = null;
    }

    watch(deleteOpen, (open) => {
        if (!open) {
            deleteError.value = null;
            deleteGoogleIdToken.value = null;
            deletePassword.value = '';
            deletePasswordExpanded.value = false;
        }
    });

    return reactive({
        deleteOpen,
        deleteSaving,
        deletePassword,
        deleteGoogleIdToken,
        deleteError,
        deletePasswordExpanded,
        showDeleteGoogle,
        showDeletePassword,
        canSubmitDelete,
        openDeleteModal,
        submitDeleteAccount,
        onDeleteGoogleCredential,
        clearDeleteGoogleCredential
    });
}
