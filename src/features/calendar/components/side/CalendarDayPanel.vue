<script setup lang="ts">
/** Occurrences du jour sélectionné. */
import { useI18n } from 'vue-i18n';
import CalendarOccurrenceRow from '@/features/calendar/components/list/CalendarOccurrenceRow.vue';
import type { CalendarOccurrence } from '@/features/calendar/types';

defineProps<{
    title: string;
    items: CalendarOccurrence[];
}>();

const emit = defineEmits<{ open: [occurrence: CalendarOccurrence]; viewAll: [] }>();

const { t } = useI18n();
</script>

<template>
    <section class="su-section">
        <header class="su-section__head cal-day__head">
            <div>
                <p class="cal-day__eyebrow">{{ t('calendarPage.selectedDay') }}</p>
                <h2>{{ title }}</h2>
            </div>
        </header>
        <ul v-if="items.length" class="cal-list">
            <CalendarOccurrenceRow v-for="occurrence in items" :key="occurrence.id" :occurrence="occurrence" @open="emit('open', $event)" />
        </ul>
        <p v-else class="cal-side__empty">{{ t('calendarPage.emptyDay') }}</p>
        <button v-if="items.length" type="button" class="su-btn su-btn--ghost cal-day__all" @click="emit('viewAll')">
            {{ t('calendarPage.viewDay') }}
        </button>
    </section>
</template>

<style scoped>
.cal-day__head {
    align-items: flex-start;
}

.cal-day__all {
    margin-top: 12px;
}

.cal-day__eyebrow {
    margin: 0 0 4px;
    color: var(--gray);
    font-size: 13px;
}
</style>
