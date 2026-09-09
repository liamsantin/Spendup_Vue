<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth';
import { Form } from 'vee-validate';
import AuthPasswordField from '@/components/auth/AuthPasswordField.vue';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
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
</script>

<template>
    <div class="auth-form">
        <AppAlert v-if="notice" type="info" class="mb-4">{{ notice }}</AppAlert>

        <Form v-slot="{ errors, isSubmitting }" @submit="validate">
            <div class="auth-field">
                <label class="auth-field__label">
                    <span :class="{ 'text-primary': !!identifierTrimmed && !identifierTrimmed.includes('@') }">{{
                        t('auth.login.username')
                    }}</span>
                    <span class="auth-label-sep"> / </span>
                    <span :class="{ 'text-primary': identifierTrimmed.includes('@') }">{{ t('auth.login.email') }}</span>
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
                :label="t('auth.login.password')"
                :rules="passwordRules"
                autocomplete="current-password"
            />

            <div class="d-flex justify-end mb-3">
                <RouterLink to="/auth/forgot-password" class="auth-shell__link">
                    {{ t('auth.login.forgotPassword') }}
                </RouterLink>
            </div>

            <button type="submit" class="su-btn su-btn--ink auth-submit" :disabled="isSubmitting">
                <span v-if="isSubmitting" class="su-spin" aria-hidden="true" />
                {{ t('auth.login.submit') }}
            </button>
            <AppAlert v-if="errors.apiError" type="error" class="mt-3">{{ errors.apiError }}</AppAlert>
        </Form>
    </div>
</template>
