<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth';
import { clearPasswordResetTokenFromUrl, readPasswordResetToken } from '@/features/auth/password-reset-token';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AuthPasswordField from '@/components/auth/AuthPasswordField.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const { t } = useI18n();

const token = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const capturedFromUrl = ref(false);

const showManualToken = computed(() => !capturedFromUrl.value && !token.value);

const passwordRules = [
    (v: string) => !!v || t('auth.resetPassword.errors.required'),
    (v: string) => !!(v && v.length >= 8) || t('auth.resetPassword.errors.minLength'),
    (v: string) => /[A-Za-z]/.test(v) || t('auth.resetPassword.errors.letter'),
    (v: string) => /\d/.test(v) || t('auth.resetPassword.errors.digit')
];
const confirmPasswordRules = [
    (v: string) => !!v || t('auth.resetPassword.errors.required'),
    (v: string) => v === newPassword.value || t('auth.resetPassword.errors.mismatch')
];
const tokenRules = [(v: string) => !!v.trim() || t('auth.resetPassword.errors.required')];

onMounted(() => {
    const fromUrl = readPasswordResetToken(route);
    if (!fromUrl) return;
    token.value = fromUrl;
    capturedFromUrl.value = true;
    clearPasswordResetTokenFromUrl(router, route);
});

async function submit() {
    error.value = null;
    if (!token.value.trim()) return;
    if (newPassword.value !== confirmPassword.value) return;
    loading.value = true;
    try {
        await auth.resetPassword(token.value.trim(), newPassword.value);
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="auth-form">
        <template v-if="showManualToken">
            <AppAlert type="info" class="mb-4">{{ t('auth.resetPassword.manualTokenHint') }}</AppAlert>
            <div class="auth-field">
                <label class="auth-field__label">{{ t('auth.resetPassword.token') }}</label>
                <VTextField v-model="token" :rules="tokenRules" hide-details="auto" autocomplete="off" />
            </div>
        </template>

        <AuthPasswordField
            v-model="newPassword"
            :label="t('auth.resetPassword.newPassword')"
            :rules="passwordRules"
            autocomplete="new-password"
        />
        <AuthPasswordField
            v-model="confirmPassword"
            :label="t('auth.resetPassword.confirmPassword')"
            :rules="confirmPasswordRules"
            autocomplete="new-password"
        />
        <button type="button" class="su-btn su-btn--ink auth-submit" :disabled="loading" @click="submit">
            <span v-if="loading" class="su-spin" aria-hidden="true" />
            {{ t('auth.resetPassword.submit') }}
        </button>
        <AppAlert v-if="error" type="error" class="mt-3">{{ error }}</AppAlert>
    </div>
</template>
