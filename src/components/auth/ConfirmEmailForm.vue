<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi } from '@/features/auth';

const route = useRoute();
const router = useRouter();

const email = ref('');
const code = ref('');
const loading = ref(false);
const resending = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const emailRules = [(v: string) => !!v || 'E-mail is required', (v: string) => /.+@.+\..+/.test(v) || 'E-mail must be valid'];
const codeRules = [(v: string) => !!v || 'Code is required', (v: string) => /^\d{6}$/.test(v) || 'Enter the 6-digit code'];

onMounted(() => {
    const q = route.query.email;
    if (typeof q === 'string') {
        email.value = q;
    }
});

async function confirm() {
    error.value = null;
    success.value = null;
    loading.value = true;
    try {
        await authApi.confirmEmail({ email: email.value, code: code.value });
        success.value = 'Email confirmed. You can sign in now.';
        setTimeout(() => router.push('/auth/login'), 800);
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        loading.value = false;
    }
}

async function resend() {
    error.value = null;
    success.value = null;
    resending.value = true;
    try {
        await authApi.resendVerification(email.value);
        success.value = 'If an account exists for this email, a new code was sent.';
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        resending.value = false;
    }
}
</script>

<template>
    <div class="mt-5">
        <p class="text-subtitle-1 mb-4">Enter the 6-digit code we sent to your email. Check your inbox (and spam folder).</p>
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Email</v-label>
        <VTextField v-model="email" :rules="emailRules" class="mb-4" hide-details="auto" type="email" autocomplete="email" />
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Verification code</v-label>
        <VTextField v-model="code" :rules="codeRules" class="mb-4" hide-details="auto" inputmode="numeric" maxlength="6" />
        <v-btn color="primary" size="large" block flat :loading="loading" @click="confirm">Confirm email</v-btn>
        <v-btn class="mt-3" variant="text" block :loading="resending" @click="resend">Resend code</v-btn>
        <v-alert v-if="success" type="success" class="mt-3" density="compact">{{ success }}</v-alert>
        <v-alert v-if="error" type="error" class="mt-3" density="compact">{{ error }}</v-alert>
    </div>
</template>
