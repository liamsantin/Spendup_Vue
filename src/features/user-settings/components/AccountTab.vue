<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { TrashIcon } from 'vue-tabler-icons';
import {
    CATALOG_AVATARS,
    DEFAULT_AVATAR_SRC,
    catalogAvatarSrc,
    isCatalogProfilePicture,
    isUploadedProfilePicture,
    isValidUsername,
    normalizeUsername,
    useAuthStore,
    type Me,
    type UpdateProfilePayload
} from '@/features/auth';
import { useCountriesStore } from '@/features/countries';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppModalBase from '@/components/shared/AppModalBase.vue';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { withStepUpRetry } from '@/features/auth/step-up';
import AccountPictureCard from './account/AccountPictureCard.vue';
import AccountPersonalCard from './account/AccountPersonalCard.vue';
import AccountCredentialsCard from './account/AccountCredentialsCard.vue';

const auth = useAuthStore();
const countries = useCountriesStore();
const router = useRouter();
const { t } = useI18n();

const loading = ref(false);
const profileSaving = ref(false);
const usernameSaving = ref(false);
const emailSaving = ref(false);
const passwordSaving = ref(false);
const pictureSaving = ref(false);

const profileError = ref<string | null>(null);
const accountError = ref<string | null>(null);
const accountSuccess = ref<string | null>(null);
const usernameError = ref<string | null>(null);
const emailError = ref<string | null>(null);
const passwordError = ref<string | null>(null);
const pictureError = ref<string | null>(null);

const firstName = ref('');
const name = ref('');
const phone = ref('');
const birthDate = ref('');
const street = ref('');
const streetNumber = ref('');
/** Valeur `profilePicture` issue de `/me` (chemin catalogue, hash, ou null). */
const profilePicture = ref<string | null>(null);
/** URL affichable (asset catalogue, blob upload, ou aperçu local). */
const avatarDisplaySrc = ref<string | null>(DEFAULT_AVATAR_SRC);
const countryId = ref<number | null>(null);

const username = ref('');
const usernameDraft = ref('');
const usernamePassword = ref('');
const usernamePasswordConfirm = ref('');
/** Figé à l’ouverture : première création username + MDP (évite de masquer les champs après setUsername). */
const usernameModalIncludesPassword = ref(false);
const usernameOpen = ref(false);

const emailDraft = ref('');
const emailCurrentPassword = ref('');
const emailOpen = ref(false);

const passwordOpen = ref(false);
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

const unlinkGoogleOpen = ref(false);
const unlinkGooglePassword = ref('');
const unlinkGoogleSaving = ref(false);
const unlinkGoogleError = ref<string | null>(null);

const cancelConfirmOpen = ref(false);
const cancelConfirming = ref(false);
const saveConfirmOpen = ref(false);

const deleteOpen = ref(false);
const deleteSaving = ref(false);
const deletePassword = ref('');
const deleteGoogleIdToken = ref<string | null>(null);
const deleteError = ref<string | null>(null);
const deletePasswordExpanded = ref(false);

const avatarOpen = ref(false);
const avatarDraft = ref<string | null>(null);
const pictureLightboxOpen = ref(false);

/** Garde-fou courses async pour l’affichage avatar (blob). */
let avatarDisplayRequestId = 0;
const emailGoogleIdToken = ref<string | null>(null);

const avatarSrc = computed(() => avatarDisplaySrc.value || undefined);
const currentEmail = computed(() => auth.user?.email ?? null);
const pendingEmail = computed(() => auth.user?.pendingEmail ?? null);
const displayUsername = computed(() => username.value || '—');
const displayEmail = computed(() => currentEmail.value || '—');
const displayPublicId = computed(() => auth.user?.userPublicId || '—');
/** Compte sans mot de passe (Google-only). */
const isGoogleOnlyAccount = computed(() => auth.user?.hasPassword === false);
/** Champ MDP visible dès qu’un username est défini. */
const showAccountPasswordField = computed(() => !!username.value.trim());
/**
 * Exiger le MDP actuel seulement si /me confirme hasPassword === true.
 * Si false / absent (compte Google), la modale sert à définir un mot de passe.
 */
const requiresCurrentPassword = computed(() => auth.user?.hasPassword === true);
const showEmailPassword = computed(() => !isGoogleOnlyAccount.value);
const showEmailGoogle = computed(() => isGoogleOnlyAccount.value || auth.user?.hasGoogle !== false);
const canSubmitEmailChange = computed(() => {
    if (showEmailPassword.value && emailCurrentPassword.value) return true;
    if (showEmailGoogle.value && emailGoogleIdToken.value) return true;
    return false;
});
const showDeleteGoogle = computed(() => isGoogleOnlyAccount.value || auth.user?.hasGoogle !== false);
const showDeletePassword = computed(() => !isGoogleOnlyAccount.value);
const canSubmitDelete = computed(() => !!deleteGoogleIdToken.value || (!!deletePassword.value && showDeletePassword.value));
const canUnlinkGoogle = computed(() => auth.user?.hasGoogle === true && auth.user?.hasPassword === true);
const birthDateMax = computed(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
});
async function copyPublicId() {
    const id = auth.user?.userPublicId;
    if (!id) return;
    try {
        await navigator.clipboard.writeText(id);
    } catch {
        profileError.value = t('accounts.personal.errors.copyPublicId');
    }
}

function emptyToNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
}

function revokeDisplayBlob() {
    if (avatarDisplaySrc.value?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarDisplaySrc.value);
    }
}

async function resolveAvatarDisplay(picture: string | null) {
    const id = ++avatarDisplayRequestId;

    if (!picture) {
        revokeDisplayBlob();
        avatarDisplaySrc.value = DEFAULT_AVATAR_SRC;
        return;
    }

    if (isCatalogProfilePicture(picture)) {
        revokeDisplayBlob();
        avatarDisplaySrc.value = catalogAvatarSrc(picture);
        return;
    }

    if (isUploadedProfilePicture(picture)) {
        try {
            const blob = await auth.fetchAvatarBlob();
            if (id !== avatarDisplayRequestId) return;
            const nextUrl = URL.createObjectURL(blob);
            revokeDisplayBlob();
            avatarDisplaySrc.value = nextUrl;
        } catch (e: unknown) {
            if (id !== avatarDisplayRequestId) return;
            pictureError.value = getErrorMessage(e);
            revokeDisplayBlob();
            avatarDisplaySrc.value = DEFAULT_AVATAR_SRC;
        }
        return;
    }

    revokeDisplayBlob();
    avatarDisplaySrc.value = DEFAULT_AVATAR_SRC;
}

function hydrateFromUser(user: Me | null) {
    pictureError.value = null;

    if (!user) {
        firstName.value = '';
        name.value = '';
        phone.value = '';
        birthDate.value = '';
        street.value = '';
        streetNumber.value = '';
        profilePicture.value = null;
        countryId.value = null;
        username.value = '';
        void resolveAvatarDisplay(null);
        return;
    }

    firstName.value = user.firstName ?? '';
    name.value = user.name ?? '';
    phone.value = user.phone ?? '';
    birthDate.value = user.birthDate ?? '';
    street.value = user.street ?? '';
    streetNumber.value = user.streetNumber ?? '';
    profilePicture.value = user.profilePicture ?? null;
    countryId.value = user.countryId ?? null;
    username.value = user.username ?? '';
    void resolveAvatarDisplay(profilePicture.value);
}

function buildProfilePayload(): UpdateProfilePayload {
    return {
        firstName: emptyToNull(firstName.value),
        name: emptyToNull(name.value),
        phone: emptyToNull(phone.value),
        birthDate: emptyToNull(birthDate.value),
        street: emptyToNull(street.value),
        streetNumber: emptyToNull(streetNumber.value),
        countryId: countryId.value
    };
}

type ProfileSnapshot = {
    firstName: string | null;
    name: string | null;
    phone: string | null;
    birthDate: string | null;
    street: string | null;
    streetNumber: string | null;
    countryId: number | null;
};

const baseline = ref<ProfileSnapshot | null>(null);

function takeSnapshot(): ProfileSnapshot {
    return {
        firstName: emptyToNull(firstName.value),
        name: emptyToNull(name.value),
        phone: emptyToNull(phone.value),
        birthDate: emptyToNull(birthDate.value),
        street: emptyToNull(street.value),
        streetNumber: emptyToNull(streetNumber.value),
        countryId: countryId.value
    };
}

function commitBaseline() {
    baseline.value = takeSnapshot();
}

const isDirty = computed(() => {
    if (!baseline.value) return false;
    const current = takeSnapshot();
    const base = baseline.value;
    return (
        current.firstName !== base.firstName ||
        current.name !== base.name ||
        current.phone !== base.phone ||
        current.birthDate !== base.birthDate ||
        current.street !== base.street ||
        current.streetNumber !== base.streetNumber ||
        current.countryId !== base.countryId
    );
});

const emit = defineEmits<{
    dirty: [value: boolean];
}>();

watch(isDirty, (value) => emit('dirty', value), { immediate: true });

async function loadProfile() {
    loading.value = true;
    profileError.value = null;
    try {
        // Hydrate d’abord depuis le cache pour éviter un formulaire vide éditable.
        if (auth.user && !baseline.value) {
            hydrateFromUser(auth.user);
            commitBaseline();
        }
        const user = await auth.fetchMe();
        hydrateFromUser(user);
        commitBaseline();
    } catch (e: unknown) {
        profileError.value = getErrorMessage(e);
    } finally {
        loading.value = false;
    }
}

async function saveProfile() {
    if (profileSaving.value || !isDirty.value) return;
    profileSaving.value = true;
    profileError.value = null;
    try {
        await auth.updateProfile(buildProfilePayload());
        hydrateFromUser(auth.user);
        commitBaseline();
    } catch (e: unknown) {
        profileError.value = getErrorMessage(e);
        throw e;
    } finally {
        profileSaving.value = false;
    }
}

/** Ouvert depuis la barre d’actions « Enregistrer » — demande confirmation avant save. */
function requestSaveProfile() {
    if (!isDirty.value || profileSaving.value) return;
    saveConfirmOpen.value = true;
}

async function confirmSaveProfile() {
    if (profileSaving.value) return;
    try {
        await saveProfile();
        saveConfirmOpen.value = false;
    } catch {
        // Erreur déjà affichée dans le formulaire
    }
}

async function resetProfile() {
    profileError.value = null;
    accountError.value = null;
    accountSuccess.value = null;
    await loadProfile();
}

/** Ouvert depuis la barre d’actions « Annuler » — demande confirmation avant reset. */
function requestResetProfile() {
    if (!isDirty.value || cancelConfirming.value) return;
    cancelConfirmOpen.value = true;
}

async function confirmResetProfile() {
    if (cancelConfirming.value) return;
    cancelConfirming.value = true;
    try {
        await resetProfile();
        cancelConfirmOpen.value = false;
    } finally {
        cancelConfirming.value = false;
    }
}

function openAvatarPicker() {
    pictureError.value = null;
    avatarDraft.value = isCatalogProfilePicture(profilePicture.value) ? profilePicture.value : null;
    avatarOpen.value = true;
}

function openPictureLightbox() {
    pictureLightboxOpen.value = true;
}

async function onPictureSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || pictureSaving.value) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
        pictureError.value = t('accounts.picture.errors.allowedFormats');
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        pictureError.value = t('accounts.picture.errors.maxSize');
        return;
    }

    pictureSaving.value = true;
    pictureError.value = null;
    try {
        await auth.uploadAvatar(file);
        profilePicture.value = auth.user?.profilePicture ?? null;
        await resolveAvatarDisplay(profilePicture.value);
    } catch (e: unknown) {
        pictureError.value = getErrorMessage(e);
    } finally {
        pictureSaving.value = false;
    }
}

async function resetPicture() {
    if (pictureSaving.value) return;
    pictureSaving.value = true;
    pictureError.value = null;
    try {
        await auth.deleteAvatar();
        profilePicture.value = null;
        await resolveAvatarDisplay(null);
    } catch (e: unknown) {
        pictureError.value = getErrorMessage(e);
    } finally {
        pictureSaving.value = false;
    }
}

async function confirmCatalogAvatar() {
    if (pictureSaving.value || !avatarDraft.value) return;
    pictureSaving.value = true;
    pictureError.value = null;
    try {
        await auth.setCatalogAvatar(avatarDraft.value);
        profilePicture.value = auth.user?.profilePicture ?? avatarDraft.value;
        await resolveAvatarDisplay(profilePicture.value);
        avatarOpen.value = false;
    } catch (e: unknown) {
        pictureError.value = getErrorMessage(e);
    } finally {
        pictureSaving.value = false;
    }
}

function openUsernameModal() {
    usernameDraft.value = username.value;
    usernamePassword.value = '';
    usernamePasswordConfirm.value = '';
    usernameModalIncludesPassword.value = !username.value.trim() && auth.user?.hasPassword !== true;
    usernameError.value = null;
    accountSuccess.value = null;
    accountError.value = null;
    usernameOpen.value = true;
}

function isValidNewPassword(value: string) {
    return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

function openEmailModal() {
    emailDraft.value = '';
    emailCurrentPassword.value = '';
    emailGoogleIdToken.value = null;
    emailError.value = null;
    accountSuccess.value = null;
    accountError.value = null;
    emailOpen.value = true;
}

async function onEmailGoogleCredential(idToken: string) {
    emailGoogleIdToken.value = idToken;
    emailError.value = null;
    await submitEmailChange();
}

function openPasswordModal() {
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    passwordError.value = null;
    accountSuccess.value = null;
    accountError.value = null;
    passwordOpen.value = true;
}

function openDeleteModal() {
    deletePassword.value = '';
    deleteGoogleIdToken.value = null;
    deleteError.value = null;
    // MDP visible d’emblée si le compte a un mot de passe, ou s’il n’est pas Google.
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
        if (!isValidNewPassword(usernamePassword.value)) {
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
        username.value = auth.user?.username ?? value;

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
        accountSuccess.value = t('accounts.credentials.success.usernameUpdated');
        accountError.value = null;
    } catch (e: unknown) {
        usernameError.value = getErrorMessage(e);
    } finally {
        usernameSaving.value = false;
    }
}

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
        accountSuccess.value = null;
        accountError.value = null;
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

async function submitPasswordChange() {
    if (passwordSaving.value) return;
    passwordError.value = null;

    if (requiresCurrentPassword.value && !currentPassword.value) {
        passwordError.value = t('accounts.passwordModal.errors.currentRequired');
        return;
    }
    if (!isValidNewPassword(newPassword.value)) {
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
            auth.changePassword(requiresCurrentPassword.value ? currentPassword.value : null, newPassword.value, undefined, stepUp)
        );
    } catch (e: unknown) {
        passwordError.value = getErrorMessage(e);
        passwordSaving.value = false;
    }
}

function openUnlinkGoogleModal() {
    unlinkGooglePassword.value = '';
    unlinkGoogleError.value = null;
    accountError.value = null;
    accountSuccess.value = null;
    unlinkGoogleOpen.value = true;
}

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
        accountError.value = null;
        accountSuccess.value = t('accounts.credentials.success.googleUnlinked');
    } catch (e: unknown) {
        unlinkGoogleError.value = getErrorMessage(e);
    } finally {
        unlinkGoogleSaving.value = false;
    }
}

watch(usernameOpen, (open) => {
    if (!open) usernameError.value = null;
});

watch(emailOpen, (open) => {
    if (!open) {
        emailError.value = null;
        emailGoogleIdToken.value = null;
        emailCurrentPassword.value = '';
    }
});

watch(passwordOpen, (open) => {
    if (!open) passwordError.value = null;
});

watch(unlinkGoogleOpen, (open) => {
    if (!open) {
        unlinkGoogleError.value = null;
        unlinkGooglePassword.value = '';
    }
});

watch(deleteOpen, (open) => {
    if (!open) {
        deleteError.value = null;
        deleteGoogleIdToken.value = null;
        deletePassword.value = '';
        deletePasswordExpanded.value = false;
    }
});

onMounted(() => {
    void loadProfile();
    void countries.ensureLoaded().catch(() => {
        /* countries.error exposé dans AccountPersonalCard */
    });
});

onUnmounted(() => {
    avatarDisplayRequestId += 1;
    revokeDisplayBlob();
});

onBeforeRouteLeave(() => {
    if (!isDirty.value) return true;
    return window.confirm(t('accounts.leaveConfirm'));
});

defineExpose({
    saveProfile: requestSaveProfile,
    resetProfile: requestResetProfile,
    get loading() {
        return profileSaving.value || loading.value || cancelConfirming.value;
    },
    get isDirty() {
        return isDirty.value;
    }
});
</script>

<template>
    <div class="account-tab">
        <div v-if="loading && !baseline" class="d-flex justify-center py-10">
            <v-progress-circular indeterminate color="primary" size="36" />
        </div>

        <v-row v-else class="justify-center py-1" no-gutters>
            <v-col cols="12" md="9" class="pb-4">
                <AccountPictureCard
                    :avatar-src="avatarSrc"
                    :profile-picture="profilePicture"
                    :saving="pictureSaving"
                    :error="pictureError"
                    @upload="onPictureSelected"
                    @choose-avatar="openAvatarPicker"
                    @reset="resetPicture"
                    @open-lightbox="openPictureLightbox"
                    @dismiss-error="pictureError = null"
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
                    :loading="loading"
                    :countries="countries.items"
                    :countries-loading="countries.loading"
                    :countries-error="countries.error"
                    :public-id="displayPublicId"
                    :error="profileError"
                    :birth-date-max="birthDateMax"
                    @copy-public-id="copyPublicId"
                    @dismiss-error="profileError = null"
                />
            </v-col>

            <v-col cols="12" md="9" class="pb-4">
                <AccountCredentialsCard
                    :username="displayUsername"
                    :email="displayEmail"
                    :pending-email="pendingEmail"
                    :show-password-field="showAccountPasswordField"
                    :can-unlink-google="canUnlinkGoogle"
                    :success="accountSuccess"
                    :error="accountError"
                    @edit-username="openUsernameModal"
                    @edit-email="openEmailModal"
                    @edit-password="openPasswordModal"
                    @unlink-google="openUnlinkGoogleModal"
                    @confirm-pending-email="
                        router.push({ path: '/auth/confirm-email-change', query: { email: pendingEmail, from: 'app' } })
                    "
                    @dismiss-success="accountSuccess = null"
                    @dismiss-error="accountError = null"
                />
            </v-col>

            <v-col cols="12" md="9">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center ga-3 flex-wrap">
                            <v-avatar size="48" rounded="md" color="lighterror">
                                <TrashIcon class="text-error" size="25" />
                            </v-avatar>
                            <h4 class="text-h4 mb-0">{{ t('accounts.danger.title') }}</h4>
                        </div>
                        <div class="text-subtitle-1 text-medium-emphasis text-10 my-3">
                            {{ t('accounts.danger.subtitle') }}
                        </div>
                        <div class="d-flex align-center justify-space-between flex-wrap ga-3 mt-2">
                            <div class="text-subtitle-1 text-medium-emphasis text-13 pr-4">
                                {{ t('accounts.danger.warning') }}
                            </div>
                            <v-btn color="error" flat class="flex-shrink-0" @click="openDeleteModal">{{
                                t('accounts.danger.deleteAccount')
                            }}</v-btn>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>
        </v-row>

        <AppModalBase
            v-model="pictureLightboxOpen"
            :title="t('accounts.picture.lightbox.title')"
            :max-width="560"
            :scrollable="false"
            :show-footer="false"
            :persistent="false"
        >
            <div class="d-flex justify-center">
                <v-img
                    :src="avatarSrc || DEFAULT_AVATAR_SRC"
                    :alt="t('accounts.picture.alt')"
                    max-width="100%"
                    max-height="70vh"
                    contain
                    class="rounded-lg account-picture-lightbox-img"
                />
            </div>
        </AppModalBase>

        <AppModalBase
            v-model="avatarOpen"
            :title="t('accounts.picture.catalogModal.title')"
            :subtitle="t('accounts.picture.catalogModal.subtitle')"
            :max-width="520"
            :scrollable="true"
        >
            <div class="d-flex flex-wrap justify-center ga-3 py-2">
                <button
                    v-for="path in CATALOG_AVATARS"
                    :key="path"
                    type="button"
                    class="avatar-catalog-option"
                    :class="{ 'avatar-catalog-option--selected': avatarDraft === path }"
                    :aria-pressed="avatarDraft === path"
                    @click="avatarDraft = path"
                >
                    <v-avatar size="64" color="lightprimary">
                        <v-img :src="catalogAvatarSrc(path)" :alt="path" cover />
                    </v-avatar>
                </button>
            </div>

            <template #footer="{ close }">
                <v-btn variant="text" flat :disabled="pictureSaving" @click="close">{{ t('common.cancel') }}</v-btn>
                <v-spacer />
                <v-btn color="primary" flat :loading="pictureSaving" :disabled="!avatarDraft" @click="confirmCatalogAvatar">
                    {{ t('accounts.picture.catalogModal.apply') }}
                </v-btn>
            </template>
        </AppModalBase>

        <AppModalBase
            v-model="usernameOpen"
            :title="usernameModalIncludesPassword ? t('accounts.usernameModal.createTitle') : t('accounts.usernameModal.editTitle')"
            :subtitle="
                usernameModalIncludesPassword ? t('accounts.usernameModal.createSubtitle') : t('accounts.usernameModal.editSubtitle')
            "
            :max-width="440"
            :scrollable="false"
        >
            <form id="account-username-form" @submit.prevent="saveUsername">
                <AppAlert v-if="usernameError" type="error" class="mb-4" closable @dismiss="usernameError = null">
                    {{ usernameError }}
                </AppAlert>
                <v-label class="mb-2 font-weight-medium">{{ t('accounts.usernameModal.fields.username') }}</v-label>
                <v-text-field
                    v-model="usernameDraft"
                    color="primary"
                    variant="outlined"
                    hide-details
                    autofocus
                    :class="usernameModalIncludesPassword ? 'mb-2' : undefined"
                />
                <template v-if="usernameModalIncludesPassword">
                    <div class="text-caption text-medium-emphasis mb-2">{{ t('accounts.usernameModal.usernameHint') }}</div>
                    <v-label class="mb-1 font-weight-medium">{{ t('accounts.usernameModal.fields.password') }}</v-label>
                    <v-text-field
                        v-model="usernamePassword"
                        color="primary"
                        variant="outlined"
                        type="password"
                        autocomplete="new-password"
                        density="comfortable"
                        hide-details
                        class="mb-2"
                    />
                    <v-label class="mb-1 font-weight-medium">{{ t('accounts.usernameModal.fields.confirmPassword') }}</v-label>
                    <v-text-field
                        v-model="usernamePasswordConfirm"
                        color="primary"
                        variant="outlined"
                        type="password"
                        autocomplete="new-password"
                        density="comfortable"
                        hide-details
                    />
                </template>
            </form>

            <template #footer="{ close }">
                <v-btn variant="text" flat :disabled="usernameSaving" @click="close">{{ t('common.cancel') }}</v-btn>
                <v-spacer />
                <v-btn color="primary" flat type="submit" form="account-username-form" :loading="usernameSaving">{{
                    t('common.save')
                }}</v-btn>
            </template>
        </AppModalBase>

        <AppModalBase
            v-model="emailOpen"
            :title="currentEmail ? t('accounts.emailModal.changeTitle') : t('accounts.emailModal.addTitle')"
            :subtitle="t('accounts.emailModal.subtitle')"
            :max-width="440"
            :scrollable="false"
        >
            <form id="account-email-form" @submit.prevent="submitEmailChange">
                <AppAlert v-if="emailError" type="error" class="mb-3" closable @dismiss="emailError = null">
                    {{ emailError }}
                </AppAlert>
                <v-label class="mb-1 font-weight-medium">{{
                    currentEmail ? t('accounts.emailModal.fields.newEmail') : t('accounts.emailModal.fields.email')
                }}</v-label>
                <v-text-field
                    v-model="emailDraft"
                    color="primary"
                    variant="outlined"
                    type="email"
                    autocomplete="email"
                    density="comfortable"
                    hide-details
                    class="mb-2"
                    :disabled="emailSaving"
                />
                <template v-if="showEmailPassword">
                    <v-label class="mb-1 font-weight-medium">{{ t('accounts.emailModal.fields.currentPassword') }}</v-label>
                    <v-text-field
                        v-model="emailCurrentPassword"
                        color="primary"
                        variant="outlined"
                        type="password"
                        autocomplete="current-password"
                        density="comfortable"
                        hide-details
                        :disabled="emailSaving"
                    />
                </template>
                <template v-else-if="showEmailGoogle">
                    <p class="text-subtitle-2 text-medium-emphasis mb-3">{{ t('accounts.emailModal.googleHint') }}</p>
                    <GoogleSignInButton @credential="onEmailGoogleCredential" />
                </template>
            </form>

            <template #footer="{ close }">
                <v-btn variant="text" flat :disabled="emailSaving" @click="close">{{ t('common.cancel') }}</v-btn>
                <v-spacer />
                <v-btn
                    v-if="showEmailPassword"
                    color="primary"
                    flat
                    type="submit"
                    form="account-email-form"
                    :loading="emailSaving"
                    :disabled="!canSubmitEmailChange"
                >
                    {{ t('accounts.emailModal.continue') }}
                </v-btn>
            </template>
        </AppModalBase>

        <AppModalBase
            v-model="passwordOpen"
            :title="requiresCurrentPassword ? t('accounts.passwordModal.changeTitle') : t('accounts.passwordModal.setTitle')"
            :subtitle="t('accounts.passwordModal.subtitle')"
            :max-width="440"
            :scrollable="false"
        >
            <form id="account-password-form" @submit.prevent="submitPasswordChange">
                <AppAlert v-if="passwordError" type="error" class="mb-3" closable @dismiss="passwordError = null">
                    {{ passwordError }}
                </AppAlert>
                <template v-if="requiresCurrentPassword">
                    <v-label class="mb-1 font-weight-medium">{{ t('accounts.passwordModal.fields.currentPassword') }}</v-label>
                    <v-text-field
                        v-model="currentPassword"
                        color="primary"
                        variant="outlined"
                        type="password"
                        autocomplete="current-password"
                        density="comfortable"
                        hide-details
                        class="mb-2"
                    />
                </template>
                <v-label class="mb-1 font-weight-medium">{{ t('accounts.passwordModal.fields.newPassword') }}</v-label>
                <v-text-field
                    v-model="newPassword"
                    color="primary"
                    variant="outlined"
                    type="password"
                    autocomplete="new-password"
                    density="comfortable"
                    hide-details
                    class="mb-2"
                />
                <v-label class="mb-1 font-weight-medium">{{ t('accounts.passwordModal.fields.confirmPassword') }}</v-label>
                <v-text-field
                    v-model="confirmPassword"
                    color="primary"
                    variant="outlined"
                    type="password"
                    autocomplete="new-password"
                    density="comfortable"
                    hide-details
                />
            </form>

            <template #footer="{ close }">
                <v-btn variant="text" flat :disabled="passwordSaving" @click="close">{{ t('common.cancel') }}</v-btn>
                <v-spacer />
                <v-btn color="primary" flat type="submit" form="account-password-form" :loading="passwordSaving">{{
                    t('common.save')
                }}</v-btn>
            </template>
        </AppModalBase>

        <AppModalBase
            v-model="unlinkGoogleOpen"
            :title="t('accounts.unlinkGoogleModal.title')"
            :subtitle="t('accounts.unlinkGoogleModal.subtitle')"
            :max-width="440"
            :scrollable="false"
        >
            <form id="account-unlink-google-form" @submit.prevent="submitUnlinkGoogle">
                <AppAlert v-if="unlinkGoogleError" type="error" class="mb-3" closable @dismiss="unlinkGoogleError = null">
                    {{ unlinkGoogleError }}
                </AppAlert>
                <v-label class="mb-1 font-weight-medium">{{ t('accounts.unlinkGoogleModal.fields.currentPassword') }}</v-label>
                <v-text-field
                    v-model="unlinkGooglePassword"
                    color="primary"
                    variant="outlined"
                    type="password"
                    autocomplete="current-password"
                    density="comfortable"
                    hide-details
                    :disabled="unlinkGoogleSaving"
                />
            </form>

            <template #footer="{ close }">
                <v-btn variant="text" flat :disabled="unlinkGoogleSaving" @click="close">{{ t('common.cancel') }}</v-btn>
                <v-spacer />
                <v-btn
                    color="error"
                    flat
                    type="submit"
                    form="account-unlink-google-form"
                    :loading="unlinkGoogleSaving"
                    :disabled="!unlinkGooglePassword"
                >
                    {{ t('accounts.unlinkGoogleModal.confirm') }}
                </v-btn>
            </template>
        </AppModalBase>

        <AppModalBase
            v-model="saveConfirmOpen"
            :title="t('accounts.saveConfirmModal.title')"
            :subtitle="t('accounts.saveConfirmModal.subtitle')"
            :max-width="440"
            :scrollable="false"
        >
            <p class="text-body-1 mb-0">{{ t('accounts.saveConfirmModal.body') }}</p>

            <template #footer="{ close }">
                <v-btn variant="text" flat :disabled="profileSaving" @click="close">{{ t('accounts.saveConfirmModal.back') }}</v-btn>
                <v-spacer />
                <v-btn color="primary" flat :loading="profileSaving" @click="confirmSaveProfile">{{
                    t('accounts.saveConfirmModal.confirm')
                }}</v-btn>
            </template>
        </AppModalBase>

        <AppModalBase
            v-model="cancelConfirmOpen"
            :title="t('accounts.cancelConfirmModal.title')"
            :subtitle="t('accounts.cancelConfirmModal.subtitle')"
            :max-width="440"
            :scrollable="false"
        >
            <p class="text-body-1 mb-0">{{ t('accounts.cancelConfirmModal.body') }}</p>

            <template #footer="{ close }">
                <v-btn variant="text" flat :disabled="cancelConfirming" @click="close">{{ t('accounts.cancelConfirmModal.back') }}</v-btn>
                <v-spacer />
                <v-btn class="bg-lighterror text-error" flat :loading="cancelConfirming" @click="confirmResetProfile">
                    {{ t('accounts.cancelConfirmModal.confirm') }}
                </v-btn>
            </template>
        </AppModalBase>

        <AppModalBase
            v-model="deleteOpen"
            :title="t('accounts.deleteModal.title')"
            :subtitle="t('accounts.deleteModal.subtitle')"
            :max-width="440"
            :scrollable="false"
        >
            <form id="account-delete-form" @submit.prevent="submitDeleteAccount">
                <AppAlert v-if="deleteError" type="error" class="mb-3" closable @dismiss="deleteError = null">
                    {{ deleteError }}
                </AppAlert>
                <p class="text-body-1 mb-4">
                    {{ t('accounts.deleteModal.body') }}
                </p>

                <template v-if="showDeleteGoogle">
                    <AppAlert
                        v-if="deleteGoogleIdToken"
                        color="success"
                        variant="tonal"
                        class="mb-3"
                        closable
                        @dismiss="clearDeleteGoogleCredential"
                    >
                        {{ t('accounts.deleteModal.googleVerified') }}
                    </AppAlert>
                    <GoogleSignInButton v-else class="mb-4" @credential="onDeleteGoogleCredential" />
                </template>

                <template v-if="showDeletePassword">
                    <div v-if="showDeleteGoogle && !deleteGoogleIdToken" class="d-flex align-center text-center mb-3">
                        <div class="text-subtitle-2 text-medium-emphasis w-100">{{ t('accounts.deleteModal.or') }}</div>
                    </div>

                    <v-btn
                        v-if="!deletePasswordExpanded && !deleteGoogleIdToken"
                        variant="text"
                        color="primary"
                        class="mb-2 px-0"
                        @click="deletePasswordExpanded = true"
                    >
                        {{ t('accounts.deleteModal.usePassword') }}
                    </v-btn>

                    <template v-if="deletePasswordExpanded && !deleteGoogleIdToken">
                        <v-label class="mb-1 font-weight-medium">{{ t('accounts.deleteModal.fields.currentPassword') }}</v-label>
                        <v-text-field
                            v-model="deletePassword"
                            color="primary"
                            variant="outlined"
                            type="password"
                            autocomplete="current-password"
                            density="comfortable"
                            hide-details
                            :disabled="deleteSaving"
                        />
                    </template>
                </template>
            </form>

            <template #footer="{ close }">
                <v-btn variant="text" flat :disabled="deleteSaving" @click="close">{{ t('common.cancel') }}</v-btn>
                <v-spacer />
                <v-btn
                    color="error"
                    flat
                    type="submit"
                    form="account-delete-form"
                    :loading="deleteSaving"
                    :disabled="!canSubmitDelete && !deleteSaving"
                >
                    {{ t('accounts.deleteModal.confirm') }}
                </v-btn>
            </template>
        </AppModalBase>
    </div>
</template>

<style scoped>
.account-tab {
    max-width: 100%;
    overflow-x: hidden;
}

.account-public-id {
    cursor: pointer;
    user-select: none;
}

.account-field-editable {
    cursor: pointer;
}

.account-field-edit-icon {
    cursor: pointer;
}

.account-tab :deep(.v-label) {
    display: block;
    margin-bottom: 16px;
}

.avatar-catalog-option {
    padding: 4px;
    border: 2px solid transparent;
    border-radius: 9999px;
    background: transparent;
    cursor: pointer;
    line-height: 0;
}

.avatar-catalog-option--selected {
    border-color: rgb(var(--v-theme-primary));
}

.account-picture-avatar {
    cursor: zoom-in;
}

.account-picture-lightbox-img {
    width: min(100%, 480px);
}
</style>
