<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const code = ref('');
const loading = ref(false);
const resending = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const codeRules = [(v: string) => !!v, (v: string) => /^\d{6}$/.test(v)];
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

async function confirm() {
    if (!email.value) {
        error.value = 'E-mail manquant. Reprenez l’inscription.';
        return;
    }
    error.value = null;
    success.value = null;
    loading.value = true;
    try {
        await auth.confirmEmail(email.value, code.value);
        success.value = 'E-mail confirmé. Vous pouvez vous connecter.';
        setTimeout(() => router.push('/auth/login'), 800);
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
            <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Code de vérification</v-label>
            <VTextField
                v-model="code"
                :rules="codeRules"
                class="mb-4"
                hide-details
                inputmode="numeric"
                maxlength="6"
                autocomplete="one-time-code"
            />
            <v-btn class="mb-1 text-medium-emphasis" variant="text" size="small" block :loading="resending" @click="resend">
                Renvoyer le code
            </v-btn>
            <v-btn color="primary" size="large" block flat :loading="loading" @click="confirm">Confirmer l’e-mail</v-btn>
        </template>
        <template v-else>
            <v-alert type="warning" density="compact" class="mb-3">
                Aucun e-mail d’inscription trouvé. Reprenez l’inscription ou connectez-vous.
            </v-alert>
            <v-btn color="primary" size="large" block flat to="/auth/register">Retour à l’inscription</v-btn>
        </template>
        <v-alert v-if="success" type="success" class="mt-3" density="compact">{{ success }}</v-alert>
        <v-alert v-if="error" type="error" class="mt-3" density="compact">{{ error }}</v-alert>
    </div>
</template>
