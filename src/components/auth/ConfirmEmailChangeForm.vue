<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/features/auth';
import AppAlert from '@/components/shared/AppAlert.vue';
import OtpDigitsInput from '@/components/auth/OtpDigitsInput.vue';

const auth = useAuthStore();
const route = useRoute();

const email = ref('');
const code = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

onMounted(() => {
    const fromQuery = route.query.email;
    if (typeof fromQuery === 'string' && fromQuery.trim()) {
        email.value = fromQuery.trim();
    }
});

async function submit(submittedCode?: string) {
    error.value = null;
    const otp = submittedCode ?? code.value;
    if (otp.length !== 6) {
        error.value = 'Saisissez le code à 6 chiffres.';
        return;
    }
    if (!email.value.trim()) {
        error.value = 'Saisissez le nouvel e-mail.';
        return;
    }
    if (loading.value) return;
    loading.value = true;
    try {
        await auth.confirmEmailChange(email.value.trim(), otp);
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="mt-5">
        <p class="text-subtitle-1 mb-4">Saisissez le code envoyé à votre nouvelle adresse e-mail.</p>
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Nouvel e-mail</v-label>
        <VTextField v-model="email" type="email" class="mb-4" hide-details />
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Saisissez votre code à 6 chiffres</v-label>
        <OtpDigitsInput v-model="code" field-class="confirm-email-change-otp" @complete="submit" />
        <v-btn color="primary" size="large" block flat class="mt-4" :loading="loading" @click="submit">Confirmer</v-btn>
        <AppAlert v-if="error" type="error" class="mt-3">{{ error }}</AppAlert>
    </div>
</template>
