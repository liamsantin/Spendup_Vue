<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { isValidUsername, normalizeUsername, useAuthStore, type Me, type UpdateProfilePayload } from '@/features/auth';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppModalBase from '@/components/shared/AppModalBase.vue';

const auth = useAuthStore();
const router = useRouter();

const loading = ref(false);
const profileSaving = ref(false);
const usernameSaving = ref(false);
const emailSaving = ref(false);
const passwordSaving = ref(false);

const profileError = ref<string | null>(null);
const profileSuccess = ref<string | null>(null);
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
/** Conservé depuis /me — non éditable tant qu’il n’y a pas de GET /countries. */
const countryId = ref<number | null>(null);

const username = ref('');
const usernameDraft = ref('');
const usernameOpen = ref(false);

const emailDraft = ref('');
const emailCurrentPassword = ref('');
const emailOpen = ref(false);

const passwordOpen = ref(false);
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

const fileInputRef = ref<HTMLInputElement | null>(null);

const avatarSrc = computed(() => {
    if (pictureCleared.value) return undefined;
    return picturePreview.value || profilePicture.value || undefined;
});
const currentEmail = computed(() => auth.user?.email ?? null);
const pendingEmail = computed(() => auth.user?.pendingEmail ?? null);
const displayUsername = computed(() => username.value || '—');
const displayEmail = computed(() => currentEmail.value || '—');

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

async function loadProfile() {
    loading.value = true;
    profileError.value = null;
    try {
        const user = await auth.fetchMe();
        hydrateFromUser(user);
    } catch (e: unknown) {
        profileError.value = e instanceof Error ? e.message : String(e);
    } finally {
        loading.value = false;
    }
}

async function saveProfile() {
    if (profileSaving.value) return;
    profileSaving.value = true;
    profileError.value = null;
    profileSuccess.value = null;
    try {
        await auth.updateProfile(buildProfilePayload());
        hydrateFromUser(auth.user);
        profileSuccess.value = 'Profil enregistré.';
    } catch (e: unknown) {
        profileError.value = e instanceof Error ? e.message : String(e);
        throw e;
    } finally {
        profileSaving.value = false;
    }
}

async function resetProfile() {
    profileError.value = null;
    profileSuccess.value = null;
    await loadProfile();
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
    usernameError.value = null;
    usernameOpen.value = true;
}

function openEmailModal() {
    emailDraft.value = '';
    emailCurrentPassword.value = '';
    emailError.value = null;
    emailOpen.value = true;
}

function openPasswordModal() {
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    passwordError.value = null;
    passwordOpen.value = true;
}

async function saveUsername() {
    if (usernameSaving.value) return;
    usernameError.value = null;

    const value = normalizeUsername(usernameDraft.value);
    if (!isValidUsername(value)) {
        usernameError.value = 'Le nom d’utilisateur doit faire 3–30 caractères ([a-z0-9._-]).';
        return;
    }

    usernameSaving.value = true;
    try {
        await auth.setUsername(value);
        username.value = auth.user?.username ?? value;
        usernameOpen.value = false;
        profileSuccess.value = 'Nom d’utilisateur mis à jour.';
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
        await router.push({
            path: '/auth/confirm-email-change',
            query: { email }
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

    if (!currentPassword.value) {
        passwordError.value = 'Saisissez votre mot de passe actuel.';
        return;
    }
    if (newPassword.value.length < 8 || !/[A-Za-z]/.test(newPassword.value) || !/\d/.test(newPassword.value)) {
        passwordError.value = 'Le nouveau mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre.';
        return;
    }
    if (newPassword.value !== confirmPassword.value) {
        passwordError.value = 'La confirmation ne correspond pas au nouveau mot de passe.';
        return;
    }

    passwordSaving.value = true;
    try {
        await auth.changePassword(currentPassword.value, newPassword.value);
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

onMounted(loadProfile);

onUnmounted(() => {
    revokePreview();
});

defineExpose({
    saveProfile,
    resetProfile,
    get loading() {
        return profileSaving.value || loading.value;
    }
});
</script>

<template>
    <v-card elevation="10">
        <div v-if="loading && !auth.user" class="d-flex justify-center py-10">
            <v-progress-circular indeterminate color="primary" size="36" />
        </div>

        <v-row v-else class="ma-sm-n2 ma-n1">
            <v-col cols="12" sm="6">
                <v-card elevation="10">
                    <v-card-item>
                        <h5 class="text-h5">Photo de profil</h5>
                        <div class="text-subtitle-1 text-medium-emphasis mt-2">Changez votre photo de profil ici</div>
                        <div class="text-center mt-6 mb-6">
                            <v-avatar size="120" color="lightprimary">
                                <v-img v-if="avatarSrc" :src="avatarSrc" alt="Photo de profil" cover />
                                <span v-else class="text-h4 text-primary">{{
                                    (firstName || name || username || '?').charAt(0).toUpperCase()
                                }}</span>
                            </v-avatar>
                        </div>
                        <input
                            ref="fileInputRef"
                            type="file"
                            class="d-none"
                            accept="image/jpeg,image/png,image/gif"
                            @change="onPictureSelected"
                        />
                        <div class="d-flex justify-center">
                            <v-btn color="primary" class="mx-2" flat @click="openFilePicker">Téléverser</v-btn>
                            <v-btn color="error" class="mx-2" variant="outlined" flat @click="resetPicture">Réinitialiser</v-btn>
                        </div>
                        <div class="text-subtitle-1 text-medium-emphasis text-center my-sm-8 my-6">
                            JPG, GIF ou PNG autorisés. Taille max. 800 Ko
                        </div>
                        <AppAlert v-if="pictureError" type="warning" class="mt-2" closable @dismiss="pictureError = null">
                            {{ pictureError }}
                        </AppAlert>
                    </v-card-item>
                </v-card>
            </v-col>

            <v-col cols="12">
                <v-card elevation="10">
                    <v-card-item>
                        <h5 class="text-h5">Informations personnelles</h5>
                        <div class="text-subtitle-1 text-medium-emphasis mt-2">Enregistrez via la barre d’actions en bas de page.</div>
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
                        <AppAlert v-if="pendingEmail" color="warning" variant="tonal" class="mt-4">
                            Confirmation en attente pour <strong>{{ pendingEmail }}</strong
                            >.
                            <v-btn
                                variant="text"
                                color="warning"
                                size="small"
                                class="ml-1"
                                @click="router.push({ path: '/auth/confirm-email-change', query: { email: pendingEmail } })"
                            >
                                Saisir le code
                            </v-btn>
                        </AppAlert>
                        <div class="mt-5">
                            <v-row>
                                <v-col cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">Prénom</v-label>
                                    <v-text-field v-model="firstName" color="primary" variant="outlined" hide-details />
                                </v-col>
                                <v-col cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">Nom</v-label>
                                    <v-text-field v-model="name" color="primary" variant="outlined" hide-details />
                                </v-col>
                                <v-col cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">Nom d’utilisateur</v-label>
                                    <div class="d-flex align-center ga-2">
                                        <v-text-field
                                            :model-value="displayUsername"
                                            color="primary"
                                            variant="outlined"
                                            hide-details
                                            readonly
                                            class="flex-grow-1"
                                        />
                                        <v-btn color="primary" variant="tonal" flat class="flex-shrink-0" @click="openUsernameModal">
                                            Modifier
                                        </v-btn>
                                    </div>
                                </v-col>
                                <v-col cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">E-mail</v-label>
                                    <div class="d-flex align-center ga-2">
                                        <v-text-field
                                            :model-value="displayEmail"
                                            color="primary"
                                            variant="outlined"
                                            hide-details
                                            readonly
                                            class="flex-grow-1"
                                        />
                                        <v-btn color="primary" variant="tonal" flat class="flex-shrink-0" @click="openEmailModal">
                                            Modifier
                                        </v-btn>
                                    </div>
                                </v-col>
                                <v-col cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">Mot de passe</v-label>
                                    <div class="d-flex align-center ga-2">
                                        <v-text-field
                                            model-value="••••••••"
                                            color="primary"
                                            variant="outlined"
                                            hide-details
                                            readonly
                                            class="flex-grow-1"
                                        />
                                        <v-btn color="primary" variant="tonal" flat class="flex-shrink-0" @click="openPasswordModal">
                                            Modifier
                                        </v-btn>
                                    </div>
                                </v-col>
                                <v-col cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">Téléphone</v-label>
                                    <v-text-field v-model="phone" color="primary" variant="outlined" type="tel" hide-details />
                                </v-col>
                                <v-col cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">Date de naissance</v-label>
                                    <v-text-field v-model="birthDate" color="primary" variant="outlined" type="date" hide-details />
                                </v-col>
                                <v-col cols="12" md="8">
                                    <v-label class="mb-2 font-weight-medium">Rue</v-label>
                                    <v-text-field v-model="street" color="primary" variant="outlined" hide-details />
                                </v-col>
                                <v-col cols="12" md="4">
                                    <v-label class="mb-2 font-weight-medium">N°</v-label>
                                    <v-text-field v-model="streetNumber" color="primary" variant="outlined" hide-details />
                                </v-col>
                            </v-row>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>
        </v-row>

        <AppModalBase
            v-model="usernameOpen"
            title="Modifier le nom d’utilisateur"
            subtitle="3–30 caractères : lettres minuscules, chiffres, . _ -"
            :max-width="440"
            :scrollable="false"
        >
            <AppAlert v-if="usernameError" type="error" class="mb-4" closable @dismiss="usernameError = null">
                {{ usernameError }}
            </AppAlert>
            <v-label class="mb-2 font-weight-medium">Nom d’utilisateur</v-label>
            <v-text-field v-model="usernameDraft" color="primary" variant="outlined" hide-details autofocus />

            <template #footer="{ close }">
                <v-btn variant="text" flat :disabled="usernameSaving" @click="close">Annuler</v-btn>
                <v-spacer />
                <v-btn color="primary" flat :loading="usernameSaving" @click="saveUsername">Enregistrer</v-btn>
            </template>
        </AppModalBase>

        <AppModalBase
            v-model="emailOpen"
            :title="currentEmail ? 'Changer l’e-mail' : 'Ajouter un e-mail'"
            subtitle="Un code de confirmation sera envoyé à la nouvelle adresse."
            :max-width="440"
            :scrollable="false"
        >
            <AppAlert v-if="emailError" type="error" class="mb-4" closable @dismiss="emailError = null">
                {{ emailError }}
            </AppAlert>
            <v-label class="mb-2 font-weight-medium">{{ currentEmail ? 'Nouvel e-mail' : 'E-mail' }}</v-label>
            <v-text-field v-model="emailDraft" color="primary" variant="outlined" type="email" autocomplete="email" class="mb-4" />
            <v-label class="mb-2 font-weight-medium">Mot de passe actuel</v-label>
            <v-text-field
                v-model="emailCurrentPassword"
                color="primary"
                variant="outlined"
                type="password"
                autocomplete="current-password"
                hide-details
            />

            <template #footer="{ close }">
                <v-btn variant="text" flat :disabled="emailSaving" @click="close">Annuler</v-btn>
                <v-spacer />
                <v-btn color="primary" flat :loading="emailSaving" @click="submitEmailChange">Continuer</v-btn>
            </template>
        </AppModalBase>

        <AppModalBase
            v-model="passwordOpen"
            title="Modifier le mot de passe"
            subtitle="Après changement, toutes les sessions sont invalidées."
            :max-width="440"
            :scrollable="false"
        >
            <AppAlert v-if="passwordError" type="error" class="mb-4" closable @dismiss="passwordError = null">
                {{ passwordError }}
            </AppAlert>
            <v-label class="mb-2 font-weight-medium">Mot de passe actuel</v-label>
            <v-text-field
                v-model="currentPassword"
                color="primary"
                variant="outlined"
                type="password"
                autocomplete="current-password"
                class="mb-4"
            />
            <v-label class="mb-2 font-weight-medium">Nouveau mot de passe</v-label>
            <v-text-field
                v-model="newPassword"
                color="primary"
                variant="outlined"
                type="password"
                autocomplete="new-password"
                class="mb-4"
            />
            <v-label class="mb-2 font-weight-medium">Confirmer le mot de passe</v-label>
            <v-text-field
                v-model="confirmPassword"
                color="primary"
                variant="outlined"
                type="password"
                autocomplete="new-password"
                hide-details
            />

            <template #footer="{ close }">
                <v-btn variant="text" flat :disabled="passwordSaving" @click="close">Annuler</v-btn>
                <v-spacer />
                <v-btn color="primary" flat :loading="passwordSaving" @click="submitPasswordChange">Enregistrer</v-btn>
            </template>
        </AppModalBase>
    </v-card>
</template>
