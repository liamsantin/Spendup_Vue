<script setup lang="ts">
/**
 * Grille mensuelle : semaines selon le premier jour réglé, six pastilles par jour puis « +N ».
 * Les jours hors du mois restent cliquables (ils font changer de mois) et affichent leurs occurrences en grisé.
 * Double-clic : nouvel événement ce jour-là.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { isoWeek, parseYmd } from '@/features/calendar/dates';
import {
    dayTotal,
    formatOccurrenceAmount,
    isCanceled,
    occurrenceTone,
    occurrenceToneStyle,
    paymentStatus
} from '@/features/calendar/occurrences';
import type { CalendarOccurrence } from '@/features/calendar/types';

/** Pastilles visibles par jour avant « +N » (cellules hautes, pleine largeur). */
const MAX_PILLS = 6;

const props = defineProps<{
    /** Mois affiché, `yyyy-MM`. */
    monthPrefix: string;
    days: string[];
    /** Colonnes de la grille : 7, ou 5 quand les week-ends sont masqués. */
    columns?: number;
    weekCount: number;
    showWeekNumbers?: boolean;
    byDay: Map<string, CalendarOccurrence[]>;
    selected: string;
    today: string;
    label: string;
    /** Solde projeté par jour (`yyyy-MM-dd`) ; absent = non affiché. */
    forecast?: Map<string, { balance: number; atRisk: boolean }>;
    currency?: string | null;
}>();

const emit = defineEmits<{ select: [ymd: string]; create: [ymd: string]; viewAll: [ymd: string] }>();

const { t, locale } = useI18n();

const columnCount = computed(() => props.columns ?? 7);
/** Libellés de la première semaine affichée, dans l'ordre des colonnes. */
const weekdays = computed(() =>
    props.days.slice(0, columnCount.value).map((ymd) => new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(parseYmd(ymd)))
);

const cells = computed(() =>
    props.days.map((ymd) => ({
        ymd,
        day: Number(ymd.slice(8, 10)),
        inMonth: ymd.startsWith(props.monthPrefix),
        occurrences: props.byDay.get(ymd) ?? [],
        total: dayTotal(props.byDay.get(ymd) ?? [])
    }))
);

function toneClass(occurrence: CalendarOccurrence) {
    const status = paymentStatus(occurrence);
    return [`cal-tone--${occurrenceTone(occurrence)}`, { 'cal-is-canceled': isCanceled(occurrence) }, status ? `cal-pay--${status}` : ''];
}

const toneStyle = occurrenceToneStyle;
</script>

<template>
    <section class="cal-month" :aria-label="label" :style="{ '--cols': columnCount }">
        <div class="cal-month__weekdays" aria-hidden="true">
            <span v-for="(weekday, index) in weekdays" :key="index">{{ weekday }}</span>
        </div>
        <div class="cal-month__grid" role="grid" :style="{ '--weeks': weekCount }">
            <button
                v-for="(cell, index) in cells"
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
                @dblclick="emit('create', cell.ymd)"
            >
                <span class="cal-month__day">
                    <span
                        v-if="showWeekNumbers && index % columnCount === 0"
                        class="cal-month__weeknum"
                        :title="t('calendarPage.settings.weekNumber', { week: isoWeek(cell.ymd) })"
                    >
                        {{ isoWeek(cell.ymd) }}
                    </span>
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
                    <span
                        v-if="cell.occurrences.length > MAX_PILLS"
                        class="cal-month__more"
                        :title="t('calendarPage.viewDay')"
                        @click.stop="emit('viewAll', cell.ymd)"
                    >
                        {{ t('calendarPage.more', { count: cell.occurrences.length - MAX_PILLS }) }}
                    </span>
                </span>
                <span v-if="cell.total" class="cal-month__total" :class="cell.total.amount < 0 ? 'su-neg' : 'su-pos'">{{
                    formatOccurrenceAmount(cell.total.amount, cell.total.currency)
                }}</span>
                <span
                    v-if="forecast?.get(cell.ymd)"
                    class="cal-month__balance"
                    :class="{ 'cal-month__balance--risk': forecast.get(cell.ymd)!.atRisk }"
                    :title="t('calendarPage.projectedBalance')"
                    >{{ formatOccurrenceAmount(forecast.get(cell.ymd)!.balance, currency ?? '', false) }}</span
                >
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
    grid-template-columns: repeat(var(--cols, 7), minmax(0, 1fr));
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
    grid-template-columns: repeat(var(--cols, 7), minmax(0, 1fr));
    grid-template-rows: repeat(var(--weeks, 6), minmax(148px, auto));
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

.cal-month__weeknum {
    margin-right: 6px;
    color: var(--gray);
    font-size: 11px;
    font-weight: 500;
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
    cursor: pointer;
    padding-left: 13px;
    color: var(--gray);
    font-size: 12.5px;
}

.cal-month__balance {
    display: block;
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-size: 11px;
    opacity: 0.7;
}

.cal-month__balance--risk {
    color: var(--danger, #9b2c2c);
    opacity: 1;
    font-weight: 600;
}

.cal-month__total {
    margin-top: auto;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    text-align: right;
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

    .cal-month__events,
    .cal-month__total {
        display: none;
    }

    .cal-month__dots {
        display: flex;
    }
}
</style>
