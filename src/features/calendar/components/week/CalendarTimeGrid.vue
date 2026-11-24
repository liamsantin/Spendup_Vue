<script setup lang="ts">
/**
 * Grille horaire des vues Semaine et Jour : en-tête des jours, bandeau « journée entière », 24 heures qui défilent
 * (ouverture vers 7 h) et ligne « maintenant ». Les blocs qui se chevauchent se partagent la largeur de la colonne.
 * Un clic sur un créneau libre ouvre la création rapide.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import CalendarQuickCreate from '@/features/calendar/components/week/CalendarQuickCreate.vue';
import { parseYmd, ymdOf } from '@/features/calendar/dates';
import {
    isCanceled,
    isEditableOccurrence,
    occurrenceTimeRange,
    occurrenceTone,
    occurrenceToneStyle
} from '@/features/calendar/occurrences';
import { DAY_MINUTES, layoutDay, minutesToHhmm, snapToSlot, wallMinutes } from '@/features/calendar/timegrid';
import type { CalendarOccurrence } from '@/features/calendar/types';

const HOUR_PX = 48;
const OPEN_AT_HOUR = 7;
const MAX_BAND_ITEMS = 3;
/** À partir de 19 h, l'encart de création rapide s'ouvre au-dessus du créneau pour rester dans la grille. */
const QUICK_ABOVE_FROM = 19 * 60;

const props = defineProps<{
    days: string[];
    byDay: Map<string, CalendarOccurrence[]>;
    today: string;
    label: string;
    /** Vue Semaine : un clic sur l'en-tête d'un jour ouvre la vue Jour. */
    dayLinks?: boolean;
}>();

const emit = defineEmits<{
    open: [occurrence: CalendarOccurrence];
    day: [ymd: string];
    more: [draft: { ymd: string; time: string; title: string }];
    created: [];
}>();

const { t, locale } = useI18n();

const scroller = ref<HTMLElement | null>(null);
const quick = ref<{ ymd: string; minutes: number } | null>(null);
const now = ref(new Date());
let timer: ReturnType<typeof setInterval> | undefined;

const hours = Array.from({ length: 23 }, (_, i) => ({ top: (i + 1) * HOUR_PX, label: minutesToHhmm((i + 1) * 60) }));

const columns = computed(() =>
    props.days.map((ymd) => {
        const date = parseYmd(ymd);
        return {
            ymd,
            weekday: new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(date),
            day: date.getDate(),
            fullLabel: new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long' }).format(date),
            layout: layoutDay(props.byDay.get(ymd) ?? [], ymd)
        };
    })
);

const nowTop = computed(() => (wallMinutes(now.value) * HOUR_PX) / 60);
const nowYmd = computed(() => ymdOf(now.value));

function px(minutes: number): string {
    return `${(minutes * HOUR_PX) / 60}px`;
}

function blockStyle(block: { startMin: number; endMin: number; column: number; columns: number; occurrence: CalendarOccurrence }) {
    const height = Math.max(block.endMin - block.startMin, 20);
    return {
        top: px(block.startMin),
        height: px(Math.min(height, DAY_MINUTES - block.startMin)),
        '--col': block.column,
        '--cols': block.columns,
        ...occurrenceToneStyle(block.occurrence)
    };
}

function onSlot(event: MouseEvent, ymd: string) {
    const column = event.currentTarget as HTMLElement;
    const minutes = snapToSlot(((event.clientY - column.getBoundingClientRect().top) / HOUR_PX) * 60);
    quick.value = { ymd, minutes };
}

function onCreated() {
    quick.value = null;
    emit('created');
}

function onMore(title: string) {
    if (!quick.value) return;
    emit('more', { ymd: quick.value.ymd, time: minutesToHhmm(quick.value.minutes), title });
    quick.value = null;
}

onMounted(() => {
    if (scroller.value) scroller.value.scrollTop = OPEN_AT_HOUR * HOUR_PX - 8;
    timer = setInterval(() => (now.value = new Date()), 60_000);
});

onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
    <section class="cal-week" :aria-label="label" :style="{ '--days': days.length, '--hour': `${HOUR_PX}px` }">
        <div class="cal-week__frame">
            <!-- en-tête des jours -->
            <div class="cal-week__row cal-week__head">
                <span class="cal-week__gutter" aria-hidden="true" />
                <component
                    :is="dayLinks ? 'button' : 'div'"
                    v-for="column in columns"
                    :key="column.ymd"
                    :type="dayLinks ? 'button' : undefined"
                    class="cal-week__day"
                    :class="{ 'is-today': column.ymd === today, 'is-link': dayLinks }"
                    :aria-label="column.fullLabel"
                    @click="dayLinks && emit('day', column.ymd)"
                >
                    <span class="cal-week__weekday">{{ column.weekday }}</span>
                    <span class="cal-week__num">
                        {{ column.day }}
                        <span v-if="column.ymd === today" class="cal-week__today-mark" aria-hidden="true" />
                    </span>
                </component>
            </div>

            <!-- bandeau journée entière -->
            <div class="cal-week__row cal-week__band">
                <span class="cal-week__gutter cal-week__band-label">{{ t('calendarPage.allDayShort') }}</span>
                <div v-for="column in columns" :key="column.ymd" class="cal-week__band-cell">
                    <component
                        :is="isEditableOccurrence(occurrence) ? 'button' : 'div'"
                        v-for="occurrence in column.layout.allDay.slice(0, MAX_BAND_ITEMS)"
                        :key="occurrence.id"
                        :type="isEditableOccurrence(occurrence) ? 'button' : undefined"
                        class="cal-week__chip"
                        :class="[`cal-tone--${occurrenceTone(occurrence)}`, { 'is-action': isEditableOccurrence(occurrence) }]"
                        :style="occurrenceToneStyle(occurrence)"
                        :title="occurrence.title"
                        @click="isEditableOccurrence(occurrence) && emit('open', occurrence)"
                    >
                        <span class="su-sq" aria-hidden="true" />
                        <span class="cal-week__chip-title" :class="{ 'cal-is-canceled': isCanceled(occurrence) }">{{
                            occurrence.title
                        }}</span>
                    </component>
                    <button
                        v-if="column.layout.allDay.length > MAX_BAND_ITEMS"
                        type="button"
                        class="cal-week__band-more"
                        @click="emit('day', column.ymd)"
                    >
                        {{ t('calendarPage.more', { count: column.layout.allDay.length - MAX_BAND_ITEMS }) }}
                    </button>
                </div>
            </div>

            <!-- heures -->
            <div ref="scroller" class="cal-week__scroll">
                <div class="cal-week__row cal-week__body">
                    <div class="cal-week__gutter cal-week__hours" aria-hidden="true">
                        <span v-for="hour in hours" :key="hour.label" class="cal-week__hour" :style="{ top: `${hour.top}px` }">
                            {{ hour.label }}
                        </span>
                    </div>
                    <div
                        v-for="(column, index) in columns"
                        :key="column.ymd"
                        class="cal-week__col"
                        :class="{ 'is-today': column.ymd === today }"
                        @click="onSlot($event, column.ymd)"
                    >
                        <component
                            :is="isEditableOccurrence(block.occurrence) ? 'button' : 'div'"
                            v-for="block in column.layout.timed"
                            :key="block.occurrence.id"
                            :type="isEditableOccurrence(block.occurrence) ? 'button' : undefined"
                            class="cal-week__block"
                            :class="[
                                `cal-tone--${occurrenceTone(block.occurrence)}`,
                                {
                                    'is-action': isEditableOccurrence(block.occurrence),
                                    'is-short': block.endMin - block.startMin < 45
                                }
                            ]"
                            :style="blockStyle(block)"
                            :title="`${block.occurrence.title} · ${occurrenceTimeRange(block.occurrence, locale) ?? ''}`"
                            @click.stop="isEditableOccurrence(block.occurrence) && emit('open', block.occurrence)"
                        >
                            <span class="cal-week__block-title" :class="{ 'cal-is-canceled': isCanceled(block.occurrence) }">
                                {{ block.occurrence.title }}
                            </span>
                            <span class="cal-week__block-time">{{ occurrenceTimeRange(block.occurrence, locale) }}</span>
                        </component>

                        <span
                            v-for="hour in hours"
                            :key="hour.label"
                            class="cal-week__line"
                            :style="{ top: `${hour.top}px` }"
                            aria-hidden="true"
                        />
                        <span v-if="column.ymd === nowYmd" class="cal-week__now" :style="{ top: `${nowTop}px` }" aria-hidden="true" />

                        <template v-if="quick && quick.ymd === column.ymd">
                            <span class="cal-week__ghost" :style="{ top: px(quick.minutes), height: px(60) }" aria-hidden="true" />
                            <CalendarQuickCreate
                                :ymd="column.ymd"
                                :time="minutesToHhmm(quick.minutes)"
                                :class="[
                                    index >= days.length - 2 && days.length > 2 ? 'cal-week__quick--end' : 'cal-week__quick',
                                    { 'cal-week__quick--above': quick.minutes >= QUICK_ABOVE_FROM }
                                ]"
                                :style="{ top: px(quick.minutes >= QUICK_ABOVE_FROM ? quick.minutes : quick.minutes + 60) }"
                                @created="onCreated"
                                @more="onMore"
                                @close="quick = null"
                            />
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
/* ── grille horaire : même filets fins que la vue Mois, heures en gris à gauche ── */
.cal-week {
    min-width: 0;
    overflow-x: auto;
}

.cal-week__frame {
    min-width: calc(56px + var(--days) * 88px);
}

.cal-week__row {
    display: grid;
    grid-template-columns: 56px repeat(var(--days), minmax(0, 1fr));
}

.cal-week__head,
.cal-week__band,
.cal-week__scroll {
    scrollbar-gutter: stable;
    overflow-y: hidden;
}

.cal-week__head {
    border-bottom: 1px solid var(--line);
}

.cal-week__day {
    appearance: none;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-width: 0;
    padding: 0 8px 10px;
    border: 0;
    background: none;
    color: var(--ink);
    font: inherit;
    text-align: left;
}

.cal-week__day.is-link {
    cursor: pointer;
}

.cal-week__day.is-link:hover .cal-week__num {
    text-decoration: underline;
    text-underline-offset: 3px;
}

.cal-week__day:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: -2px;
}

.cal-week__weekday {
    color: var(--gray);
    font-size: 12.5px;
}

.cal-week__num {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 18px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    line-height: 1.2;
}

/* aujourd’hui : petit carré bleu 6 px, comme dans la vue Mois */
.cal-week__today-mark {
    display: inline-block;
    width: 6px;
    height: 6px;
    background: var(--blue);
}

/* ── bandeau journée entière ── */
.cal-week__band {
    border-bottom: 1px solid var(--line);
}

.cal-week__band-label {
    align-self: center;
    padding-right: 8px;
    color: var(--gray);
    font-size: 12px;
    text-align: right;
}

.cal-week__band-cell {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    min-height: 32px;
    padding: 6px 4px;
    border-left: 1px solid var(--line);
}

.cal-week__chip {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 0;
    border: 0;
    background: none;
    color: var(--tone-ink);
    font: inherit;
    font-size: 12.5px;
    line-height: 1.35;
    text-align: left;
}

.cal-week__chip.is-action {
    cursor: pointer;
}

.cal-week__chip.is-action:hover .cal-week__chip-title {
    text-decoration: underline;
    text-underline-offset: 3px;
}

.cal-week__chip-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cal-week__band-more {
    appearance: none;
    padding: 0 0 0 13px;
    border: 0;
    background: none;
    color: var(--gray);
    font: inherit;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
}

/* ── heures ── */
.cal-week__scroll {
    max-height: min(68vh, 720px);
    overflow-y: auto;
}

.cal-week__body {
    position: relative;
    height: calc(var(--hour) * 24);
}

.cal-week__hours {
    position: relative;
}

.cal-week__hour {
    position: absolute;
    right: 8px;
    color: var(--gray);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    transform: translateY(-50%);
}

.cal-week__col {
    position: relative;
    min-width: 0;
    border-left: 1px solid var(--line);
    cursor: cell;
}

.cal-week__col.is-today {
    background: var(--soft);
}

.cal-week__line {
    position: absolute;
    z-index: 1;
    left: 0;
    right: 0;
    border-top: 1px solid var(--line);
    pointer-events: none;
}

.cal-week__block {
    appearance: none;
    position: absolute;
    z-index: 2;
    left: calc(var(--col) * 100% / var(--cols) + 2px);
    display: flex;
    flex-direction: column;
    gap: 1px;
    width: calc(100% / var(--cols) - 4px);
    min-width: 0;
    padding: 3px 6px;
    border: 0;
    border-left: 3px solid var(--tone);
    background: var(--bg);
    box-shadow: inset 0 0 0 1px var(--line);
    color: var(--ink);
    font: inherit;
    text-align: left;
    overflow: hidden;
    cursor: default;
}

.cal-week__block.is-action {
    cursor: pointer;
}

.cal-week__block.is-action:hover {
    box-shadow: inset 0 0 0 1px var(--ink);
}

.cal-week__block:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 1px;
}

.cal-week__block-title {
    overflow: hidden;
    font-size: 12.5px;
    font-weight: 700;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cal-week__block-time {
    overflow: hidden;
    color: var(--gray);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cal-week__block.is-short {
    flex-direction: row;
    align-items: baseline;
    gap: 6px;
    padding-top: 1px;
    padding-bottom: 1px;
}

/* maintenant : filet bleu 2 px, carré à gauche */
.cal-week__now {
    position: absolute;
    z-index: 3;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--blue);
    pointer-events: none;
}

.cal-week__now::before {
    content: '';
    position: absolute;
    left: -4px;
    top: -3px;
    width: 8px;
    height: 8px;
    background: var(--blue);
}

.cal-week__ghost {
    position: absolute;
    z-index: 2;
    left: 2px;
    right: 2px;
    border: 2px dashed var(--ink);
    pointer-events: none;
}

.cal-week__quick {
    left: 4px;
}

.cal-week__quick--end {
    right: 4px;
}

.cal-week__quick--above {
    transform: translateY(calc(-100% - 6px));
}
</style>
