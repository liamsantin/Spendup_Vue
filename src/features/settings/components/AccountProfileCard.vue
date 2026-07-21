<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '@/app/stores/auth-store';
import { authApi, isValidUsername, normalizeUsername } from '@/features/auth';
import type { TwoFactorSetup } from '@/features/auth';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue';

const auth = useAuthStore();

const loadingProfile = ref(false);
const profileError = ref<string | null>(null);

const usernameDraft = ref('');
const usernameLoading = ref(false);
const usernameMessage = ref<string | null>(null);
const usernameError = ref<string | null>(null);

const currentPassword = ref('');
const newPassword = ref('');
const passwordLoading = ref(false);
const passwordMessage = ref<string | null>(null);
const passwordError = ref<string | null>(null);

const emailPassword = ref('');
const newEmail = ref('');
const emailLoading = ref(false);
const emailMessage = ref<string | null>(null);
const emailError = ref<string | null>(null);
const useGoogleForEmail = ref(false);

const twoFaSetup = ref<TwoFactorSetup | null>(null);
const twoFaCode = ref('');
const twoFaLoading = ref(false);
const twoFaMessage = ref<string | null>(null);
const twoFaError = ref<string | null>(null);

const deletePassword = ref('');
const deleteLoading = ref(false);
const deleteError = ref<string | null>(null);
const deleteConfirm = ref(false);

const unlinkPassword = ref('');
const unlinkLoading = ref(false);
const unlinkError = ref<string | null>(null);
const unlinkMessage = ref<string | null>(null);

const passwordRules = [
    (v: string) => !!v || 'Requis',
    (v: string) => (v && v.length >= 8) || 'Au moins 8 caractères',
    (v: string) => /[A-Za-z]/.test(v) || 'Doit contenir une lettre',
    (v: string) => /\d/.test(v) || 'Doit contenir un chiffre'
];

const usernameRules = [(v: string) => !!v || 'Requis', (v: string) => isValidUsername(v) || '3–30 caractères : a-z, 0-9, ., _, -'];

const qrUrl = computed(() => {
    if (!twoFaSetup.value?.otpAuthUri) return null;
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(twoFaSetup.value.otpAuthUri)}`;
});

const emailChangeTitle = computed(() => (auth.user?.email ? 'Changer l’e-mail' : 'Lier un e-mail'));

async function loadProfile() {
    profileError.value = null;
    loadingProfile.value = true;
    try {
        await auth.fetchMe();
        usernameDraft.value = auth.user?.username ?? '';
    } catch (e: unknown) {
        profileError.value = e instanceof Error ? e.message : String(e);
    } finally {
        loadingProfile.value = false;
    }
}

onMounted(() => {
    void loadProfile();
});

async function saveUsername() {
    usernameError.value = null;
    usernameMessage.value = null;
    const value = normalizeUsername(usernameDraft.value);
    if (!isValidUsername(value)) {
        usernameError.value = 'Nom d’utilisateur invalide (3–30 caractères : a-z, 0-9, ., _, -).';
        return;
    }
    usernameLoading.value = true;
    try {
        const token = await auth.requireAccessToken();
        await authApi.setUsername(token, value);
        usernameMessage.value = 'Nom d’utilisateur mis à jour.';
        await auth.fetchMe();
        usernameDraft.value = auth.user?.username ?? value;
    } catch (e: unknown) {
        usernameError.value = e instanceof Error ? e.message : String(e);
    } finally {
        usernameLoading.value = false;
    }
}

async function changePassword() {
    passwordError.value = null;
    passwordMessage.value = null;
    passwordLoading.value = true;
    try {
        const token = await auth.requireAccessToken();
        await authApi.changePassword(token, currentPassword.value, newPassword.value);
        await auth.forceReLogin('Mot de passe modifié. Veuillez vous reconnecter.');
    } catch (e: unknown) {
        passwordError.value = e instanceof Error ? e.message : String(e);
    } finally {
        passwordLoading.value = false;
    }
}

async function changeEmailWithPassword() {
    emailError.value = null;
    emailMessage.value = null;
    if (!newEmail.value.trim()) {
        emailError.value = 'L’e-mail est requis.';
        return;
    }
    if (!emailPassword.value) {
        emailError.value = 'Le mot de passe est requis.';
        return;
    }
    emailLoading.value = true;
    try {
        const token = await auth.requireAccessToken();
        await authApi.changeEmail(token, {
            newEmail: newEmail.value.trim(),
            currentPassword: emailPassword.value,
            googleIdToken: null
        });
        emailMessage.value = 'Consultez votre nouvelle boîte mail pour le code, puis ouvrez « Confirmer avec le code ».';
    } catch (e: unknown) {
        emailError.value = e instanceof Error ? e.message : String(e);
    } finally {
        emailLoading.value = false;
    }
}

async function changeEmailWithGoogle(idToken: string) {
    emailError.value = null;
    emailMessage.value = null;
    if (!newEmail.value.trim()) {
        emailError.value = 'L’e-mail est requis.';
        return;
    }
    emailLoading.value = true;
    try {
        const token = await auth.requireAccessToken();
        await authApi.changeEmail(token, {
            newEmail: newEmail.value.trim(),
            currentPassword: null,
            googleIdToken: idToken
        });
        emailMessage.value = 'Consultez votre nouvelle boîte mail pour le code, puis ouvrez « Confirmer avec le code ».';
    } catch (e: unknown) {
        emailError.value = e instanceof Error ? e.message : String(e);
    } finally {
        emailLoading.value = false;
    }
}

async function start2faSetup() {
    twoFaError.value = null;
    twoFaMessage.value = null;
    twoFaLoading.value = true;
    try {
        const token = await auth.requireAccessToken();
        twoFaSetup.value = await authApi.setup2fa(token);
        twoFaMessage.value =
            'Scannez le QR code (ou saisissez le secret), puis confirmez avec un code. Enregistrez les codes de récupération maintenant — affichés une seule fois.';
    } catch (e: unknown) {
        twoFaError.value = e instanceof Error ? e.message : String(e);
    } finally {
        twoFaLoading.value = false;
    }
}

async function enable2fa() {
    twoFaError.value = null;
    twoFaLoading.value = true;
    try {
        const token = await auth.requireAccessToken();
        await authApi.enable2fa(token, twoFaCode.value);
        twoFaSetup.value = null;
        twoFaCode.value = '';
        twoFaMessage.value = 'Authentification à deux facteurs activée.';
        await auth.fetchMe();
    } catch (e: unknown) {
        twoFaError.value = e instanceof Error ? e.message : String(e);
    } finally {
        twoFaLoading.value = false;
    }
}

async function disable2fa() {
    twoFaError.value = null;
    twoFaLoading.value = true;
    try {
        const token = await auth.requireAccessToken();
        await authApi.disable2fa(token, twoFaCode.value);
        twoFaCode.value = '';
        twoFaMessage.value = 'Authentification à deux facteurs désactivée.';
        await auth.fetchMe();
    } catch (e: unknown) {
        twoFaError.value = e instanceof Error ? e.message : String(e);
    } finally {
        twoFaLoading.value = false;
    }
}

function downloadRecoveryCodes() {
    if (!twoFaSetup.value?.recoveryCodes?.length) return;
    const blob = new Blob([twoFaSetup.value.recoveryCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spendup-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
}

async function unlinkGoogle() {
    unlinkError.value = null;
    unlinkMessage.value = null;
    unlinkLoading.value = true;
    try {
        const token = await auth.requireAccessToken();
        await authApi.unlinkGoogle(token, unlinkPassword.value);
        unlinkMessage.value = 'Compte Google détaché.';
        unlinkPassword.value = '';
        await auth.fetchMe();
    } catch (e: unknown) {
        unlinkError.value = e instanceof Error ? e.message : String(e);
    } finally {
        unlinkLoading.value = false;
    }
}

async function deleteWithPassword() {
    deleteError.value = null;
    deleteLoading.value = true;
    try {
        const token = await auth.requireAccessToken();
        await authApi.deleteAccount(token, { currentPassword: deletePassword.value });
        auth.clearSession();
        await auth.forceReLogin('Compte supprimé.');
    } catch (e: unknown) {
        deleteError.value = e instanceof Error ? e.message : String(e);
    } finally {
        deleteLoading.value = false;
    }
}

async function deleteWithGoogle(idToken: string) {
    deleteError.value = null;
    deleteLoading.value = true;
    try {
        const token = await auth.requireAccessToken();
        await authApi.deleteAccount(token, { googleIdToken: idToken });
        auth.clearSession();
        await auth.forceReLogin('Compte supprimé.');
    } catch (e: unknown) {
        deleteError.value = e instanceof Error ? e.message : String(e);
    } finally {
        deleteLoading.value = false;
    }
}
</script>

<template>
    <div class="d-flex flex-column ga-4">
        <UiParentCard title="Profil">
            <div v-if="loadingProfile" class="text-body-2">Chargement…</div>
            <v-alert v-else-if="profileError" type="error" density="compact">{{ profileError }}</v-alert>
            <v-list v-else lines="two" class="bg-transparent pa-0">
                <v-list-item>
                    <v-list-item-title class="text-subtitle-2 text-medium-emphasis">Nom d’utilisateur</v-list-item-title>
                    <v-list-item-subtitle class="text-body-1 textPrimary">{{ auth.user?.username ?? '—' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                    <v-list-item-title class="text-subtitle-2 text-medium-emphasis">E-mail</v-list-item-title>
                    <v-list-item-subtitle class="text-body-1 textPrimary">{{ auth.user?.email ?? '—' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                    <v-list-item-title class="text-subtitle-2 text-medium-emphasis">Nom affiché</v-list-item-title>
                    <v-list-item-subtitle class="text-body-1 textPrimary">{{ auth.displayName || '—' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                    <v-list-item-title class="text-subtitle-2 text-medium-emphasis">E-mail vérifié</v-list-item-title>
                    <v-list-item-subtitle class="text-body-1 textPrimary">{{
                        auth.user?.email ? (auth.user.emailVerified ? 'Oui' : 'Non') : '—'
                    }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                    <v-list-item-title class="text-subtitle-2 text-medium-emphasis">2FA</v-list-item-title>
                    <v-list-item-subtitle class="text-body-1 textPrimary">
                        {{ auth.user?.twoFactorEnabled ? 'Activée' : 'Désactivée' }}
                    </v-list-item-subtitle>
                </v-list-item>
            </v-list>

            <v-alert v-if="!auth.hasVerifiedEmail" type="info" density="compact" class="mt-3" variant="tonal">
                Sans e-mail vérifié, la réinitialisation de mot de passe n’est pas disponible. Liez un e-mail ci-dessous.
            </v-alert>

            <v-btn color="error" variant="tonal" class="text-none mt-4" @click="auth.logout()">Se déconnecter</v-btn>
        </UiParentCard>

        <UiParentCard title="Nom d’utilisateur">
            <v-label class="text-subtitle-2 pb-1">Nom d’utilisateur</v-label>
            <VTextField
                v-model="usernameDraft"
                :rules="usernameRules"
                class="mb-3"
                hide-details="auto"
                hint="3–30 caractères : a-z, 0-9, ., _, -"
                persistent-hint
            />
            <v-btn color="primary" class="text-none" :loading="usernameLoading" @click="saveUsername">Enregistrer</v-btn>
            <v-alert v-if="usernameError" type="error" class="mt-3" density="compact">{{ usernameError }}</v-alert>
            <v-alert v-if="usernameMessage" type="success" class="mt-3" density="compact">{{ usernameMessage }}</v-alert>
        </UiParentCard>

        <UiParentCard title="Changer le mot de passe">
            <v-label class="text-subtitle-2 pb-1">Mot de passe actuel</v-label>
            <VTextField v-model="currentPassword" type="password" class="mb-3" hide-details="auto" autocomplete="current-password" />
            <v-label class="text-subtitle-2 pb-1">Nouveau mot de passe</v-label>
            <VTextField
                v-model="newPassword"
                :rules="passwordRules"
                type="password"
                class="mb-3"
                hide-details="auto"
                autocomplete="new-password"
            />
            <v-btn color="primary" class="text-none" :loading="passwordLoading" @click="changePassword">Mettre à jour</v-btn>
            <v-alert v-if="passwordError" type="error" class="mt-3" density="compact">{{ passwordError }}</v-alert>
            <v-alert v-if="passwordMessage" type="success" class="mt-3" density="compact">{{ passwordMessage }}</v-alert>
        </UiParentCard>

        <UiParentCard :title="emailChangeTitle">
            <v-label class="text-subtitle-2 pb-1">Nouvel e-mail</v-label>
            <VTextField v-model="newEmail" type="email" class="mb-3" hide-details="auto" />

            <v-switch
                v-model="useGoogleForEmail"
                color="primary"
                hide-details
                class="mb-3"
                label="Prouver l’identité avec Google (compte Google-only)"
            />

            <template v-if="!useGoogleForEmail">
                <v-label class="text-subtitle-2 pb-1">Mot de passe actuel</v-label>
                <VTextField v-model="emailPassword" type="password" class="mb-3" hide-details="auto" />
                <v-btn color="primary" class="text-none" :loading="emailLoading" @click="changeEmailWithPassword">
                    Demander le changement
                </v-btn>
            </template>
            <template v-else>
                <p class="text-body-2 mb-2">Confirmez avec Google, puis validez le code reçu par e-mail.</p>
                <GoogleSignInButton @credential="changeEmailWithGoogle" />
            </template>

            <v-btn variant="text" class="text-none ml-2" to="/auth/confirm-email-change">Confirmer avec le code</v-btn>
            <v-alert v-if="emailError" type="error" class="mt-3" density="compact">{{ emailError }}</v-alert>
            <v-alert v-if="emailMessage" type="success" class="mt-3" density="compact">{{ emailMessage }}</v-alert>
        </UiParentCard>

        <UiParentCard title="Authentification à deux facteurs">
            <template v-if="!auth.user?.twoFactorEnabled">
                <v-btn color="primary" class="text-none mb-3" :loading="twoFaLoading" @click="start2faSetup">Configurer 2FA</v-btn>
                <div v-if="twoFaSetup" class="mt-2">
                    <img v-if="qrUrl" :src="qrUrl" alt="QR 2FA" width="180" height="180" class="mb-3" />
                    <p class="text-body-2 mb-1">Secret (saisie manuelle) :</p>
                    <code class="text-body-2">{{ twoFaSetup.secret }}</code>
                    <p class="text-body-2 mt-4 mb-1">Codes de récupération (une seule fois) :</p>
                    <ul class="mb-3">
                        <li v-for="c in twoFaSetup.recoveryCodes" :key="c">
                            <code>{{ c }}</code>
                        </li>
                    </ul>
                    <v-btn size="small" variant="tonal" class="text-none mb-4" @click="downloadRecoveryCodes">Télécharger</v-btn>
                    <v-label class="text-subtitle-2 pb-1 d-block">Code Authenticator</v-label>
                    <VTextField v-model="twoFaCode" class="mb-3" hide-details="auto" maxlength="6" inputmode="numeric" />
                    <v-btn color="primary" class="text-none" :loading="twoFaLoading" @click="enable2fa">Activer</v-btn>
                </div>
            </template>
            <template v-else>
                <v-label class="text-subtitle-2 pb-1">Code pour désactiver</v-label>
                <VTextField v-model="twoFaCode" class="mb-3" hide-details="auto" />
                <v-btn color="warning" class="text-none" :loading="twoFaLoading" @click="disable2fa">Désactiver 2FA</v-btn>
            </template>
            <v-alert v-if="twoFaError" type="error" class="mt-3" density="compact">{{ twoFaError }}</v-alert>
            <v-alert v-if="twoFaMessage" type="info" class="mt-3" density="compact">{{ twoFaMessage }}</v-alert>
        </UiParentCard>

        <UiParentCard title="Compte Google">
            <v-label class="text-subtitle-2 pb-1">Mot de passe pour détacher Google</v-label>
            <VTextField v-model="unlinkPassword" type="password" class="mb-3" hide-details="auto" />
            <v-btn color="secondary" class="text-none" :loading="unlinkLoading" @click="unlinkGoogle">Détacher Google</v-btn>
            <v-alert v-if="unlinkError" type="error" class="mt-3" density="compact">{{ unlinkError }}</v-alert>
            <v-alert v-if="unlinkMessage" type="success" class="mt-3" density="compact">{{ unlinkMessage }}</v-alert>
        </UiParentCard>

        <UiParentCard title="Supprimer le compte">
            <v-checkbox v-model="deleteConfirm" color="error" hide-details label="Je comprends que cette action est irréversible" />
            <div v-if="deleteConfirm" class="mt-3">
                <v-label class="text-subtitle-2 pb-1">Mot de passe</v-label>
                <VTextField v-model="deletePassword" type="password" class="mb-3" hide-details="auto" />
                <v-btn color="error" class="text-none mb-4" :loading="deleteLoading" @click="deleteWithPassword">
                    Supprimer avec mot de passe
                </v-btn>
                <p class="text-subtitle-2 mb-2">Ou confirmer via Google (compte Google-only) :</p>
                <GoogleSignInButton @credential="deleteWithGoogle" />
            </div>
            <v-alert v-if="deleteError" type="error" class="mt-3" density="compact">{{ deleteError }}</v-alert>
        </UiParentCard>
    </div>
</template>
