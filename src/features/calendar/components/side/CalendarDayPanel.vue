<script setup lang="ts">
/** Occurrences du jour sélectionné : heure ou « journée entière », source, membre qui partage, montant. */
import { useI18n } from 'vue-i18n';
import { formatOccurrenceAmount, isCanceled, occurrenceTime, occurrenceTone } from '@/features/calendar/occurrences';
import { CALENDAR_SOURCE_KEYS, type CalendarOccurrence } from '@/features/calendar/types';

defineProps<{
    title: string;
    items: CalendarOccurrence[];
}>();

const emit = defineEmits<{ open: [occurrence: CalendarOccurrence] }>();

const { t, locale } = useI18n();

/** Seuls les événements saisis s'ouvrent ici ; une occurrence de source se gère dans son module. */
function isEditable(occurrence: CalendarOccurrence): boolean {
    return !!occurrence.eventPublicId && !occurrence.sourceKey && !occurrence.sharedBy;
}

function meta(occurrence: CalendarOccurrence): string {
    const parts = [occurrenceTime(occurrence, locale.value) ?? t('calendarPage.allDay')];
    const key = occurrence.sourceKey;
    if (key) parts.push((CALENDAR_SOURCE_KEYS as readonly string[]).includes(key) ? t(`calendarPage.sources.${key}`) : key);
    if (occurrence.sharedBy) parts.push(t('calendarPage.sharedBy', { name: occurrence.sharedBy }));
    if (isCanceled(occurrence)) parts.push(t('calendarPage.canceled'));
    return parts.join(' · ');
}
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
            <li
                v-for="occurrence in items"
                :key="occurrence.id"
                class="cal-list__item"
                :class="`cal-tone--${occurrenceTone(occurrence)}`"
                :style="occurrence.color && !occurrence.sourceKey ? { '--event-color': occurrence.color } : undefined"
            >
                <component
                    :is="isEditable(occurrence) ? 'button' : 'div'"
                    :type="isEditable(occurrence) ? 'button' : undefined"
                    class="cal-list__row"
                    :class="{ 'cal-list__row--action': isEditable(occurrence) }"
                    @click="isEditable(occurrence) && emit('open', occurrence)"
                >
                    <span class="su-sq cal-list__sq" aria-hidden="true" />
                    <span class="cal-list__main">
                        <span class="cal-list__title" :class="{ 'cal-is-canceled': isCanceled(occurrence) }">{{ occurrence.title }}</span>
                        <span class="cal-list__meta">{{ meta(occurrence) }}</span>
                    </span>
                    <span
                        v-if="occurrence.amount != null && occurrence.currency"
                        class="cal-list__amount"
                        :class="occurrence.amount < 0 ? 'su-neg' : 'su-pos'"
                        >{{ formatOccurrenceAmount(occurrence.amount, occurrence.currency) }}</span
                    >
                </component>
            </li>
        </ul>
        <p v-else class="cal-side__empty">{{ t('calendarPage.emptyDay') }}</p>
    </section>
</template>

<style scoped>
.cal-day__head {
    align-items: flex-start;
}

.cal-day__eyebrow {
    margin: 0 0 4px;
    color: var(--gray);
    font-size: 13px;
}
</style>
