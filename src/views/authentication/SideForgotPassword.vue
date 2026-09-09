<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import AuthShell from '@/components/auth/AuthShell.vue';
import ResetForm from '@/components/auth/ResetForm.vue';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm.vue';
import { readPasswordResetToken } from '@/features/auth/password-reset-token';

const { t } = useI18n();
const route = useRoute();

/** Recalculé à chaque navigation (forgot ↔ reset partagent ce composant). */
const showReset = computed(() => !!readPasswordResetToken(route));
const title = computed(() => t(showReset.value ? 'auth.resetPassword.title' : 'auth.forgotPassword.title'));
const subtitle = computed(() => t(showReset.value ? 'auth.resetPassword.subtitle' : 'auth.forgotPassword.subtitle'));
</script>

<template>
    <AuthShell :title="title" :subtitle="subtitle">
        <ResetPasswordForm v-if="showReset" :key="route.fullPath" />
        <ResetForm v-else />
        <template #footer>
            <RouterLink to="/auth" class="su-btn su-btn--ghost auth-submit">
                {{ t('auth.forgotPassword.backToLogin') }}
            </RouterLink>
        </template>
    </AuthShell>
</template>
