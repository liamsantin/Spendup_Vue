<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore, isValidUsername, normalizeUsername } from '@/features/auth';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue';
import AppAlert from '@/components/shared/alert/AppAlert.vue';

const emit = defineEmits<{
    googleProcessing: [value: boolean];
}>();

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

async function onGoogleCredential(idToken: string) {
    error.value = null;
    // Succès : on garde l'état actif, la navigation démonte le formulaire.
    emit('googleProcessing', true);
    try {
        await authStore.loginWithGoogle(idToken);
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
        emit('googleProcessing', false);
    }
}

onMounted(() => {
    success.value = null;
});
</script>

<template>
    <div class="auth-form">
        <GoogleSignInButton class="mb-4" :label="t('auth.google.signUp')" @credential="onGoogleCredential" />

        <div class="d-flex align-center text-center mb-6">
            <div class="text-h6 w-100 px-5 font-weight-regular auth-divider position-relative">
                <span class="bg-surface px-5 py-3 position-relative">{{ t('auth.register.or') }}</span>
            </div>
        </div>

        <v-form v-model="formValid" @submit.prevent="onSubmit" class="mt-5">
            <v-label class="text-subtitle-1 font-weight-medium pb-2">
                <span :class="{ 'text-primary': !isEmailMode && !!identifierTrimmed }">{{ t('auth.register.username') }}</span>
                <span class="auth-label-sep"> / </span>
                <span :class="{ 'text-primary': isEmailMode && !!identifierTrimmed }">{{ t('auth.register.email') }}</span>
            </v-label>
            <VTextField v-model="identifier" :rules="identifierRules" class="mb-4" required hide-details autocomplete="username" />

            <v-label class="text-subtitle-1 font-weight-medium pb-2">{{ t('auth.register.password') }}</v-label>
            <VTextField
                v-model="password"
                :rules="passwordRules"
                class="mb-4"
                required
                hide-details
                type="password"
                autocomplete="new-password"
            />

            <v-label class="text-subtitle-1 font-weight-medium pb-2">{{ t('auth.register.confirmPassword') }}</v-label>
            <VTextField
                v-model="confirmPassword"
                :rules="confirmPasswordRules"
                required
                hide-details
                type="password"
                autocomplete="new-password"
            />

            <v-btn size="large" class="mt-4" color="primary" block type="submit" :loading="loading" flat>
                {{ t('auth.register.submit') }}
            </v-btn>

            <AppAlert v-if="error" type="error" class="mt-3">{{ error }}</AppAlert>
            <AppAlert v-if="success" type="success" class="mt-3">{{ success }}</AppAlert>
        </v-form>
    </div>
</template>
