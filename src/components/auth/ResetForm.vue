<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth';
import AppAlert from '@/components/shared/alert/AppAlert.vue';

const auth = useAuthStore();
const { t } = useI18n();

const valid = ref(false);
const email = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const emailRules = [
    (v: string) => !!v || t('auth.forgotPassword.errors.required'),
    (v: string) => /.+@.+\..+/.test(v) || t('auth.forgotPassword.errors.email')
];

async function onSubmit() {
    error.value = null;
    success.value = null;
    loading.value = true;
    try {
        await auth.forgotPassword(email.value);
        success.value = t('auth.forgotPassword.success');
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <v-form v-model="valid" class="auth-form" @submit.prevent="onSubmit">
        <AppAlert type="info" class="mb-4">{{ t('auth.forgotPassword.verifiedEmailHint') }}</AppAlert>
        <div class="auth-field">
            <label class="auth-field__label">{{ t('auth.forgotPassword.email') }}</label>
            <VTextField v-model="email" :rules="emailRules" required hide-details="auto" type="email" autocomplete="email" />
        </div>
        <button type="submit" class="su-btn su-btn--ink auth-submit" :disabled="loading || !valid">
            <span v-if="loading" class="su-spin" aria-hidden="true" />
            {{ t('auth.forgotPassword.submit') }}
        </button>
        <AppAlert v-if="success" type="success" class="mt-3">{{ success }}</AppAlert>
        <AppAlert v-if="error" type="error" class="mt-3">{{ error }}</AppAlert>
    </v-form>
</template>
