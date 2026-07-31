<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/features/auth';
import AppAlert from '@/components/shared/AppAlert.vue';
import OtpDigitsInput from '@/components/auth/OtpDigitsInput.vue';

const route = useRoute();
const auth = useAuthStore();

const email = ref('');
const code = ref('');
const loading = ref(false);
const resending = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const hasEmail = computed(() => !!email.value);

onMounted(() => {
    const q = route.query.email;
    if (typeof q === 'string' && q.trim()) {
        email.value = q.trim();
        return;
    }
    if (auth.pendingEmail) {
        email.value = auth.pendingEmail;
    }
});

async function confirm(submittedCode?: string) {
    if (!email.value) {
        error.value = 'E-mail manquant. Reprenez l’inscription.';
        return;
    }
    const otp = submittedCode ?? code.value;
    if (otp.length !== 6) {
        error.value = 'Saisissez le code à 6 chiffres.';
        return;
    }
    if (loading.value) return;
    error.value = null;
    success.value = null;
    loading.value = true;
    try {
        await auth.confirmEmail(email.value, otp);
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        loading.value = false;
    }
}

async function resend() {
    if (!email.value) {
        error.value = 'E-mail manquant. Reprenez l’inscription.';
        return;
    }
    error.value = null;
    success.value = null;
    resending.value = true;
    try {
        await auth.resendVerification(email.value);
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
        <template v-if="hasEmail">
            <p class="text-subtitle-1 mb-4">
                Un code à 6 chiffres a été envoyé à
                <strong class="textPrimary">{{ email }}</strong
                >. Vérifiez votre boîte de réception (et les spams).
            </p>
            <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Saisissez votre code à 6 chiffres</v-label>
            <OtpDigitsInput v-model="code" field-class="confirm-email-otp" @complete="confirm" />
            <v-btn class="mb-1 text-medium-emphasis" variant="text" size="small" block :loading="resending" @click="resend">
                Renvoyer le code
            </v-btn>
            <v-btn color="primary" size="large" block flat :loading="loading" @click="confirm">Confirmer l’e-mail</v-btn>
        </template>
        <template v-else>
            <AppAlert type="warning" class="mb-3"> Aucun e-mail d’inscription trouvé. Reprenez l’inscription ou connectez-vous. </AppAlert>
            <v-btn color="primary" size="large" block flat to="/auth/register">Retour à l’inscription</v-btn>
        </template>
        <AppAlert v-if="success" type="success" class="mt-3">{{ success }}</AppAlert>
        <AppAlert v-if="error" type="error" class="mt-3">{{ error }}</AppAlert>
    </div>
</template>
