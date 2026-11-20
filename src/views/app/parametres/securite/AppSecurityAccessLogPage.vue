<script setup lang="ts">
/** Sécurité → Accès techniques : cible de `/security/access-log` (e-mail et notification). */
import { useI18n } from 'vue-i18n';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { SecurityAccessLogList } from '@/features/user-settings/components/security';
import { SETTINGS_PATHS } from '@/features/user-settings/settings-paths';

const { t } = useI18n();
</script>

<template>
    <AppPageShell :title="t('security.accessLog.title')" :subtitle="t('security.accessLog.subtitle')">
        <template #actions>
            <RouterLink :to="SETTINGS_PATHS.security" class="su-btn su-btn--ghost">{{ t('security.common.backToSecurity') }}</RouterLink>
        </template>
        <SecurityAccessLogList />
    </AppPageShell>
</template>
