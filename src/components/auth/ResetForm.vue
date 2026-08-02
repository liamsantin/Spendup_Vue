<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth';
import AppAlert from '@/components/shared/AppAlert.vue';

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
    <v-form v-model="valid" @submit.prevent="onSubmit" class="mt-2">
        <AppAlert type="info" variant="tonal" class="mb-4">{{ t('auth.forgotPassword.verifiedEmailHint') }}</AppAlert>
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">{{ t('auth.forgotPassword.email') }}</v-label>
        <VTextField v-model="email" :rules="emailRules" required hide-details type="email" autocomplete="email" />
        <v-btn size="large" color="primary" block type="submit" class="mt-4" :loading="loading" :disabled="!valid" flat>
            {{ t('auth.forgotPassword.submit') }}
        </v-btn>
        <AppAlert v-if="success" type="success" class="mt-3">{{ success }}</AppAlert>
        <AppAlert v-if="error" type="error" class="mt-3">{{ error }}</AppAlert>
    </v-form>
</template>
