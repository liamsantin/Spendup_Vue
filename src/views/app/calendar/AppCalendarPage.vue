<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { CALENDAR_VIEWS, CalendarView, type CalendarViewMode } from '@/features/calendar';

const { t } = useI18n();

/** Vue Agenda par défaut sur petit écran. */
const view = ref<CalendarViewMode>(typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches ? 'agenda' : 'month');
</script>

<template>
    <AppPageShell :title="t('calendarPage.title')">
        <template #tabs>
            <nav class="su-tabs su-tabs--links" :aria-label="t('calendarPage.views.label')">
                <button
                    v-for="(mode, index) in CALENDAR_VIEWS"
                    :key="mode"
                    type="button"
                    class="su-tab"
                    :class="{ 'is-active': view === mode }"
                    :aria-pressed="view === mode"
                    :aria-keyshortcuts="String(index + 1)"
                    :title="`${t(`calendarPage.views.${mode}`)} (${index + 1})`"
                    @click="view = mode"
                >
                    <span class="su-tab__label" :data-label="t(`calendarPage.views.${mode}`)">{{ t(`calendarPage.views.${mode}`) }}</span>
                </button>
            </nav>
        </template>

        <CalendarView v-model:view="view" />
    </AppPageShell>
</template>
