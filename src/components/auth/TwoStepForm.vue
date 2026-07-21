<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/app/stores/auth-store';

const router = useRouter();
const authStore = useAuthStore();

const digits = ref(['', '', '', '', '', '']);
const recoveryCode = ref('');
const useRecovery = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);

const code = computed(() => (useRecovery.value ? recoveryCode.value.trim() : digits.value.join('')));

async function verify() {
    error.value = null;
    if (!authStore.twoFactorToken) {
        error.value = 'Session 2FA expirée. Veuillez vous reconnecter.';
        return;
    }
    if (!code.value) {
        error.value = 'Saisissez votre code de vérification.';
        return;
    }
    loading.value = true;
    try {
        await authStore.verifyTwoFactor(code.value);
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
        if (String(error.value).toLowerCase().includes('token') || String(error.value).toLowerCase().includes('expired')) {
            authStore.twoFactorToken = null;
        }
    } finally {
        loading.value = false;
    }
}

function onDigitInput(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(-1);
    digits.value[index] = value;
    if (value && index < 5) {
        const next = input.closest('.verification')?.querySelectorAll('input')[index + 1] as HTMLInputElement | undefined;
        next?.focus();
    }
}

function backToLogin() {
    authStore.twoFactorToken = null;
    router.push('/auth/login');
}
</script>

<template>
    <div class="mt-sm-13 mt-8">
        <v-switch v-model="useRecovery" color="primary" hide-details class="mb-4" label="Utiliser un code de récupération" />

        <template v-if="!useRecovery">
            <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Code à 6 chiffres</v-label>
            <div class="d-flex justify-space-between gap-3 mb-2 verification">
                <VTextField
                    v-for="(_, i) in digits"
                    :key="i"
                    :model-value="digits[i]"
                    maxlength="1"
                    inputmode="numeric"
                    hide-details
                    @update:model-value="(v: string) => (digits[i] = String(v).replace(/\D/g, '').slice(-1))"
                    @input="onDigitInput(i, $event)"
                />
            </div>
        </template>
        <template v-else>
            <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Code de récupération</v-label>
            <VTextField v-model="recoveryCode" hide-details class="mb-2" autocomplete="one-time-code" />
        </template>

        <v-btn color="primary" size="large" block flat class="mt-4" :loading="loading" @click="verify">Vérifier</v-btn>
        <v-alert v-if="error" type="error" class="mt-3" density="compact">{{ error }}</v-alert>
        <h6 class="text-h6 mt-5 font-weight-regular">
            Un problème ?
            <a href="#" class="text-primary text-subtitle-1 text-decoration-none pl-1 font-weight-medium" @click.prevent="backToLogin">
                Retour à la connexion
            </a>
        </h6>
    </div>
</template>
