<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import OtpDigitsInput from '@/components/auth/OtpDigitsInput.vue';
import { AppError } from '@/utils/errors/app-error';

const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();

const digitsCode = ref('');
const recoveryCode = ref('');
const useRecovery = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);

const code = computed(() => (useRecovery.value ? recoveryCode.value.trim() : digitsCode.value));

async function verify(submittedCode?: string) {
    error.value = null;
    if (!authStore.twoFactorToken) {
        error.value = t('auth.twoStep.errors.expired');
        return;
    }
    const otp = submittedCode ?? code.value;
    if (!otp || (!useRecovery.value && otp.length !== 6)) {
        error.value = t('auth.twoStep.errors.otp');
        return;
    }
    if (loading.value) return;
    loading.value = true;
    try {
        await authStore.verifyTwoFactor(otp);
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        error.value = err.message;
        const msg = err.message.toLowerCase();
        // Uniquement challenge expiré / session invalide — pas un simple OTP faux (« invalid code »).
        const challengeExpired =
            err.status === 401 || (err.status === 400 && msg.includes('expired')) || (err.status === 403 && msg.includes('expired'));
        if (challengeExpired) {
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
            <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">{{ t('auth.twoStep.otpLabel') }}</v-label>
            <OtpDigitsInput v-model="digitsCode" field-class="two-step-otp" @complete="verify" />
        </template>
        <template v-else>
            <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">{{ t('auth.twoStep.recoveryLabel') }}</v-label>
            <VTextField v-model="recoveryCode" hide-details class="mb-2" autocomplete="one-time-code" />
        </template>

        <v-btn color="primary" size="large" block flat class="mt-4" :loading="loading" @click="verify">
            {{ t('auth.twoStep.submit') }}
        </v-btn>
        <AppAlert v-if="error" type="error" class="mt-3">{{ error }}</AppAlert>

        <h6 class="text-h6 mt-5 font-weight-regular">
            <template v-if="!useRecovery">
                {{ t('auth.twoStep.useRecovery') }}
                <a
                    href="#"
                    class="text-primary text-subtitle-1 text-decoration-none pl-1 font-weight-medium"
                    @click.prevent="useRecovery = true"
                >
                    {{ t('auth.twoStep.clickHere') }}
                </a>
            </template>
            <template v-else>
                {{ t('auth.twoStep.useOtp') }}
                <a
                    href="#"
                    class="text-primary text-subtitle-1 text-decoration-none pl-1 font-weight-medium"
                    @click.prevent="useRecovery = false"
                >
                    {{ t('auth.twoStep.clickHere') }}
                </a>
            </template>
        </h6>
        <h6 class="text-h6 mt-3 font-weight-regular">
            {{ t('auth.twoStep.problem') }}
            <a href="#" class="text-primary text-subtitle-1 text-decoration-none pl-1 font-weight-medium" @click.prevent="backToLogin">
                {{ t('auth.twoStep.backToLogin') }}
            </a>
        </h6>
    </div>
</template>
