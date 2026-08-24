<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth';
import { useCountriesStore } from '@/features/countries';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { useAccountProfileForm } from '@/features/user-settings/composables/useAccountProfileForm';
import { useAccountAvatarEditor } from '@/features/user-settings/composables/useAccountAvatarEditor';
import { useAccountUsernameChange } from '@/features/user-settings/composables/useAccountUsernameChange';
import { useAccountEmailChange } from '@/features/user-settings/composables/useAccountEmailChange';
import { useAccountPasswordChange } from '@/features/user-settings/composables/useAccountPasswordChange';
import { useAccountDeletion } from '@/features/user-settings/composables/useAccountDeletion';
import { useAccountUnlinkGoogle } from '@/features/user-settings/composables/useAccountUnlinkGoogle';
import AccountPictureCard from '@/features/user-settings/components/account/AccountPictureCard.vue';
import AccountPersonalCard from '@/features/user-settings/components/account/AccountPersonalCard.vue';
import AccountCredentialsCard from '@/features/user-settings/components/account/AccountCredentialsCard.vue';
import AccountDangerCard from '@/features/user-settings/components/account/AccountDangerCard.vue';
import AvatarCatalogModal from '@/features/user-settings/components/account/modals/AvatarCatalogModal.vue';
import UsernameChangeModal from '@/features/user-settings/components/account/modals/UsernameChangeModal.vue';
import EmailChangeModal from '@/features/user-settings/components/account/modals/EmailChangeModal.vue';
import PasswordChangeModal from '@/features/user-settings/components/account/modals/PasswordChangeModal.vue';
import UnlinkGoogleModal from '@/features/user-settings/components/account/modals/UnlinkGoogleModal.vue';
import DeleteAccountModal from '@/features/user-settings/components/account/modals/DeleteAccountModal.vue';

const auth = useAuthStore();
const countries = useCountriesStore();
const router = useRouter();
const { t } = useI18n();

const emit = defineEmits<{
    dirty: [value: boolean];
}>();

const firstName = ref('');
const name = ref('');
const phone = ref('');
const birthDate = ref('');
const street = ref('');
const streetNumber = ref('');
const profilePicture = ref<string | null>(null);
const countryId = ref<number | null>(null);
const username = ref('');
const accountError = ref<string | null>(null);
const accountSuccess = ref<string | null>(null);

const avatar = useAccountAvatarEditor(profilePicture);
const profile = useAccountProfileForm({
    fields: { firstName, name, phone, birthDate, street, streetNumber, countryId, username, profilePicture },
    onHydratePicture: (picture) => void avatar.resolveAvatarDisplay(picture),
    emitDirty: (value) => emit('dirty', value),
    clearAccountFeedback: () => {
        accountError.value = null;
        accountSuccess.value = null;
    },
    onMountedExtra: () => {
        void countries.ensureLoaded().catch(() => {
            /* countries.error exposé dans AccountPersonalCard */
        });
    }
});
const usernameChange = useAccountUsernameChange({ username, accountSuccess, accountError });
const emailChange = useAccountEmailChange({ accountSuccess, accountError });
const passwordChange = useAccountPasswordChange({ accountSuccess, accountError });
const deletion = useAccountDeletion();
const unlinkGoogle = useAccountUnlinkGoogle({ accountSuccess, accountError });

const displayUsername = computed(() => username.value || '—');
const displayEmail = computed(() => emailChange.currentEmail || '—');
const showAccountPasswordField = computed(() => !!username.value.trim());
const canUnlinkGoogle = computed(() => auth.user?.hasGoogle === true && auth.user?.hasPassword === true);

defineExpose({
    saveProfile: profile.requestSaveProfile,
    resetProfile: profile.requestResetProfile,
    get loading() {
        return profile.profileSaving || profile.loading || profile.cancelConfirming;
    },
    get isDirty() {
        return profile.isDirty;
    }
});
</script>

<template>
    <div class="account-tab">
        <div v-if="profile.loading && !profile.baseline" class="d-flex justify-center py-10">
            <v-progress-circular indeterminate color="primary" size="36" />
        </div>

        <v-row v-else class="justify-center py-1" no-gutters>
            <v-col cols="12" md="9" class="pb-4">
                <AccountPictureCard
                    :avatar-src="avatar.avatarSrc"
                    :profile-picture="profilePicture"
                    :saving="avatar.pictureSaving"
                    :error="avatar.pictureError"
                    @upload="avatar.onPictureSelected"
                    @choose-avatar="avatar.openAvatarPicker"
                    @reset="avatar.resetPicture"
                    @open-lightbox="avatar.openPictureLightbox"
                    @dismiss-error="avatar.pictureError = null"
                />
            </v-col>

            <v-col cols="12" md="9" class="pb-4">
                <AccountPersonalCard
                    v-model:first-name="firstName"
                    v-model:name="name"
                    v-model:phone="phone"
                    v-model:birth-date="birthDate"
                    v-model:street="street"
                    v-model:street-number="streetNumber"
                    v-model:country-id="countryId"
                    :loading="profile.loading"
                    :countries="countries.items"
                    :countries-loading="countries.loading"
                    :countries-error="countries.error"
                    :public-id="profile.displayPublicId"
                    :error="profile.profileError"
                    :birth-date-max="profile.birthDateMax"
                    @copy-public-id="profile.copyPublicId"
                    @dismiss-error="profile.profileError = null"
                />
            </v-col>

            <v-col cols="12" md="9" class="pb-4">
                <AccountCredentialsCard
                    :username="displayUsername"
                    :email="displayEmail"
                    :pending-email="emailChange.pendingEmail"
                    :show-password-field="showAccountPasswordField"
                    :can-unlink-google="canUnlinkGoogle"
                    :success="accountSuccess"
                    :error="accountError"
                    @edit-username="usernameChange.openUsernameModal"
                    @edit-email="emailChange.openEmailModal"
                    @edit-password="passwordChange.openPasswordModal"
                    @unlink-google="unlinkGoogle.openUnlinkGoogleModal"
                    @confirm-pending-email="
                        router.push({ path: '/auth/confirm-email-change', query: { email: emailChange.pendingEmail, from: 'app' } })
                    "
                    @dismiss-success="accountSuccess = null"
                    @dismiss-error="accountError = null"
                />
            </v-col>

            <v-col cols="12" md="9">
                <AccountDangerCard @delete="deletion.openDeleteModal" />
            </v-col>
        </v-row>

        <AvatarCatalogModal
            v-model:lightbox-open="avatar.pictureLightboxOpen"
            v-model:avatar-open="avatar.avatarOpen"
            v-model:avatar-draft="avatar.avatarDraft"
            :avatar-src="avatar.avatarSrc"
            :picture-saving="avatar.pictureSaving"
            @confirm-catalog="avatar.confirmCatalogAvatar"
        />

        <UsernameChangeModal
            v-model:open="usernameChange.usernameOpen"
            v-model:username-draft="usernameChange.usernameDraft"
            v-model:username-password="usernameChange.usernamePassword"
            v-model:username-password-confirm="usernameChange.usernamePasswordConfirm"
            v-model:error="usernameChange.usernameError"
            :includes-password="usernameChange.usernameModalIncludesPassword"
            :saving="usernameChange.usernameSaving"
            @save="usernameChange.saveUsername"
        />

        <EmailChangeModal
            v-model:open="emailChange.emailOpen"
            v-model:email-draft="emailChange.emailDraft"
            v-model:email-current-password="emailChange.emailCurrentPassword"
            v-model:error="emailChange.emailError"
            :current-email="emailChange.currentEmail"
            :saving="emailChange.emailSaving"
            :show-email-password="emailChange.showEmailPassword"
            :show-email-google="emailChange.showEmailGoogle"
            :can-submit="emailChange.canSubmitEmailChange"
            @submit="emailChange.submitEmailChange"
            @google-credential="emailChange.onEmailGoogleCredential"
        />

        <PasswordChangeModal
            v-model:open="passwordChange.passwordOpen"
            v-model:current-password="passwordChange.currentPassword"
            v-model:new-password="passwordChange.newPassword"
            v-model:confirm-password="passwordChange.confirmPassword"
            v-model:error="passwordChange.passwordError"
            :requires-current-password="passwordChange.requiresCurrentPassword"
            :saving="passwordChange.passwordSaving"
            @submit="passwordChange.submitPasswordChange"
        />

        <UnlinkGoogleModal
            v-model:open="unlinkGoogle.unlinkGoogleOpen"
            v-model:password="unlinkGoogle.unlinkGooglePassword"
            v-model:error="unlinkGoogle.unlinkGoogleError"
            :saving="unlinkGoogle.unlinkGoogleSaving"
            @submit="unlinkGoogle.submitUnlinkGoogle"
        />

        <AppConfirmationModal
            v-model="profile.saveConfirmOpen"
            :title="t('accounts.saveConfirmModal.title')"
            :message="t('accounts.saveConfirmModal.body')"
            :cancel-label="t('accounts.saveConfirmModal.back')"
            :confirm-label="t('accounts.saveConfirmModal.confirm')"
            :loading="profile.profileSaving"
            @confirm="profile.confirmSaveProfile"
        />

        <AppConfirmationModal
            v-model="profile.cancelConfirmOpen"
            :title="t('accounts.cancelConfirmModal.title')"
            :message="t('accounts.cancelConfirmModal.body')"
            :cancel-label="t('accounts.cancelConfirmModal.back')"
            :confirm-label="t('accounts.cancelConfirmModal.confirm')"
            confirm-color=""
            confirm-class="bg-lighterror text-error"
            :loading="profile.cancelConfirming"
            @confirm="profile.confirmResetProfile"
        />

        <DeleteAccountModal
            v-model:open="deletion.deleteOpen"
            v-model:password="deletion.deletePassword"
            v-model:password-expanded="deletion.deletePasswordExpanded"
            v-model:error="deletion.deleteError"
            :google-id-token="deletion.deleteGoogleIdToken"
            :saving="deletion.deleteSaving"
            :show-delete-google="deletion.showDeleteGoogle"
            :show-delete-password="deletion.showDeletePassword"
            :can-submit="deletion.canSubmitDelete"
            @submit="deletion.submitDeleteAccount"
            @google-credential="deletion.onDeleteGoogleCredential"
            @clear-google-credential="deletion.clearDeleteGoogleCredential"
        />
    </div>
</template>

<style scoped>
.account-tab {
    max-width: 100%;
    overflow-x: hidden;
}

.account-tab :deep(.v-label) {
    display: block;
    margin-bottom: 16px;
}
</style>
