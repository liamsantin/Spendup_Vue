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
    router.push('/auth');
}
</script>

<template>
    <div class="auth-form">
        <template v-if="!useRecovery">
            <label class="auth-field__label">{{ t('auth.twoStep.otpLabel') }}</label>
            <OtpDigitsInput v-model="digitsCode" field-class="two-step-otp" @complete="verify" />
        </template>
        <template v-else>
            <div class="auth-field">
                <label class="auth-field__label">{{ t('auth.twoStep.recoveryLabel') }}</label>
                <VTextField v-model="recoveryCode" hide-details="auto" autocomplete="one-time-code" />
            </div>
        </template>

        <button type="button" class="su-btn su-btn--ink auth-submit" :disabled="loading" @click="verify()">
            <span v-if="loading" class="su-spin" aria-hidden="true" />
            {{ t('auth.twoStep.submit') }}
        </button>
        <AppAlert v-if="error" type="error" class="mt-3">{{ error }}</AppAlert>

        <p class="auth-field__hint mt-5">
            <template v-if="!useRecovery">
                {{ t('auth.twoStep.useRecovery') }}
                <a href="#" class="auth-shell__link pl-1" @click.prevent="useRecovery = true">
                    {{ t('auth.twoStep.clickHere') }}
                </a>
            </template>
            <template v-else>
                {{ t('auth.twoStep.useOtp') }}
                <a href="#" class="auth-shell__link pl-1" @click.prevent="useRecovery = false">
                    {{ t('auth.twoStep.clickHere') }}
                </a>
            </template>
        </p>
        <p class="auth-field__hint mt-3">
            {{ t('auth.twoStep.problem') }}
            <a href="#" class="auth-shell__link pl-1" @click.prevent="backToLogin">
                {{ t('auth.twoStep.backToLogin') }}
            </a>
        </p>
    </div>
</template>
