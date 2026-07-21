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

const emailRules = [(v: string) => !!v, (v: string) => /.+@.+\..+/.test(v)];
const codeRules = [(v: string) => !!v, (v: string) => /^\d{6}$/.test(v)];

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
        success.value = 'E-mail confirmé. Vous pouvez vous connecter.';
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
        success.value = 'Si un compte existe pour cet e-mail, un nouveau code a été envoyé.';
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        resending.value = false;
    }
}
</script>

<template>
    <div class="mt-5">
        <p class="text-subtitle-1 mb-4">
            Saisissez le code à 6 chiffres envoyé par e-mail. Vérifiez votre boîte de réception (et les spams).
        </p>
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">E-mail</v-label>
        <VTextField v-model="email" :rules="emailRules" class="mb-4" hide-details type="email" autocomplete="email" />
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Code de vérification</v-label>
        <VTextField v-model="code" :rules="codeRules" class="mb-4" hide-details inputmode="numeric" maxlength="6" />
        <v-btn color="primary" size="large" block flat :loading="loading" @click="confirm">Confirmer l’e-mail</v-btn>
        <v-btn class="mt-3" variant="text" block :loading="resending" @click="resend">Renvoyer le code</v-btn>
        <v-alert v-if="success" type="success" class="mt-3" density="compact">{{ success }}</v-alert>
        <v-alert v-if="error" type="error" class="mt-3" density="compact">{{ error }}</v-alert>
    </div>
</template>
