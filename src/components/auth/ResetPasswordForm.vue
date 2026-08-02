<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth';
import { clearPasswordResetTokenFromUrl, readPasswordResetToken } from '@/features/auth/password-reset-token';
import AppAlert from '@/components/shared/AppAlert.vue';

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
    <div class="mt-5">
        <template v-if="showManualToken">
            <AppAlert type="info" class="mb-4">{{ t('auth.resetPassword.manualTokenHint') }}</AppAlert>
            <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">{{ t('auth.resetPassword.token') }}</v-label>
            <VTextField v-model="token" :rules="tokenRules" class="mb-4" hide-details autocomplete="off" />
        </template>

        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">{{ t('auth.resetPassword.newPassword') }}</v-label>
        <VTextField v-model="newPassword" :rules="passwordRules" type="password" class="mb-4" hide-details autocomplete="new-password" />
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">{{ t('auth.resetPassword.confirmPassword') }}</v-label>
        <VTextField
            v-model="confirmPassword"
            :rules="confirmPasswordRules"
            type="password"
            class="mb-4"
            hide-details
            autocomplete="new-password"
        />
        <v-btn color="primary" size="large" block flat :loading="loading" @click="submit">{{ t('auth.resetPassword.submit') }}</v-btn>
        <AppAlert v-if="error" type="error" class="mt-3">{{ error }}</AppAlert>
    </div>
</template>
