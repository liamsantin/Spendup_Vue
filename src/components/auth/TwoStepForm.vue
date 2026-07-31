<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth';
import AppAlert from '@/components/shared/AppAlert.vue';
import OtpDigitsInput from '@/components/auth/OtpDigitsInput.vue';

const router = useRouter();
const authStore = useAuthStore();

const digitsCode = ref('');
const recoveryCode = ref('');
const useRecovery = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);

const code = computed(() => (useRecovery.value ? recoveryCode.value.trim() : digitsCode.value));

async function verify(submittedCode?: string) {
    error.value = null;
    if (!authStore.twoFactorToken) {
        error.value = 'Session 2FA expirée. Veuillez vous reconnecter.';
        return;
    }
    const otp = submittedCode ?? code.value;
    if (!otp || (!useRecovery.value && otp.length !== 6)) {
        error.value = 'Saisissez le code à 6 chiffres.';
        return;
    }
    if (loading.value) return;
    loading.value = true;
    try {
        await authStore.verifyTwoFactor(otp);
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
        if (String(error.value).toLowerCase().includes('token') || String(error.value).toLowerCase().includes('expired')) {
            authStore.twoFactorToken = null;
        }
    } finally {
        loading.value = false;
    }
}

function backToLogin() {
    authStore.twoFactorToken = null;
    router.push('/auth/login');
}
</script>

<template>
    <div class="mt-sm-13 mt-8">
        <template v-if="!useRecovery">
            <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Saisissez votre code à 6 chiffres</v-label>
            <OtpDigitsInput v-model="digitsCode" field-class="two-step-otp" @complete="verify" />
        </template>
        <template v-else>
            <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Code de récupération</v-label>
            <VTextField v-model="recoveryCode" hide-details class="mb-2" autocomplete="one-time-code" />
        </template>

        <v-btn color="primary" size="large" block flat class="mt-4" :loading="loading" @click="verify">Vérifier</v-btn>
        <AppAlert v-if="error" type="error" class="mt-3">{{ error }}</AppAlert>

        <h6 class="text-h6 mt-5 font-weight-regular">
            <template v-if="!useRecovery">
                Utiliser un code de récupération ?
                <a
                    href="#"
                    class="text-primary text-subtitle-1 text-decoration-none pl-1 font-weight-medium"
                    @click.prevent="useRecovery = true"
                >
                    Cliquez ici
                </a>
            </template>
            <template v-else>
                Revenir au code à 6 chiffres ?
                <a
                    href="#"
                    class="text-primary text-subtitle-1 text-decoration-none pl-1 font-weight-medium"
                    @click.prevent="useRecovery = false"
                >
                    Cliquez ici
                </a>
            </template>
        </h6>
        <h6 class="text-h6 mt-3 font-weight-regular">
            Un problème ?
            <a href="#" class="text-primary text-subtitle-1 text-decoration-none pl-1 font-weight-medium" @click.prevent="backToLogin">
                Retour à la connexion
            </a>
        </h6>
    </div>
</template>
