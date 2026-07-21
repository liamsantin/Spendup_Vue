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

const emailRules = [(v: string) => !!v || 'E-mail is required', (v: string) => /.+@.+\..+/.test(v) || 'E-mail must be valid'];
const passwordRules = [
    (v: string) => !!v || 'Password is required',
    (v: string) => (v && v.length >= 8) || 'Password must be at least 8 characters',
    (v: string) => /[A-Za-z]/.test(v) || 'Password must contain a letter',
    (v: string) => /\d/.test(v) || 'Password must contain a number'
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
        // Anti-enumeration: register can still succeed with same shape; show API message or neutral
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
    <GoogleSignInButton class="mb-4" label="Sign up with Google" @credential="onGoogleCredential" />

    <div class="d-flex align-center text-center mb-6">
        <div class="text-h6 w-100 px-5 font-weight-regular auth-divider position-relative">
            <span class="bg-surface px-5 py-3 position-relative">or sign up with email</span>
        </div>
    </div>

    <v-form v-model="valid" @submit.prevent="onSubmit" class="mt-5">
        <v-label class="text-subtitle-1 font-weight-medium pb-2">First name</v-label>
        <VTextField v-model="firstName" class="mb-4" hide-details="auto" autocomplete="given-name" />

        <v-label class="text-subtitle-1 font-weight-medium pb-2">Name</v-label>
        <VTextField v-model="name" class="mb-4" hide-details="auto" autocomplete="family-name" />

        <v-label class="text-subtitle-1 font-weight-medium pb-2">Email Address</v-label>
        <VTextField v-model="email" :rules="emailRules" class="mb-4" required hide-details="auto" type="email" autocomplete="email" />

        <v-label class="text-subtitle-1 font-weight-medium pb-2">Password</v-label>
        <VTextField v-model="password" :rules="passwordRules" required hide-details="auto" type="password" autocomplete="new-password" />

        <v-btn size="large" class="mt-4" color="primary" block type="submit" :loading="loading" :disabled="!valid" flat>Sign Up</v-btn>

        <v-alert v-if="error" type="error" class="mt-3" density="compact">{{ error }}</v-alert>
        <v-alert v-if="success" type="success" class="mt-3" density="compact">{{ success }}</v-alert>
    </v-form>
</template>
