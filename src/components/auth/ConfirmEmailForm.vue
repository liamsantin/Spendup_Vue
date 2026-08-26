<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/features/auth';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import OtpDigitsInput from '@/components/auth/OtpDigitsInput.vue';

const route = useRoute();
const auth = useAuthStore();
const { t } = useI18n();

const email = ref('');
const code = ref('');
const loading = ref(false);
const resending = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
/** Confirm API OK mais login auto en échec — retry login sans renvoyer l’OTP. */
const canRetryLogin = ref(false);

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
        error.value = t('auth.confirmEmail.errors.missingEmail');
        return;
    }
    const otp = submittedCode ?? code.value;
    if (otp.length !== 6) {
        error.value = t('auth.confirmEmail.errors.otp');
        return;
    }
    if (loading.value) return;
    error.value = null;
    success.value = null;
    canRetryLogin.value = false;
    loading.value = true;
    try {
        await auth.confirmEmail(email.value, otp);
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
        // E-mail déjà confirmé côté API : proposer un retry login si le mdp est encore en mémoire.
        canRetryLogin.value = !!auth.pendingPassword;
    } finally {
        loading.value = false;
    }
}

async function retryLogin() {
    if (!email.value || !auth.pendingPassword) return;
    error.value = null;
    success.value = null;
    loading.value = true;
    try {
        await auth.retryPendingLogin(email.value);
        canRetryLogin.value = false;
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
        canRetryLogin.value = !!auth.pendingPassword;
    } finally {
        loading.value = false;
    }
}

async function resend() {
    if (!email.value) {
        error.value = t('auth.confirmEmail.errors.missingEmail');
        return;
    }
    error.value = null;
    success.value = null;
    resending.value = true;
    try {
        await auth.resendVerification(email.value);
        success.value = t('auth.confirmEmail.resendSuccess');
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
            <p class="text-subtitle-1 mb-4">{{ t('auth.confirmEmail.sentTo', { email }) }}</p>
            <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">{{ t('auth.confirmEmail.otpLabel') }}</v-label>
            <OtpDigitsInput v-model="code" field-class="confirm-email-otp" :disabled="canRetryLogin" @complete="confirm" />
            <v-btn
                v-if="!canRetryLogin"
                class="mb-1 text-medium-emphasis"
                variant="text"
                size="small"
                block
                :loading="resending"
                @click="resend"
            >
                {{ t('auth.confirmEmail.resend') }}
            </v-btn>
            <v-btn v-if="!canRetryLogin" color="primary" size="large" block flat :loading="loading" @click="confirm">
                {{ t('auth.confirmEmail.submit') }}
            </v-btn>
            <v-btn v-else color="primary" size="large" block flat :loading="loading" @click="retryLogin">
                {{ t('auth.confirmEmail.retryLogin') }}
            </v-btn>
        </template>
        <template v-else>
            <AppAlert type="warning" class="mb-3">{{ t('auth.confirmEmail.missingEmail') }}</AppAlert>
            <v-btn color="primary" size="large" block flat to="/auth/register">{{ t('auth.confirmEmail.backToRegister') }}</v-btn>
        </template>
        <AppAlert v-if="success" type="success" class="mt-3">{{ success }}</AppAlert>
        <AppAlert v-if="error" type="error" class="mt-3">{{ error }}</AppAlert>
    </div>
</template>
