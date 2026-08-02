<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth';
import { Form } from 'vee-validate';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue';
import AppAlert from '@/components/shared/AppAlert.vue';
import { getErrorMessage } from '@/utils/errors/app-error';

const authStore = useAuthStore();
const { t } = useI18n();

const notice = ref<string | null>(null);
const password = ref('');
const identifier = ref('');
const passwordRules = ref([(v: string) => !!v || t('auth.login.errors.required')]);
const identifierRules = ref([(v: string) => !!v.trim() || t('auth.login.errors.required')]);

const identifierTrimmed = computed(() => identifier.value.trim());

onMounted(() => {
    notice.value = authStore.consumeLoginNotice();
});

function validate(_values: Record<string, unknown>, { setErrors }: { setErrors: (errors: Record<string, string>) => void }) {
    const id = identifier.value.trim();
    if (!id) {
        setErrors({ apiError: t('auth.login.errors.identifier') });
        return;
    }
    if (!password.value) {
        setErrors({ apiError: t('auth.login.errors.password') });
        return;
    }
    return authStore.login(id, password.value).catch((error: unknown) => {
        setErrors({ apiError: getErrorMessage(error) });
    });
}

async function onGoogleCredential(idToken: string) {
    try {
        await authStore.loginWithGoogle(idToken);
    } catch (error: unknown) {
        notice.value = error instanceof Error ? error.message : String(error);
    }
}
</script>

<template>
    <div class="auth-form">
        <AppAlert v-if="notice" type="info" variant="tonal" class="mb-4">{{ notice }}</AppAlert>

        <GoogleSignInButton class="mb-4" @credential="onGoogleCredential" />

        <div class="d-flex align-center text-center mb-6">
            <div class="text-h6 w-100 px-5 font-weight-regular auth-divider position-relative">
                <span class="bg-surface px-5 py-3 position-relative">{{ t('auth.login.or') }}</span>
            </div>
        </div>

        <Form @submit="validate" v-slot="{ errors, isSubmitting }" class="mt-5">
            <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">
                <span :class="{ 'text-primary': !!identifierTrimmed && !identifierTrimmed.includes('@') }">{{
                    t('auth.login.username')
                }}</span>
                <span class="auth-label-sep"> / </span>
                <span :class="{ 'text-primary': identifierTrimmed.includes('@') }">{{ t('auth.login.email') }}</span>
            </v-label>
            <VTextField v-model="identifier" :rules="identifierRules" class="mb-8" required hide-details autocomplete="username" />
            <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">{{ t('auth.login.password') }}</v-label>
            <VTextField
                v-model="password"
                :rules="passwordRules"
                required
                hide-details
                type="password"
                class="pwdInput"
                autocomplete="current-password"
            />
            <div class="d-flex flex-wrap align-center my-3 justify-end">
                <RouterLink to="/auth/forgot-password" class="text-primary text-decoration-none text-body-1 opacity-1 font-weight-medium">
                    {{ t('auth.login.forgotPassword') }}
                </RouterLink>
            </div>
            <v-btn size="large" color="primary" :loading="isSubmitting" block type="submit" flat>{{ t('auth.login.submit') }}</v-btn>
            <AppAlert v-if="errors.apiError" type="error" class="mt-3">{{ errors.apiError }}</AppAlert>
        </Form>
    </div>
</template>
