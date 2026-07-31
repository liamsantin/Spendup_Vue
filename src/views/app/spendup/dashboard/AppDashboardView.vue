<script setup lang="ts">
import { ref } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { DashboardContent } from '@/features/dashboard';

const page = ref({ title: 'Tableau de bord' });
const breadcrumbs = ref([
    { text: 'Application', disabled: false, href: '/app' },
    { text: 'Tableau de bord', disabled: true, href: '/app' }
]);
</script>

<template>
    <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" />
    <DashboardContent />
</template>
