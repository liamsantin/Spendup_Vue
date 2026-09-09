<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import AuthShell from '@/components/auth/AuthShell.vue';
import ConfirmEmailChangeForm from '@/components/auth/ConfirmEmailChangeForm.vue';
import { useAuthStore } from '@/features/auth';
import { SETTINGS_PATHS } from '@/features/user-settings/settings-paths';

const { t } = useI18n();
const route = useRoute();
const auth = useAuthStore();

/** Depuis l’app (définition / confirmation d’e-mail) vs flux auth public. */
const fromApp = computed(() => route.query.from === 'app' || auth.isAuthenticated);

const backLabel = computed(() => (fromApp.value ? t('auth.confirmEmailChange.backToApp') : t('auth.confirmEmailChange.backToLogin')));
const backTo = computed(() => (fromApp.value ? SETTINGS_PATHS.account : '/auth'));
</script>

<template>
    <AuthShell :title="t('auth.confirmEmailChange.title')">
        <ConfirmEmailChangeForm />
        <template #footer>
            <RouterLink :to="backTo" class="su-btn su-btn--ghost auth-submit">
                {{ backLabel }}
            </RouterLink>
        </template>
    </AuthShell>
</template>
