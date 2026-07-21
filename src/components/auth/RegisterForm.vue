<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/app/stores/auth-store';
import { authApi } from '@/features/auth';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue';

const router = useRouter();
const authStore = useAuthStore();

const valid = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const firstName = ref('');
const name = ref('');
const email = ref('');
const password = ref('');

const emailRules = [(v: string) => !!v || 'L’e-mail est requis', (v: string) => /.+@.+\..+/.test(v) || 'L’e-mail doit être valide'];
const passwordRules = [
    (v: string) => !!v || 'Le mot de passe est requis',
    (v: string) => (v && v.length >= 8) || 'Au moins 8 caractères',
    (v: string) => /[A-Za-z]/.test(v) || 'Doit contenir une lettre',
    (v: string) => /\d/.test(v) || 'Doit contenir un chiffre'
];

async function onSubmit() {
    error.value = null;
    success.value = null;
    loading.value = true;
    try {
        await authApi.register({
            email: email.value,
            password: password.value,
            firstName: firstName.value || undefined,
            name: name.value || undefined
        });
        await router.push({
            path: '/auth/confirm-email',
            query: { email: email.value }
        });
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
    <GoogleSignInButton class="mb-4" label="S’inscrire avec Google" @credential="onGoogleCredential" />

    <div class="d-flex align-center text-center mb-6">
        <div class="text-h6 w-100 px-5 font-weight-regular auth-divider position-relative">
            <span class="bg-surface px-5 py-3 position-relative">ou</span>
        </div>
    </div>

    <v-form v-model="valid" @submit.prevent="onSubmit" class="mt-5">
        <v-label class="text-subtitle-1 font-weight-medium pb-2">Prénom</v-label>
        <VTextField v-model="firstName" class="mb-4" hide-details="auto" autocomplete="given-name" />

        <v-label class="text-subtitle-1 font-weight-medium pb-2">Nom</v-label>
        <VTextField v-model="name" class="mb-4" hide-details="auto" autocomplete="family-name" />

        <v-label class="text-subtitle-1 font-weight-medium pb-2">Adresse e-mail</v-label>
        <VTextField v-model="email" :rules="emailRules" class="mb-4" required hide-details="auto" type="email" autocomplete="email" />

        <v-label class="text-subtitle-1 font-weight-medium pb-2">Mot de passe</v-label>
        <VTextField v-model="password" :rules="passwordRules" required hide-details="auto" type="password" autocomplete="new-password" />

        <v-btn size="large" class="mt-4" color="primary" block type="submit" :loading="loading" :disabled="!valid" flat>
            Créer un compte
        </v-btn>

        <v-alert v-if="error" type="error" class="mt-3" density="compact">{{ error }}</v-alert>
        <v-alert v-if="success" type="success" class="mt-3" density="compact">{{ success }}</v-alert>
    </v-form>
</template>
