<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/features/auth';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import OtpDigitsInput from '@/components/auth/OtpDigitsInput.vue';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue';

const auth = useAuthStore();
const route = useRoute();
const { t } = useI18n();

const email = ref('');
const code = ref('');
const loading = ref(false);
const resending = ref(false);
const showResendAuth = ref(false);
const resendPassword = ref('');
const resendGoogleIdToken = ref<string | null>(null);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const canResend = computed(() => !!auth.accessToken || !!auth.refreshToken);
const isGoogleOnlyAccount = computed(() => auth.user?.hasPassword === false);
const showResendPassword = computed(() => !isGoogleOnlyAccount.value);
const showResendGoogle = computed(() => isGoogleOnlyAccount.value || auth.user?.hasGoogle !== false);

onMounted(() => {
    const fromQuery = route.query.email;
    if (typeof fromQuery === 'string' && fromQuery.trim()) {
        email.value = fromQuery.trim();
        return;
    }
    const pending = auth.user?.pendingEmail?.trim();
    if (pending) {
        email.value = pending;
    }
});

async function submit(submittedCode?: string) {
    error.value = null;
    success.value = null;
    const otp = submittedCode ?? code.value;
    if (otp.length !== 6) {
        error.value = t('auth.confirmEmailChange.errors.otp');
        return;
    }
    if (!email.value.trim()) {
        error.value = t('auth.confirmEmailChange.errors.email');
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

function openResend() {
    error.value = null;
    success.value = null;
    resendGoogleIdToken.value = null;
    if (!canResend.value) {
        error.value = t('auth.confirmEmailChange.errors.relogin');
        return;
    }
    showResendAuth.value = true;
}

async function resendWithAuth(payload: { currentPassword?: string | null; googleIdToken?: string | null }) {
    error.value = null;
    success.value = null;

    if (!canResend.value) {
        error.value = t('auth.confirmEmailChange.errors.relogin');
        return;
    }
    if (!email.value.trim()) {
        error.value = t('auth.confirmEmailChange.errors.email');
        return;
    }
    if (resending.value) return;

    resending.value = true;
    try {
        await auth.changeEmail({
            newEmail: email.value.trim(),
            currentPassword: payload.currentPassword ?? null,
            googleIdToken: payload.googleIdToken ?? null
        });
        success.value = t('auth.confirmEmailChange.resendSuccess');
        resendPassword.value = '';
        resendGoogleIdToken.value = null;
        showResendAuth.value = false;
        code.value = '';
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
        resendGoogleIdToken.value = null;
    } finally {
        resending.value = false;
    }
}

async function resend() {
    if (!resendPassword.value) {
        error.value = t('auth.confirmEmailChange.errors.password');
        showResendAuth.value = true;
        return;
    }
    await resendWithAuth({ currentPassword: resendPassword.value });
}

async function onResendGoogleCredential(idToken: string) {
    resendGoogleIdToken.value = idToken;
    await resendWithAuth({ googleIdToken: idToken });
}
</script>

<template>
    <div class="mt-5">
        <p class="text-subtitle-1 mb-4">{{ t('auth.confirmEmailChange.hint') }}</p>
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">{{ t('auth.confirmEmailChange.newEmail') }}</v-label>
        <VTextField v-model="email" type="email" class="mb-4" hide-details autocomplete="email" />
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">{{ t('auth.confirmEmailChange.otpLabel') }}</v-label>
        <OtpDigitsInput v-model="code" field-class="confirm-email-change-otp" @complete="submit" />

        <v-btn
            v-if="!showResendAuth"
            class="mb-1 text-medium-emphasis"
            variant="text"
            size="small"
            block
            :disabled="resending"
            @click="openResend"
        >
            {{ t('auth.confirmEmailChange.resend') }}
        </v-btn>
        <div v-else class="mt-2 mb-3">
            <template v-if="showResendPassword">
                <p class="text-subtitle-2 text-medium-emphasis mb-3">{{ t('auth.confirmEmailChange.resendPasswordHint') }}</p>
                <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">
                    {{ t('auth.confirmEmailChange.currentPassword') }}
                </v-label>
                <VTextField
                    v-model="resendPassword"
                    type="password"
                    class="mb-3"
                    hide-details
                    autocomplete="current-password"
                    autofocus
                    @keyup.enter="resend"
                />
                <v-btn color="primary" variant="tonal" block flat :loading="resending" @click="resend">
                    {{ t('auth.confirmEmailChange.sendNewCode') }}
                </v-btn>
            </template>
            <template v-else-if="showResendGoogle">
                <p class="text-subtitle-2 text-medium-emphasis mb-3">{{ t('auth.confirmEmailChange.resendGoogleHint') }}</p>
                <GoogleSignInButton @credential="onResendGoogleCredential" />
            </template>
            <v-btn
                class="mt-1 text-medium-emphasis"
                variant="text"
                size="small"
                block
                :disabled="resending"
                @click="showResendAuth = false"
            >
                {{ t('auth.confirmEmailChange.cancel') }}
            </v-btn>
        </div>

        <v-btn color="primary" size="large" block flat class="mt-2" :loading="loading" @click="submit">
            {{ t('auth.confirmEmailChange.submit') }}
        </v-btn>
        <AppAlert v-if="success" type="success" class="mt-3">{{ success }}</AppAlert>
        <AppAlert v-if="error" type="error" class="mt-3">{{ error }}</AppAlert>
    </div>
</template>
