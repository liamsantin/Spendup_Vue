<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AuthShell from '@/components/auth/AuthShell.vue';
import ConfirmEmailForm from '@/components/auth/ConfirmEmailForm.vue';

const { t } = useI18n();
</script>

<template>
    <AuthShell :title="t('auth.confirmEmail.title')">
        <ConfirmEmailForm />
        <template #footer>
            <RouterLink to="/auth" class="su-btn su-btn--ghost auth-submit">
                {{ t('auth.confirmEmail.backToLogin') }}
            </RouterLink>
        </template>
    </AuthShell>
</template>
