<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore, isValidUsername, normalizeUsername } from '@/features/auth';
import AuthPasswordField from '@/components/auth/AuthPasswordField.vue';
import AppAlert from '@/components/shared/alert/AppAlert.vue';

const authStore = useAuthStore();
const { t } = useI18n();

const formValid = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const identifier = ref('');
const password = ref('');
const confirmPassword = ref('');

const identifierTrimmed = computed(() => identifier.value.trim());
const isEmailMode = computed(() => identifierTrimmed.value.includes('@'));

const identifierRules = [
    (v: string) => !!v.trim() || t('auth.register.errors.identifier'),
    (v: string) => {
        const value = v.trim();
        if (!value) return true;
        if (value.includes('@')) {
            return /.+@.+\..+/.test(value) || t('auth.register.errors.email');
        }
        return isValidUsername(value) || t('auth.register.errors.username');
    }
];
const passwordRules = [
    (v: string) => !!v || t('auth.register.errors.password'),
    (v: string) => !!(v && v.length >= 8) || t('auth.register.errors.password'),
    (v: string) => /[A-Za-z]/.test(v) || t('auth.register.errors.password'),
    (v: string) => /\d/.test(v) || t('auth.register.errors.password')
];
const confirmPasswordRules = [
    (v: string) => !!v || t('auth.register.errors.mismatch'),
    (v: string) => v === password.value || t('auth.register.errors.mismatch')
];

async function onSubmit() {
    error.value = null;
    success.value = null;

    const value = identifierTrimmed.value;
    if (!value) {
        error.value = t('auth.register.errors.identifier');
        return;
    }

    const asEmail = value.includes('@');
    if (asEmail && !/.+@.+\..+/.test(value)) {
        error.value = t('auth.register.errors.email');
        return;
    }
    if (!asEmail && !isValidUsername(value)) {
        error.value = t('auth.register.errors.username');
        return;
    }
    if (password.value.length < 8 || !/[A-Za-z]/.test(password.value) || !/\d/.test(password.value)) {
        error.value = t('auth.register.errors.password');
        return;
    }
    if (password.value !== confirmPassword.value) {
        error.value = t('auth.register.errors.mismatch');
        return;
    }

    loading.value = true;
    try {
        await authStore.register({
            email: asEmail ? value : null,
            username: asEmail ? null : normalizeUsername(value),
            password: password.value,
            firstName: null,
            name: null
        });
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    success.value = null;
});
</script>

<template>
    <div class="auth-form">
        <v-form v-model="formValid" @submit.prevent="onSubmit">
            <div class="auth-field">
                <label class="auth-field__label">
                    <span :class="{ 'text-primary': !isEmailMode && !!identifierTrimmed }">{{ t('auth.register.username') }}</span>
                    <span class="auth-label-sep"> / </span>
                    <span :class="{ 'text-primary': isEmailMode && !!identifierTrimmed }">{{ t('auth.register.email') }}</span>
                </label>
                <VTextField
                    v-model="identifier"
                    :rules="identifierRules"
                    :placeholder="t('auth.login.identifierPlaceholder')"
                    required
                    hide-details="auto"
                    class="auth-field__control"
                    autocomplete="username"
                />
            </div>

            <AuthPasswordField
                v-model="password"
                :label="t('auth.register.password')"
                :rules="passwordRules"
                :hint="t('auth.register.passwordHint')"
                autocomplete="new-password"
            />

            <AuthPasswordField
                v-model="confirmPassword"
                :label="t('auth.register.confirmPassword')"
                :rules="confirmPasswordRules"
                autocomplete="new-password"
            />

            <button type="submit" class="su-btn su-btn--ink auth-submit" :disabled="loading">
                <span v-if="loading" class="su-spin" aria-hidden="true" />
                {{ t('auth.register.submit') }}
            </button>

            <AppAlert v-if="error" type="error" class="mt-3">{{ error }}</AppAlert>
            <AppAlert v-if="success" type="success" class="mt-3">{{ success }}</AppAlert>
        </v-form>
    </div>
</template>
