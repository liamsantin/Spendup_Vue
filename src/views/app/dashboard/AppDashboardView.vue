<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseBreadcrumb from '@/components/shared/breadcrumb/BaseBreadcrumb.vue';
import { DashboardContent } from '@/features/dashboard';

const { t } = useI18n();

const page = computed(() => ({ title: t('dashboard.pageTitle') }));
const breadcrumbs = computed(() => [
    { text: t('dashboard.breadcrumbs.application'), disabled: false, href: '/app' },
    { text: t('dashboard.breadcrumbs.dashboard'), disabled: true, href: '/app' }
]);
</script>

<template>
    <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" />
    <DashboardContent />
</template>
