<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { LockIcon, PencilIcon, TrashIcon, UserIcon } from 'vue-tabler-icons';
import { isValidUsername, normalizeUsername, useAuthStore, type Me, type UpdateProfilePayload } from '@/features/auth';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppModalBase from '@/components/shared/AppModalBase.vue';
import AppDatePicker from '@/components/shared/AppDatePicker.vue';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue';
import { COUNTRIES } from '@/data/countries';

const auth = useAuthStore();
const router = useRouter();

const loading = ref(false);
const profileSaving = ref(false);
const usernameSaving = ref(false);
const emailSaving = ref(false);
const passwordSaving = ref(false);

const profileError = ref<string | null>(null);
const profileSuccess = ref<string | null>(null);
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
/** URL serveur (ou null si réinitialisée) — envoyée dans PUT /profile. */
const profilePicture = ref<string | null>(null);
/** Aperçu local (blob:) après sélection fichier — non persisté tant qu’il n’y a pas d’upload API. */
const picturePreview = ref<string | null>(null);
const pictureCleared = ref(false);
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

const cancelConfirmOpen = ref(false);
const cancelConfirming = ref(false);
const saveConfirmOpen = ref(false);

const deleteOpen = ref(false);
const deleteSaving = ref(false);
const deletePassword = ref('');
const deleteGoogleIdToken = ref<string | null>(null);
const deleteError = ref<string | null>(null);
const deletePasswordExpanded = ref(false);

const fileInputRef = ref<HTMLInputElement | null>(null);

const avatarSrc = computed(() => {
    if (pictureCleared.value) return undefined;
    return picturePreview.value || profilePicture.value || undefined;
});
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
const showDeleteGoogle = computed(() => isGoogleOnlyAccount.value || auth.user?.hasGoogle !== false);
const showDeletePassword = computed(() => !isGoogleOnlyAccount.value);
const canSubmitDelete = computed(() => !!deleteGoogleIdToken.value || (!!deletePassword.value && showDeletePassword.value));
const birthDateMax = computed(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
});
const birthDateModel = computed({
    get: () => birthDate.value || null,
    set: (value: string | null) => {
        birthDate.value = value ?? '';
    }
});

async function copyPublicId() {
    const id = auth.user?.userPublicId;
    if (!id) return;
    try {
        await navigator.clipboard.writeText(id);
    } catch {
        profileError.value = 'Impossible de copier l’identifiant.';
    }
}

function emptyToNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
}

function revokePreview() {
    if (picturePreview.value?.startsWith('blob:')) {
        URL.revokeObjectURL(picturePreview.value);
    }
    picturePreview.value = null;
}

function hydrateFromUser(user: Me | null) {
    revokePreview();
    pictureCleared.value = false;
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
}

function buildProfilePayload(): UpdateProfilePayload {
    return {
        firstName: emptyToNull(firstName.value),
        name: emptyToNull(name.value),
        phone: emptyToNull(phone.value),
        birthDate: emptyToNull(birthDate.value),
        street: emptyToNull(street.value),
        streetNumber: emptyToNull(streetNumber.value),
        countryId: countryId.value,
        profilePicture: pictureCleared.value ? null : profilePicture.value
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
    profilePicture: string | null;
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
        countryId: countryId.value,
        profilePicture: pictureCleared.value ? null : profilePicture.value
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
        current.countryId !== base.countryId ||
        current.profilePicture !== base.profilePicture
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
        const user = await auth.fetchMe();
        hydrateFromUser(user);
        commitBaseline();
    } catch (e: unknown) {
        profileError.value = e instanceof Error ? e.message : String(e);
    } finally {
        loading.value = false;
    }
}

async function saveProfile() {
    if (profileSaving.value || !isDirty.value) return;
    profileSaving.value = true;
    profileError.value = null;
    profileSuccess.value = null;
    try {
        await auth.updateProfile(buildProfilePayload());
        hydrateFromUser(auth.user);
        commitBaseline();
        profileSuccess.value = 'Profil enregistré.';
    } catch (e: unknown) {
        profileError.value = e instanceof Error ? e.message : String(e);
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
    profileSuccess.value = null;
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

function openFilePicker() {
    pictureError.value = null;
    fileInputRef.value?.click();
}

function onPictureSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowed.includes(file.type)) {
        pictureError.value = 'Formats autorisés : JPG, GIF ou PNG.';
        return;
    }
    if (file.size > 800 * 1024) {
        pictureError.value = 'Taille max. 800 Ko.';
        return;
    }

    revokePreview();
    pictureCleared.value = false;
    picturePreview.value = URL.createObjectURL(file);
}

function resetPicture() {
    revokePreview();
    pictureCleared.value = true;
    pictureError.value = null;
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
    emailError.value = null;
    accountSuccess.value = null;
    accountError.value = null;
    emailOpen.value = true;
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
        await auth.deleteAccount(payload);
    } catch (e: unknown) {
        deleteError.value = e instanceof Error ? e.message : String(e);
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
        deleteError.value = 'Confirmez d’abord votre compte Google, puis cliquez sur Supprimer définitivement.';
        return;
    }
    deleteError.value = 'Saisissez votre mot de passe pour confirmer.';
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
        usernameError.value = 'Le nom d’utilisateur doit faire 3–30 caractères ([a-z0-9._-]).';
        return;
    }

    const withPassword = usernameModalIncludesPassword.value;
    if (withPassword) {
        if (!isValidNewPassword(usernamePassword.value)) {
            usernameError.value = 'Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre.';
            return;
        }
        if (usernamePassword.value !== usernamePasswordConfirm.value) {
            usernameError.value = 'La confirmation ne correspond pas au mot de passe.';
            return;
        }
    }

    usernameSaving.value = true;
    try {
        await auth.setUsername(value);
        username.value = auth.user?.username ?? value;

        if (withPassword) {
            await auth.changePassword(
                null,
                usernamePassword.value,
                `Identifiants créés : connectez-vous avec le nom d’utilisateur « ${value} » et le mot de passe que vous venez de définir.`
            );
            return;
        }

        usernameOpen.value = false;
        accountSuccess.value = 'Nom d’utilisateur mis à jour.';
        accountError.value = null;
    } catch (e: unknown) {
        usernameError.value = e instanceof Error ? e.message : String(e);
    } finally {
        usernameSaving.value = false;
    }
}

async function submitEmailChange() {
    if (emailSaving.value) return;
    emailError.value = null;

    const email = emailDraft.value.trim();
    if (!email || !/.+@.+\..+/.test(email)) {
        emailError.value = 'Saisissez une adresse e-mail valide.';
        return;
    }
    if (!emailCurrentPassword.value) {
        emailError.value = 'Le mot de passe actuel est requis.';
        return;
    }

    emailSaving.value = true;
    try {
        await auth.changeEmail({
            newEmail: email,
            currentPassword: emailCurrentPassword.value,
            googleIdToken: null
        });
        emailOpen.value = false;
        accountSuccess.value = null;
        accountError.value = null;
        await router.push({
            path: '/auth/confirm-email-change',
            query: { email, from: 'app' }
        });
    } catch (e: unknown) {
        emailError.value = e instanceof Error ? e.message : String(e);
    } finally {
        emailSaving.value = false;
    }
}

async function submitPasswordChange() {
    if (passwordSaving.value) return;
    passwordError.value = null;

    if (requiresCurrentPassword.value && !currentPassword.value) {
        passwordError.value = 'Saisissez votre mot de passe actuel.';
        return;
    }
    if (!isValidNewPassword(newPassword.value)) {
        passwordError.value = 'Le nouveau mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre.';
        return;
    }
    if (newPassword.value !== confirmPassword.value) {
        passwordError.value = 'La confirmation ne correspond pas au nouveau mot de passe.';
        return;
    }

    passwordSaving.value = true;
    try {
        await auth.changePassword(requiresCurrentPassword.value ? currentPassword.value : null, newPassword.value);
    } catch (e: unknown) {
        passwordError.value = e instanceof Error ? e.message : String(e);
        passwordSaving.value = false;
    }
}

watch(usernameOpen, (open) => {
    if (!open) usernameError.value = null;
});

watch(emailOpen, (open) => {
    if (!open) emailError.value = null;
});

watch(passwordOpen, (open) => {
    if (!open) passwordError.value = null;
});

watch(deleteOpen, (open) => {
    if (!open) {
        deleteError.value = null;
        deleteGoogleIdToken.value = null;
        deletePassword.value = '';
        deletePasswordExpanded.value = false;
    }
});

onMounted(loadProfile);

onUnmounted(() => {
    revokePreview();
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
        <div v-if="loading && !auth.user" class="d-flex justify-center py-10">
            <v-progress-circular indeterminate color="primary" size="36" />
        </div>

        <v-row v-else class="justify-center py-1" no-gutters>
            <v-col cols="12" md="9" class="pb-4">
                <v-card elevation="10">
                    <v-card-item>
                        <input
                            ref="fileInputRef"
                            type="file"
                            class="d-none"
                            accept="image/jpeg,image/png,image/gif"
                            @change="onPictureSelected"
                        />

                        <div class="d-flex align-center justify-space-between flex-wrap ga-4">
                            <div class="d-flex align-center ga-4 min-w-0">
                                <v-avatar size="72" color="lightprimary" class="flex-shrink-0">
                                    <v-img v-if="avatarSrc" :src="avatarSrc" alt="Photo de profil" cover />
                                    <span v-else class="text-h5 text-primary">{{
                                        (firstName || name || username || '?').charAt(0).toUpperCase()
                                    }}</span>
                                </v-avatar>
                                <div class="min-w-0">
                                    <h4 class="text-h4 mb-0">Photo de profil</h4>
                                    <div class="text-subtitle-1 text-medium-emphasis text-10 mt-1">JPG, GIF ou PNG · max. 800 Ko</div>
                                </div>
                            </div>
                            <div class="d-flex flex-wrap ga-2">
                                <v-btn color="primary" flat @click="openFilePicker">Téléverser</v-btn>
                                <v-btn color="error" variant="outlined" flat @click="resetPicture">Réinitialiser</v-btn>
                            </div>
                        </div>

                        <AppAlert v-if="pictureError" type="warning" class="mt-4" closable @dismiss="pictureError = null">
                            {{ pictureError }}
                        </AppAlert>
                    </v-card-item>
                </v-card>
            </v-col>

            <v-col cols="12" md="9" class="pb-4">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center justify-space-between flex-wrap ga-3">
                            <div class="d-flex align-center ga-3 flex-wrap">
                                <v-avatar size="48" rounded="md" color="lightprimary">
                                    <UserIcon class="text-primary" size="25" />
                                </v-avatar>
                                <h4 class="text-h4 mb-0">Informations personnelles</h4>
                            </div>
                            <div
                                v-if="displayPublicId !== '—'"
                                class="text-subtitle-1 text-medium-emphasis account-public-id"
                                role="button"
                                tabindex="0"
                                @click="copyPublicId"
                                @keydown.enter.prevent="copyPublicId"
                            >
                                <span class="font-weight-medium textPrimary">#{{ displayPublicId }}</span>
                            </div>
                        </div>
                        <div class="text-subtitle-1 text-medium-emphasis text-10 my-3">
                            Enregistrez via la barre d’actions en bas de page.
                        </div>
                        <AppAlert
                            v-if="profileSuccess"
                            color="success"
                            variant="tonal"
                            class="mt-4"
                            closable
                            :dismiss-ms="5000"
                            @dismiss="profileSuccess = null"
                        >
                            {{ profileSuccess }}
                        </AppAlert>
                        <AppAlert v-if="profileError" type="error" class="mt-4" closable @dismiss="profileError = null">
                            {{ profileError }}
                        </AppAlert>
                        <div class="mt-6">
                            <v-row dense>
                                <v-col cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">Prénom</v-label>
                                    <v-text-field v-model="firstName" color="primary" variant="outlined" hide-details />
                                </v-col>
                                <v-col cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">Nom</v-label>
                                    <v-text-field v-model="name" color="primary" variant="outlined" hide-details />
                                </v-col>
                                <v-col cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">Téléphone</v-label>
                                    <v-text-field v-model="phone" color="primary" variant="outlined" type="tel" hide-details />
                                </v-col>
                                <v-col cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">Date de naissance</v-label>
                                    <AppDatePicker v-model="birthDateModel" :max="birthDateMax" color="primary" hide-details />
                                </v-col>
                                <v-col cols="12" md="5">
                                    <v-label class="mb-2 font-weight-medium">Rue</v-label>
                                    <v-text-field v-model="street" color="primary" variant="outlined" hide-details />
                                </v-col>
                                <v-col cols="12" md="2">
                                    <v-label class="mb-2 font-weight-medium">N°</v-label>
                                    <v-text-field v-model="streetNumber" color="primary" variant="outlined" hide-details />
                                </v-col>
                                <v-col cols="12" md="5">
                                    <v-label class="mb-2 font-weight-medium">Pays</v-label>
                                    <v-autocomplete
                                        v-model="countryId"
                                        :items="COUNTRIES"
                                        item-title="name"
                                        item-value="id"
                                        color="primary"
                                        variant="outlined"
                                        hide-details
                                        clearable
                                        auto-select-first
                                    />
                                </v-col>
                            </v-row>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>

            <v-col cols="12" md="9" class="pb-4">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center ga-3 flex-wrap">
                            <v-avatar size="48" rounded="md" color="lightprimary">
                                <LockIcon class="text-primary" size="25" />
                            </v-avatar>
                            <h4 class="text-h4 mb-0">Informations du compte</h4>
                        </div>
                        <div class="text-subtitle-1 text-medium-emphasis text-10 my-3">
                            Identifiants de connexion. Modifiez-les via l’icône crayon.
                        </div>
                        <AppAlert
                            v-if="accountSuccess"
                            color="success"
                            variant="tonal"
                            class="mt-4"
                            closable
                            :dismiss-ms="5000"
                            @dismiss="accountSuccess = null"
                        >
                            {{ accountSuccess }}
                        </AppAlert>
                        <AppAlert v-if="accountError" type="error" class="mt-4" closable @dismiss="accountError = null">
                            {{ accountError }}
                        </AppAlert>
                        <AppAlert v-if="pendingEmail" color="warning" variant="tonal" class="mt-4">
                            Confirmation en attente pour <strong>{{ pendingEmail }}</strong
                            >.
                            <v-btn
                                variant="text"
                                color="warning"
                                size="small"
                                class="ml-1"
                                @click="router.push({ path: '/auth/confirm-email-change', query: { email: pendingEmail, from: 'app' } })"
                            >
                                Saisir le code
                            </v-btn>
                        </AppAlert>
                        <div class="mt-6">
                            <v-row dense>
                                <v-col cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">Nom d’utilisateur</v-label>
                                    <v-text-field
                                        :model-value="displayUsername"
                                        color="primary"
                                        variant="outlined"
                                        hide-details
                                        readonly
                                        class="account-field-editable"
                                        @click="openUsernameModal"
                                    >
                                        <template #append-inner>
                                            <PencilIcon
                                                size="18"
                                                stroke-width="1.5"
                                                class="text-medium-emphasis account-field-edit-icon"
                                                @click.stop="openUsernameModal"
                                            />
                                        </template>
                                    </v-text-field>
                                </v-col>
                                <v-col cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">E-mail</v-label>
                                    <v-text-field
                                        :model-value="displayEmail"
                                        color="primary"
                                        variant="outlined"
                                        hide-details
                                        readonly
                                        class="account-field-editable"
                                        @click="openEmailModal"
                                    >
                                        <template #append-inner>
                                            <PencilIcon
                                                size="18"
                                                stroke-width="1.5"
                                                class="text-medium-emphasis account-field-edit-icon"
                                                @click.stop="openEmailModal"
                                            />
                                        </template>
                                    </v-text-field>
                                </v-col>
                                <v-col v-if="showAccountPasswordField" cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">Mot de passe</v-label>
                                    <v-text-field
                                        model-value="••••••••"
                                        color="primary"
                                        variant="outlined"
                                        hide-details
                                        readonly
                                        class="account-field-editable"
                                        @click="openPasswordModal"
                                    >
                                        <template #append-inner>
                                            <PencilIcon
                                                size="18"
                                                stroke-width="1.5"
                                                class="text-medium-emphasis account-field-edit-icon"
                                                @click.stop="openPasswordModal"
                                            />
                                        </template>
                                    </v-text-field>
                                </v-col>
                            </v-row>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>

            <v-col cols="12" md="9">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center ga-3 flex-wrap">
                            <v-avatar size="48" rounded="md" color="lighterror">
                                <TrashIcon class="text-error" size="25" />
                            </v-avatar>
                            <h4 class="text-h4 mb-0">Zone danger</h4>
                        </div>
                        <div class="text-subtitle-1 text-medium-emphasis text-10 my-3">
                            Cette action est définitive. Toutes vos données seront irrémédiablement effacées.
                        </div>
                        <div class="d-flex align-center justify-space-between flex-wrap ga-3 mt-2">
                            <div class="text-subtitle-1 text-medium-emphasis text-13 pr-4">
                                Vous ne pourrez plus vous connecter ni récupérer votre historique après suppression.
                            </div>
                            <v-btn color="error" flat class="flex-shrink-0" @click="openDeleteModal">Supprimer mon compte</v-btn>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>
        </v-row>

        <AppModalBase
            v-model="usernameOpen"
            :title="usernameModalIncludesPassword ? 'Créer vos identifiants' : 'Modifier le nom d’utilisateur'"
            :subtitle="
                usernameModalIncludesPassword
                    ? 'Choisissez un nom d’utilisateur et un mot de passe pour vous connecter sans Google.'
                    : '3–30 caractères : lettres minuscules, chiffres, . _ -'
            "
            :max-width="440"
            :scrollable="false"
        >
            <form id="account-username-form" @submit.prevent="saveUsername">
                <AppAlert v-if="usernameError" type="error" class="mb-4" closable @dismiss="usernameError = null">
                    {{ usernameError }}
                </AppAlert>
                <v-label class="mb-2 font-weight-medium">Nom d’utilisateur</v-label>
                <v-text-field
                    v-model="usernameDraft"
                    color="primary"
                    variant="outlined"
                    hide-details
                    autofocus
                    :class="usernameModalIncludesPassword ? 'mb-2' : undefined"
                />
                <template v-if="usernameModalIncludesPassword">
                    <div class="text-caption text-medium-emphasis mb-2">3–30 caractères : lettres minuscules, chiffres, . _ -</div>
                    <v-label class="mb-1 font-weight-medium">Mot de passe</v-label>
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
                    <v-label class="mb-1 font-weight-medium">Confirmer le mot de passe</v-label>
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
                <v-btn variant="text" flat :disabled="usernameSaving" @click="close">Annuler</v-btn>
                <v-spacer />
                <v-btn color="primary" flat type="submit" form="account-username-form" :loading="usernameSaving">Enregistrer</v-btn>
            </template>
        </AppModalBase>

        <AppModalBase
            v-model="emailOpen"
            :title="currentEmail ? 'Changer l’e-mail' : 'Ajouter un e-mail'"
            subtitle="Un code de confirmation sera envoyé à la nouvelle adresse."
            :max-width="440"
            :scrollable="false"
        >
            <form id="account-email-form" @submit.prevent="submitEmailChange">
                <AppAlert v-if="emailError" type="error" class="mb-3" closable @dismiss="emailError = null">
                    {{ emailError }}
                </AppAlert>
                <v-label class="mb-1 font-weight-medium">{{ currentEmail ? 'Nouvel e-mail' : 'E-mail' }}</v-label>
                <v-text-field
                    v-model="emailDraft"
                    color="primary"
                    variant="outlined"
                    type="email"
                    autocomplete="email"
                    density="comfortable"
                    hide-details
                    class="mb-2"
                />
                <v-label class="mb-1 font-weight-medium">Mot de passe actuel</v-label>
                <v-text-field
                    v-model="emailCurrentPassword"
                    color="primary"
                    variant="outlined"
                    type="password"
                    autocomplete="current-password"
                    density="comfortable"
                    hide-details
                />
            </form>

            <template #footer="{ close }">
                <v-btn variant="text" flat :disabled="emailSaving" @click="close">Annuler</v-btn>
                <v-spacer />
                <v-btn color="primary" flat type="submit" form="account-email-form" :loading="emailSaving">Continuer</v-btn>
            </template>
        </AppModalBase>

        <AppModalBase
            v-model="passwordOpen"
            :title="requiresCurrentPassword ? 'Modifier le mot de passe' : 'Définir un mot de passe'"
            subtitle="Après changement, toutes les sessions sont invalidées."
            :max-width="440"
            :scrollable="false"
        >
            <form id="account-password-form" @submit.prevent="submitPasswordChange">
                <AppAlert v-if="passwordError" type="error" class="mb-3" closable @dismiss="passwordError = null">
                    {{ passwordError }}
                </AppAlert>
                <template v-if="requiresCurrentPassword">
                    <v-label class="mb-1 font-weight-medium">Mot de passe actuel</v-label>
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
                <v-label class="mb-1 font-weight-medium">Nouveau mot de passe</v-label>
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
                <v-label class="mb-1 font-weight-medium">Confirmer le mot de passe</v-label>
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
                <v-btn variant="text" flat :disabled="passwordSaving" @click="close">Annuler</v-btn>
                <v-spacer />
                <v-btn color="primary" flat type="submit" form="account-password-form" :loading="passwordSaving">Enregistrer</v-btn>
            </template>
        </AppModalBase>

        <AppModalBase
            v-model="saveConfirmOpen"
            title="Enregistrer les modifications"
            subtitle="Les changements seront appliqués à votre profil."
            :max-width="440"
            :scrollable="false"
        >
            <p class="text-body-1 mb-0">Voulez-vous vraiment enregistrer les modifications effectuées ?</p>

            <template #footer="{ close }">
                <v-btn variant="text" flat :disabled="profileSaving" @click="close">Retour</v-btn>
                <v-spacer />
                <v-btn color="primary" flat :loading="profileSaving" @click="confirmSaveProfile">Enregistrer</v-btn>
            </template>
        </AppModalBase>

        <AppModalBase
            v-model="cancelConfirmOpen"
            title="Annuler les modifications"
            subtitle="Les changements non enregistrés seront perdus."
            :max-width="440"
            :scrollable="false"
        >
            <p class="text-body-1 mb-0">Voulez-vous vraiment annuler les modifications effectuées ?</p>

            <template #footer="{ close }">
                <v-btn variant="text" flat :disabled="cancelConfirming" @click="close">Retour</v-btn>
                <v-spacer />
                <v-btn class="bg-lighterror text-error" flat :loading="cancelConfirming" @click="confirmResetProfile">
                    Annuler les modifications
                </v-btn>
            </template>
        </AppModalBase>

        <AppModalBase
            v-model="deleteOpen"
            title="Supprimer définitivement le compte"
            subtitle="Cette action est irréversible."
            :max-width="440"
            :scrollable="false"
        >
            <form id="account-delete-form" @submit.prevent="submitDeleteAccount">
                <AppAlert v-if="deleteError" type="error" class="mb-3" closable @dismiss="deleteError = null">
                    {{ deleteError }}
                </AppAlert>
                <p class="text-body-1 mb-4">
                    Confirmez votre identité pour supprimer définitivement votre compte et toutes les données associées.
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
                        Compte Google vérifié. Cliquez sur « Supprimer définitivement » pour confirmer.
                    </AppAlert>
                    <GoogleSignInButton v-else class="mb-4" @credential="onDeleteGoogleCredential" />
                </template>

                <template v-if="showDeletePassword">
                    <div v-if="showDeleteGoogle && !deleteGoogleIdToken" class="d-flex align-center text-center mb-3">
                        <div class="text-subtitle-2 text-medium-emphasis w-100">ou</div>
                    </div>

                    <v-btn
                        v-if="!deletePasswordExpanded && !deleteGoogleIdToken"
                        variant="text"
                        color="primary"
                        class="mb-2 px-0"
                        @click="deletePasswordExpanded = true"
                    >
                        Utiliser un mot de passe
                    </v-btn>

                    <template v-if="deletePasswordExpanded && !deleteGoogleIdToken">
                        <v-label class="mb-1 font-weight-medium">Mot de passe actuel</v-label>
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
                <v-btn variant="text" flat :disabled="deleteSaving" @click="close">Annuler</v-btn>
                <v-spacer />
                <v-btn
                    color="error"
                    flat
                    type="submit"
                    form="account-delete-form"
                    :loading="deleteSaving"
                    :disabled="!canSubmitDelete && !deleteSaving"
                >
                    Supprimer définitivement
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
</style>
