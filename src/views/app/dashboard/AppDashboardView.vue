<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { DashboardContent } from '@/features/dashboard';

const { t } = useI18n();
</script>

<template>
    <AppPageShell :title="t('dashboard.pageTitle')" :subtitle="t('dashboard.subtitle')">
        <DashboardContent />
    </AppPageShell>
</template>
