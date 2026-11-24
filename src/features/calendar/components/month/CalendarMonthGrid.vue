<script setup lang="ts">
/**
 * Grille mensuelle : semaines du lundi au dimanche, trois pastilles par jour puis « +N ».
 * Les jours hors du mois restent cliquables (ils font changer de mois) et affichent leurs occurrences en grisé.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { isCanceled, occurrenceTone } from '@/features/calendar/occurrences';
import type { CalendarOccurrence } from '@/features/calendar/types';

const MAX_PILLS = 3;

const props = defineProps<{
    /** Mois affiché, `yyyy-MM`. */
    monthPrefix: string;
    days: string[];
    weekCount: number;
    byDay: Map<string, CalendarOccurrence[]>;
    selected: string;
    today: string;
    label: string;
}>();

const emit = defineEmits<{ select: [ymd: string] }>();

const { t, locale } = useI18n();

/** Lundi → dimanche, libellés courts localisés (1er janvier 2024 = lundi). */
const weekdays = computed(() =>
    Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(new Date(2024, 0, 1 + i)))
);

const cells = computed(() =>
    props.days.map((ymd) => ({
        ymd,
        day: Number(ymd.slice(8, 10)),
        inMonth: ymd.startsWith(props.monthPrefix),
        occurrences: props.byDay.get(ymd) ?? []
    }))
);

function toneClass(occurrence: CalendarOccurrence) {
    return [`cal-tone--${occurrenceTone(occurrence)}`, { 'cal-is-canceled': isCanceled(occurrence) }];
}

function toneStyle(occurrence: CalendarOccurrence) {
    return occurrence.color && !occurrence.sourceKey ? { '--event-color': occurrence.color } : undefined;
}
</script>

<template>
    <section class="cal-month" :aria-label="label">
        <div class="cal-month__weekdays" aria-hidden="true">
            <span v-for="weekday in weekdays" :key="weekday">{{ weekday }}</span>
        </div>
        <div class="cal-month__grid" role="grid" :style="{ '--weeks': weekCount }">
            <button
                v-for="cell in cells"
                :key="cell.ymd"
                type="button"
                role="gridcell"
                class="cal-month__cell"
                :class="{
                    'is-out': !cell.inMonth,
                    'is-today': cell.ymd === today,
                    'is-selected': cell.ymd === selected
                }"
                :aria-selected="cell.ymd === selected"
                :aria-label="`${cell.day} · ${t('calendarPage.eventCount', { count: cell.occurrences.length }, cell.occurrences.length)}`"
                @click="emit('select', cell.ymd)"
            >
                <span class="cal-month__day">
                    {{ cell.day }}
                    <span v-if="cell.ymd === today" class="cal-month__today-mark" aria-hidden="true" />
                </span>
                <span class="cal-month__events">
                    <span
                        v-for="occurrence in cell.occurrences.slice(0, MAX_PILLS)"
                        :key="occurrence.id"
                        class="cal-month__event"
                        :class="toneClass(occurrence)"
                        :style="toneStyle(occurrence)"
                    >
                        <span class="su-sq" aria-hidden="true" />
                        <span class="cal-month__event-title">{{ occurrence.title }}</span>
                    </span>
                    <span v-if="cell.occurrences.length > MAX_PILLS" class="cal-month__more">
                        {{ t('calendarPage.more', { count: cell.occurrences.length - MAX_PILLS }) }}
                    </span>
                </span>
                <span v-if="cell.occurrences.length" class="cal-month__dots" aria-hidden="true">
                    <span
                        v-for="occurrence in cell.occurrences.slice(0, 4)"
                        :key="occurrence.id"
                        class="su-sq"
                        :class="toneClass(occurrence)"
                        :style="toneStyle(occurrence)"
                    />
                </span>
            </button>
        </div>
    </section>
</template>

<style scoped>
/* ── grille mensuelle : en-tête sur filet 2 px, cellules sur filets fins ── */
.cal-month {
    min-width: 0;
}

.cal-month__weekdays {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    padding: 0 0 10px;
    border-bottom: 1px solid var(--line);
    color: var(--gray);
    font-size: 12.5px;
}

.cal-month__weekdays span {
    padding-left: 8px;
}

.cal-month__grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    grid-template-rows: repeat(var(--weeks, 6), minmax(104px, auto));
    border-left: 1px solid var(--line);
}

.cal-month__cell {
    appearance: none;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    min-width: 0;
    padding: 8px;
    border: 0;
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    border-radius: 0;
    background: transparent;
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    transition: background 0.15s var(--ease);
}

.cal-month__cell:hover {
    background: var(--soft);
}

.cal-month__cell:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: -2px;
}

.cal-month__cell.is-out {
    color: var(--gray);
}

.cal-month__cell.is-out .cal-month__day {
    font-weight: 400;
}

.cal-month__cell.is-out .cal-month__events,
.cal-month__cell.is-out .cal-month__dots {
    opacity: 0.55;
}

/* sélection : cadre 2 px noir, jamais de fond coloré */
.cal-month__cell.is-selected {
    box-shadow: inset 0 0 0 2px var(--ink);
}

.cal-month__day {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
}

/* aujourd’hui : petit carré bleu 6 px à côté du numéro */
.cal-month__today-mark {
    display: inline-block;
    width: 6px;
    height: 6px;
    background: var(--blue);
}

.cal-month__events {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
}

.cal-month__event {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    color: var(--tone-ink);
    font-size: 13px;
    line-height: 1.35;
}

.cal-month__event-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cal-month__more {
    padding-left: 13px;
    color: var(--gray);
    font-size: 12.5px;
}

.cal-month__dots {
    display: none;
    gap: 3px;
    justify-content: center;
}

@media (max-width: 767px) {
    .cal-month__weekdays span {
        padding-left: 0;
        text-align: center;
    }

    .cal-month__grid {
        grid-template-rows: repeat(var(--weeks, 6), 52px);
    }

    .cal-month__cell {
        align-items: center;
        gap: 4px;
        padding: 6px 2px;
    }

    .cal-month__events {
        display: none;
    }

    .cal-month__dots {
        display: flex;
    }
}
</style>
