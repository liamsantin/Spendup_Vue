<script setup lang="ts">
/** Sécurité → Transparence : registre d’activité de l’opérateur, identique pour tous. */
import { useI18n } from 'vue-i18n';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { SecurityTransparencyReport } from '@/features/user-settings/components/security';
import { SETTINGS_PATHS } from '@/features/user-settings/settings-paths';

const { t } = useI18n();
</script>

<template>
    <AppPageShell :title="t('security.transparency.title')" :subtitle="t('security.transparency.subtitle')">
        <template #actions>
            <RouterLink :to="SETTINGS_PATHS.security" class="su-btn su-btn--ghost">{{ t('security.common.backToSecurity') }}</RouterLink>
        </template>
        <SecurityTransparencyReport />
    </AppPageShell>
</template>
