<script setup lang="ts">
/** Ligne d'une occurrence : heure ou « journée entière », source, membre qui partage, montant. Un événement saisi s'ouvre au clic. */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
    formatOccurrenceAmount,
    isCanceled,
    isEditableOccurrence,
    occurrenceTimeRange,
    occurrenceTone,
    occurrenceToneStyle
} from '@/features/calendar/occurrences';
import { CALENDAR_SOURCE_KEYS, type CalendarOccurrence } from '@/features/calendar/types';

const props = defineProps<{ occurrence: CalendarOccurrence }>();

const emit = defineEmits<{ open: [occurrence: CalendarOccurrence] }>();

const { t, locale } = useI18n();

const editable = computed(() => isEditableOccurrence(props.occurrence));

const meta = computed(() => {
    const occurrence = props.occurrence;
    const parts = [occurrenceTimeRange(occurrence, locale.value) ?? t('calendarPage.allDay')];
    const key = occurrence.sourceKey;
    if (key) parts.push((CALENDAR_SOURCE_KEYS as readonly string[]).includes(key) ? t(`calendarPage.sources.${key}`) : key);
    if (occurrence.sharedBy) parts.push(t('calendarPage.sharedBy', { name: occurrence.sharedBy }));
    if (isCanceled(occurrence)) parts.push(t('calendarPage.canceled'));
    return parts.join(' · ');
});
</script>

<template>
    <li class="cal-list__item" :class="`cal-tone--${occurrenceTone(occurrence)}`" :style="occurrenceToneStyle(occurrence)">
        <component
            :is="editable ? 'button' : 'div'"
            :type="editable ? 'button' : undefined"
            class="cal-list__row"
            :class="{ 'cal-list__row--action': editable }"
            @click="editable && emit('open', occurrence)"
        >
            <span class="su-sq cal-list__sq" aria-hidden="true" />
            <span class="cal-list__main">
                <span class="cal-list__title" :class="{ 'cal-is-canceled': isCanceled(occurrence) }">{{ occurrence.title }}</span>
                <span class="cal-list__meta">{{ meta }}</span>
            </span>
            <span
                v-if="occurrence.amount != null && occurrence.currency"
                class="cal-list__amount"
                :class="occurrence.amount < 0 ? 'su-neg' : 'su-pos'"
                >{{ formatOccurrenceAmount(occurrence.amount, occurrence.currency) }}</span
            >
        </component>
    </li>
</template>
