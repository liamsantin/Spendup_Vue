<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { isValidUsername, normalizeUsername, useAuthStore, type Me, type UpdateProfilePayload } from '@/features/auth';
import AppAlert from '@/components/shared/AppAlert.vue';

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
const usernameSuccess = ref<string | null>(null);
const emailError = ref<string | null>(null);
const emailSuccess = ref<string | null>(null);
const passwordError = ref<string | null>(null);

const firstName = ref('');
const name = ref('');
const phone = ref('');
const birthDate = ref('');
const street = ref('');
const streetNumber = ref('');
const profilePicture = ref('');
/** Conservé depuis /me — non éditable tant qu’il n’y a pas de GET /countries. */
const countryId = ref<number | null>(null);

const username = ref('');
const newEmail = ref('');
const emailCurrentPassword = ref('');
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

const avatarSrc = computed(() => profilePicture.value.trim() || undefined);
const currentEmail = computed(() => auth.user?.email ?? null);
const pendingEmail = computed(() => auth.user?.pendingEmail ?? null);

function emptyToNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
}

function hydrateFromUser(user: Me | null) {
    if (!user) {
        firstName.value = '';
        name.value = '';
        phone.value = '';
        birthDate.value = '';
        street.value = '';
        streetNumber.value = '';
        profilePicture.value = '';
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
    profilePicture.value = user.profilePicture ?? '';
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
        profilePicture: emptyToNull(profilePicture.value)
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

function resetPicture() {
    profilePicture.value = '';
}

async function saveUsername() {
    if (usernameSaving.value) return;
    usernameError.value = null;
    usernameSuccess.value = null;

    const value = normalizeUsername(username.value);
    if (!isValidUsername(value)) {
        usernameError.value = 'Le nom d’utilisateur doit faire 3–30 caractères ([a-z0-9._-]).';
        return;
    }

    usernameSaving.value = true;
    try {
        await auth.setUsername(value);
        username.value = auth.user?.username ?? value;
        usernameSuccess.value = 'Nom d’utilisateur mis à jour.';
    } catch (e: unknown) {
        usernameError.value = e instanceof Error ? e.message : String(e);
    } finally {
        usernameSaving.value = false;
    }
}

async function submitEmailChange() {
    if (emailSaving.value) return;
    emailError.value = null;
    emailSuccess.value = null;

    const email = newEmail.value.trim();
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
        emailSuccess.value = 'Code envoyé à la nouvelle adresse.';
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

onMounted(loadProfile);

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
                        <div class="text-subtitle-1 text-medium-emphasis mt-2">
                            Indiquez l’URL de votre photo (pas d’upload fichier pour le moment).
                        </div>
                        <div class="text-center mt-6 mb-6">
                            <v-avatar size="120" color="lightprimary">
                                <v-img v-if="avatarSrc" :src="avatarSrc" alt="Photo de profil" cover />
                                <span v-else class="text-h4 text-primary">{{
                                    (firstName || name || username || '?').charAt(0).toUpperCase()
                                }}</span>
                            </v-avatar>
                        </div>
                        <v-label class="mb-2 font-weight-medium">URL de la photo</v-label>
                        <v-text-field v-model="profilePicture" color="primary" variant="outlined" type="url" hide-details class="mb-4" />
                        <div class="d-flex justify-center">
                            <v-btn color="error" variant="outlined" flat @click="resetPicture">Réinitialiser</v-btn>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>

            <v-col cols="12" sm="6">
                <v-card elevation="10">
                    <v-card-item>
                        <h5 class="text-h5">Modifier le mot de passe</h5>
                        <div class="text-subtitle-1 text-medium-emphasis mt-2">Après changement, toutes les sessions sont invalidées.</div>
                        <AppAlert v-if="passwordError" type="error" class="mt-4" closable @dismiss="passwordError = null">
                            {{ passwordError }}
                        </AppAlert>
                        <div class="mt-5">
                            <v-label class="mb-2 font-weight-medium">Mot de passe actuel</v-label>
                            <v-text-field
                                v-model="currentPassword"
                                color="primary"
                                variant="outlined"
                                type="password"
                                autocomplete="current-password"
                            />
                            <v-label class="mb-2 font-weight-medium">Nouveau mot de passe</v-label>
                            <v-text-field
                                v-model="newPassword"
                                color="primary"
                                variant="outlined"
                                type="password"
                                autocomplete="new-password"
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
                            <v-btn color="primary" class="mt-5" flat :loading="passwordSaving" @click="submitPasswordChange">
                                Changer le mot de passe
                            </v-btn>
                        </div>
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

            <v-col cols="12" md="6">
                <v-card elevation="10">
                    <v-card-item>
                        <h5 class="text-h5">Nom d’utilisateur</h5>
                        <div class="text-subtitle-1 text-medium-emphasis mt-2">
                            3–30 caractères : lettres minuscules, chiffres, `.` `_` `-`.
                        </div>
                        <AppAlert
                            v-if="usernameSuccess"
                            color="success"
                            variant="tonal"
                            class="mt-4"
                            closable
                            :dismiss-ms="5000"
                            @dismiss="usernameSuccess = null"
                        >
                            {{ usernameSuccess }}
                        </AppAlert>
                        <AppAlert v-if="usernameError" type="error" class="mt-4" closable @dismiss="usernameError = null">
                            {{ usernameError }}
                        </AppAlert>
                        <div class="mt-5">
                            <v-label class="mb-2 font-weight-medium">Username</v-label>
                            <v-text-field v-model="username" color="primary" variant="outlined" hide-details class="mb-4" />
                            <v-btn color="primary" flat :loading="usernameSaving" @click="saveUsername">
                                Enregistrer le nom d’utilisateur
                            </v-btn>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>

            <v-col cols="12" md="6">
                <v-card elevation="10">
                    <v-card-item>
                        <h5 class="text-h5">E-mail</h5>
                        <div class="text-subtitle-1 text-medium-emphasis mt-2">
                            {{ currentEmail ? 'Changez votre adresse e-mail.' : 'Ajoutez une adresse e-mail à votre compte.' }}
                        </div>

                        <div v-if="currentEmail" class="mt-4 text-body-1">
                            Adresse actuelle :
                            <span class="font-weight-medium">{{ currentEmail }}</span>
                            <v-chip v-if="auth.user?.emailVerified" size="x-small" color="success" variant="tonal" class="ml-2">
                                Vérifiée
                            </v-chip>
                        </div>

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

                        <AppAlert
                            v-if="emailSuccess"
                            color="success"
                            variant="tonal"
                            class="mt-4"
                            closable
                            :dismiss-ms="5000"
                            @dismiss="emailSuccess = null"
                        >
                            {{ emailSuccess }}
                        </AppAlert>
                        <AppAlert v-if="emailError" type="error" class="mt-4" closable @dismiss="emailError = null">
                            {{ emailError }}
                        </AppAlert>

                        <div class="mt-5">
                            <v-label class="mb-2 font-weight-medium">{{ currentEmail ? 'Nouvel e-mail' : 'E-mail' }}</v-label>
                            <v-text-field v-model="newEmail" color="primary" variant="outlined" type="email" autocomplete="email" />
                            <v-label class="mb-2 font-weight-medium">Mot de passe actuel</v-label>
                            <v-text-field
                                v-model="emailCurrentPassword"
                                color="primary"
                                variant="outlined"
                                type="password"
                                autocomplete="current-password"
                                hide-details
                            />
                            <v-btn color="primary" class="mt-5" flat :loading="emailSaving" @click="submitEmailChange">
                                {{ currentEmail ? 'Changer l’e-mail' : 'Ajouter un e-mail' }}
                            </v-btn>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>
        </v-row>
    </v-card>
</template>
