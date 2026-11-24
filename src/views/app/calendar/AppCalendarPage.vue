<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { CalendarMonthView } from '@/features/calendar';

const { t } = useI18n();
</script>

<template>
    <AppPageShell :title="t('calendarPage.title')">
        <CalendarMonthView />
    </AppPageShell>
</template>
