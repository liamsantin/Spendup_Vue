<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/app/stores/auth-store';
import { authApi, isValidUsername, normalizeUsername } from '@/features/auth';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue';

const router = useRouter();
const authStore = useAuthStore();

const formValid = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const identifier = ref('');
const password = ref('');
const confirmPassword = ref('');

const identifierTrimmed = computed(() => identifier.value.trim());
const isEmailMode = computed(() => identifierTrimmed.value.includes('@'));

const identifierRules = [
    (v: string) => !!v.trim() || 'Une adresse email ou un nom d’utilisateur est obligatoire.',
    (v: string) => {
        const value = v.trim();
        if (!value) return true;
        if (value.includes('@')) {
            return /.+@.+\..+/.test(value) || 'L’e-mail doit être valide';
        }
        return isValidUsername(value) || '3–30 caractères : a-z, 0-9, ., _, -';
    }
];
const passwordRules = [
    (v: string) => !!v || 'Le mot de passe est requis',
    (v: string) => (v && v.length >= 8) || 'Au moins 8 caractères',
    (v: string) => /[A-Za-z]/.test(v) || 'Doit contenir une lettre',
    (v: string) => /\d/.test(v) || 'Doit contenir un chiffre'
];
const confirmPasswordRules = [
    (v: string) => !!v || 'La confirmation est requise',
    (v: string) => v === password.value || 'Les mots de passe ne correspondent pas'
];

async function onSubmit() {
    error.value = null;
    success.value = null;

    const value = identifierTrimmed.value;
    if (!value) {
        error.value = 'Une adresse email ou un nom d’utilisateur est obligatoire.';
        return;
    }

    const asEmail = value.includes('@');
    if (asEmail && !/.+@.+\..+/.test(value)) {
        error.value = 'L’e-mail doit être valide.';
        return;
    }
    if (!asEmail && !isValidUsername(value)) {
        error.value = 'Nom d’utilisateur invalide (3–30 caractères : a-z, 0-9, ., _, -).';
        return;
    }
    if (password.value !== confirmPassword.value) {
        error.value = 'Les mots de passe ne correspondent pas.';
        return;
    }

    loading.value = true;
    try {
        const username = asEmail ? null : normalizeUsername(value);
        const result = await authApi.register({
            email: asEmail ? value : null,
            username,
            password: password.value,
            firstName: null,
            name: null
        });

        if (result.email) {
            await router.push({
                path: '/auth/confirm-email',
                query: { email: result.email }
            });
            return;
        }

        await authStore.login(result.username || username || value, password.value);
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        loading.value = false;
    }
}

async function onGoogleCredential(idToken: string) {
    error.value = null;
    try {
        await authStore.loginWithGoogle(idToken);
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    }
}

onMounted(() => {
    success.value = null;
});
</script>

<template>
    <div class="auth-form">
        <GoogleSignInButton class="mb-4" label="S’inscrire avec Google" @credential="onGoogleCredential" />

        <div class="d-flex align-center text-center mb-6">
            <div class="text-h6 w-100 px-5 font-weight-regular auth-divider position-relative">
                <span class="bg-surface px-5 py-3 position-relative">ou</span>
            </div>
        </div>

        <v-form v-model="formValid" @submit.prevent="onSubmit" class="mt-5">
            <v-label class="text-subtitle-1 font-weight-medium pb-2">
                <span :class="{ 'text-primary': isEmailMode && !!identifierTrimmed }">Email</span>
                <span> / </span>
                <span :class="{ 'text-primary': !isEmailMode && !!identifierTrimmed }">Nom d’utilisateur</span>
            </v-label>
            <VTextField v-model="identifier" :rules="identifierRules" class="mb-4" required hide-details="auto" autocomplete="username" />

            <v-label class="text-subtitle-1 font-weight-medium pb-2">Mot de passe</v-label>
            <VTextField
                v-model="password"
                :rules="passwordRules"
                class="mb-4"
                required
                hide-details="auto"
                type="password"
                autocomplete="new-password"
            />

            <v-label class="text-subtitle-1 font-weight-medium pb-2">Confirmation du mot de passe</v-label>
            <VTextField
                v-model="confirmPassword"
                :rules="confirmPasswordRules"
                required
                hide-details="auto"
                type="password"
                autocomplete="new-password"
            />

            <v-btn size="large" class="mt-4" color="primary" block type="submit" :loading="loading" flat>Créer un compte</v-btn>

            <v-alert v-if="error" type="error" class="mt-3" density="compact">{{ error }}</v-alert>
            <v-alert v-if="success" type="success" class="mt-3" density="compact">{{ success }}</v-alert>
        </v-form>
    </div>
</template>

<style scoped>
.auth-form {
    display: block;
    width: 100%;
    box-sizing: border-box;
}
</style>
