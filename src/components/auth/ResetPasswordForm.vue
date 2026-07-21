<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi } from '@/features/auth';

const route = useRoute();
const router = useRouter();

const token = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const passwordRules = [
    (v: string) => !!v || 'Password is required',
    (v: string) => (v && v.length >= 8) || 'Password must be at least 8 characters',
    (v: string) => /[A-Za-z]/.test(v) || 'Password must contain a letter',
    (v: string) => /\d/.test(v) || 'Password must contain a number'
];

onMounted(() => {
    const q = route.query.token;
    if (typeof q === 'string') {
        token.value = q;
    }
});

async function submit() {
    error.value = null;
    if (!token.value) {
        error.value = 'Missing reset token. Open the link from your email.';
        return;
    }
    if (newPassword.value !== confirmPassword.value) {
        error.value = 'Passwords do not match.';
        return;
    }
    loading.value = true;
    try {
        await authApi.resetPassword(token.value, newPassword.value);
        await router.push({ path: '/auth/login', query: { notice: 'Password updated. Please sign in.' } });
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="mt-5">
        <v-alert v-if="!token" type="warning" density="compact" class="mb-4">
            No reset token found in the URL. Use the link from your email.
        </v-alert>
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">New password</v-label>
        <VTextField
            v-model="newPassword"
            :rules="passwordRules"
            type="password"
            class="mb-4"
            hide-details="auto"
            autocomplete="new-password"
        />
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Confirm password</v-label>
        <VTextField v-model="confirmPassword" type="password" class="mb-4" hide-details="auto" autocomplete="new-password" />
        <v-btn color="primary" size="large" block flat :loading="loading" @click="submit">Reset password</v-btn>
        <v-alert v-if="error" type="error" class="mt-3" density="compact">{{ error }}</v-alert>
    </div>
</template>
