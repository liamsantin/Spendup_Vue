<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { CALENDAR_VIEWS, CalendarView, type CalendarViewMode } from '@/features/calendar';
import { useCalendarPreferences } from '@/features/calendar/composables/useCalendarPreferences';

const { t } = useI18n();
const { load } = useCalendarPreferences();

/** Vue Agenda par défaut sur petit écran ; sinon la vue enregistrée dans les réglages. */
const narrow = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches;
const view = ref<CalendarViewMode>(narrow ? 'agenda' : 'month');
const initial = view.value;

onMounted(async () => {
    if (narrow) return;
    try {
        const prefs = await load();
        if (view.value === initial && (CALENDAR_VIEWS as readonly string[]).includes(prefs.defaultView)) {
            view.value = prefs.defaultView as CalendarViewMode;
        }
    } catch {
        /* la vue en cours reste affichée */
    }
});
</script>

<template>
    <AppPageShell :title="t('calendarPage.title')" :body-scroll="false" class="cal-page">
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

<style scoped>
/* Bureau : le corps de page ne défile pas, c'est la zone des vues du calendrier qui défile. */
@media (min-width: 768px) {
    .cal-page :deep(.su-body) {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding-bottom: 16px;
    }

    /* Le calendrier occupe toute la page : titre et onglets repliés, les vues se choisissent dans sa barre. */
    .cal-page :deep(.su-hero) {
        display: none;
    }

    .cal-page :deep(.su-body) {
        padding-top: 0;
        padding-bottom: 8px;
    }
}
</style>
