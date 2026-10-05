<script setup lang="ts">
/**
 * Calendrier — maquette de style. Les événements viennent de `calendar-mock.ts` (TEMPORAIRE),
 * en attendant le branchement sur les récurrences, échéances et objectifs.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { CalendarEventIcon, ChevronLeftIcon, ChevronRightIcon } from 'vue-tabler-icons';
import AppBoard from '@/components/shared/board/AppBoard.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { mockEventsForMonth, toYmd, type CalendarEvent, type CalendarEventKind } from '@/views/app/calendar/calendar-mock';

const MAX_PILLS = 3;
const KINDS: CalendarEventKind[] = ['income', 'expense', 'due', 'goal'];

const { t, locale } = useI18n();

const today = new Date();
const todayYmd = toYmd(today.getFullYear(), today.getMonth(), today.getDate());

const year = ref(today.getFullYear());
const month = ref(today.getMonth());
const selected = ref(todayYmd);

const events = computed(() => mockEventsForMonth(year.value, month.value));
const eventsByDay = computed(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events.value) {
        const list = map.get(event.date) ?? [];
        list.push(event);
        map.set(event.date, list);
    }
    return map;
});

const monthTitle = computed(() => {
    const label = new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(new Date(year.value, month.value, 1));
    return label.charAt(0).toUpperCase() + label.slice(1);
});

/** Lundi → dimanche, libellés courts localisés (1er janvier 2024 = lundi). */
const weekdays = computed(() =>
    Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(new Date(2024, 0, 1 + i)))
);

type Cell = { ymd: string; day: number; inMonth: boolean; weekend: boolean; events: CalendarEvent[] };

/** Décalage du 1er du mois dans une semaine commençant le lundi. */
const firstOffset = computed(() => (new Date(year.value, month.value, 1).getDay() + 6) % 7);
/** 4 à 6 semaines selon le mois : pas de rangée entière hors du mois. */
const weekCount = computed(() => Math.ceil((firstOffset.value + new Date(year.value, month.value + 1, 0).getDate()) / 7));

const cells = computed<Cell[]>(() => {
    const offset = firstOffset.value;
    return Array.from({ length: weekCount.value * 7 }, (_, i) => {
        const date = new Date(year.value, month.value, 1 - offset + i);
        const ymd = toYmd(date.getFullYear(), date.getMonth(), date.getDate());
        const inMonth = date.getMonth() === month.value;
        return {
            ymd,
            day: date.getDate(),
            inMonth,
            weekend: i % 7 >= 5,
            events: inMonth ? (eventsByDay.value.get(ymd) ?? []) : []
        };
    });
});

const selectedEvents = computed(() => eventsByDay.value.get(selected.value) ?? []);
const selectedTitle = computed(() => {
    const [y, m, d] = selected.value.split('-').map(Number);
    const label = new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(y, m - 1, d));
    return label.charAt(0).toUpperCase() + label.slice(1);
});

const inflows = computed(() => events.value.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0));
const outflows = computed(() => events.value.filter((e) => e.amount < 0).reduce((sum, e) => sum + e.amount, 0));
const balance = computed(() => inflows.value + outflows.value);

/** Prochaines échéances du mois affiché, à partir d’aujourd’hui. */
const upcomingDues = computed(() => {
    const monthStart = toYmd(year.value, month.value, 1);
    const from = monthStart > todayYmd ? monthStart : todayYmd;
    return events.value.filter((e) => e.kind === 'due' && e.date >= from).slice(0, 3);
});

function formatAmount(amount: number, signed = true): string {
    const formatted = new Intl.NumberFormat(locale.value, { style: 'currency', currency: 'CHF' }).format(Math.abs(amount));
    if (!signed) return formatted;
    return `${amount < 0 ? '−' : '+'}${formatted}`;
}

function shortDate(ymd: string): string {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Intl.DateTimeFormat(locale.value, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d));
}

function shiftMonth(delta: number) {
    const next = new Date(year.value, month.value + delta, 1);
    year.value = next.getFullYear();
    month.value = next.getMonth();
    selected.value = toYmd(year.value, month.value, 1);
}

function goToday() {
    year.value = today.getFullYear();
    month.value = today.getMonth();
    selected.value = todayYmd;
}

function selectCell(cell: Cell) {
    if (!cell.inMonth) {
        const [y, m] = cell.ymd.split('-').map(Number);
        year.value = y;
        month.value = m - 1;
    }
    selected.value = cell.ymd;
}
</script>

<template>
    <AppPageShell :title="t('calendarPage.title')" :body-scroll="false">
        <AppBoard>
            <template #bar>
                <div class="cal-bar">
                    <button
                        type="button"
                        class="su-btn su-btn--ghost cal-bar__nav"
                        :aria-label="t('calendarPage.previous')"
                        @click="shiftMonth(-1)"
                    >
                        <ChevronLeftIcon :size="18" stroke-width="1.8" />
                    </button>
                    <h2 class="cal-bar__title">{{ monthTitle }}</h2>
                    <button
                        type="button"
                        class="su-btn su-btn--ghost cal-bar__nav"
                        :aria-label="t('calendarPage.next')"
                        @click="shiftMonth(1)"
                    >
                        <ChevronRightIcon :size="18" stroke-width="1.8" />
                    </button>
                </div>
            </template>
            <template #actions>
                <button type="button" class="su-btn su-btn--ink app-board__primary" @click="goToday">
                    <CalendarEventIcon :size="16" stroke-width="1.6" />
                    <span class="app-board__label">{{ t('calendarPage.today') }}</span>
                </button>
            </template>

            <div class="cal">
                <section class="cal__month" :aria-label="monthTitle">
                    <div class="cal__weekdays" aria-hidden="true">
                        <span v-for="label in weekdays" :key="label">{{ label }}</span>
                    </div>
                    <div class="cal__grid" role="grid" :style="{ '--weeks': weekCount }">
                        <button
                            v-for="cell in cells"
                            :key="cell.ymd"
                            type="button"
                            role="gridcell"
                            class="cal__cell"
                            :class="{
                                'is-out': !cell.inMonth,
                                'is-weekend': cell.weekend,
                                'is-today': cell.ymd === todayYmd,
                                'is-selected': cell.ymd === selected
                            }"
                            :aria-selected="cell.ymd === selected"
                            :aria-label="`${cell.day} · ${t('calendarPage.eventCount', { count: cell.events.length }, cell.events.length)}`"
                            @click="selectCell(cell)"
                        >
                            <span class="cal__day">{{ cell.day }}</span>
                            <span class="cal__pills">
                                <span
                                    v-for="event in cell.events.slice(0, MAX_PILLS)"
                                    :key="event.id"
                                    class="cal__pill"
                                    :class="`cal-tone--${event.kind}`"
                                >
                                    <span class="cal__pill-title">{{ event.title }}</span>
                                </span>
                                <span v-if="cell.events.length > MAX_PILLS" class="cal__more">
                                    {{ t('calendarPage.more', { count: cell.events.length - MAX_PILLS }) }}
                                </span>
                            </span>
                            <span v-if="cell.events.length" class="cal__dots" aria-hidden="true">
                                <span
                                    v-for="event in cell.events.slice(0, 4)"
                                    :key="event.id"
                                    class="cal__dot"
                                    :class="`cal-tone--${event.kind}`"
                                />
                            </span>
                        </button>
                    </div>
                </section>

                <aside class="cal__side">
                    <div class="cal-card">
                        <p class="cal-card__eyebrow">{{ t('calendarPage.selectedDay') }}</p>
                        <h3 class="cal-card__title">{{ selectedTitle }}</h3>
                        <ul v-if="selectedEvents.length" class="cal-list">
                            <li v-for="event in selectedEvents" :key="event.id" class="cal-list__item">
                                <span class="cal-list__bar" :class="`cal-tone--${event.kind}`" />
                                <span class="cal-list__main">
                                    <span class="cal-list__title">{{ event.title }}</span>
                                    <span class="cal-list__meta">
                                        {{ t(`calendarPage.kinds.${event.kind}`) }} · {{ event.account
                                        }}<template v-if="event.note"> · {{ event.note }}</template>
                                    </span>
                                </span>
                                <span class="cal-list__amount" :class="event.amount < 0 ? 'is-out' : 'is-in'">{{
                                    formatAmount(event.amount)
                                }}</span>
                            </li>
                        </ul>
                        <p v-else class="cal-card__empty">{{ t('calendarPage.emptyDay') }}</p>
                    </div>

                    <div class="cal-card">
                        <p class="cal-card__eyebrow">{{ t('calendarPage.monthSummary') }}</p>
                        <div class="cal-summary">
                            <div class="cal-summary__row">
                                <span>{{ t('calendarPage.inflows') }}</span>
                                <strong class="is-in">{{ formatAmount(inflows) }}</strong>
                            </div>
                            <div class="cal-summary__row">
                                <span>{{ t('calendarPage.outflows') }}</span>
                                <strong class="is-out">{{ formatAmount(outflows) }}</strong>
                            </div>
                            <div class="cal-summary__row cal-summary__row--total">
                                <span>{{ t('calendarPage.balance') }}</span>
                                <strong :class="balance < 0 ? 'is-out' : 'is-in'">{{ formatAmount(balance) }}</strong>
                            </div>
                        </div>
                    </div>

                    <div v-if="upcomingDues.length" class="cal-card">
                        <p class="cal-card__eyebrow">{{ t('calendarPage.upcomingDues') }}</p>
                        <ul class="cal-list">
                            <li v-for="event in upcomingDues" :key="event.id" class="cal-list__item">
                                <span class="cal-list__bar cal-tone--due" />
                                <span class="cal-list__main">
                                    <span class="cal-list__title">{{ event.title }}</span>
                                    <span class="cal-list__meta">{{ shortDate(event.date) }}</span>
                                </span>
                                <span class="cal-list__amount is-out">{{ formatAmount(event.amount, false) }}</span>
                            </li>
                        </ul>
                    </div>

                    <div class="cal-legend">
                        <span v-for="kind in KINDS" :key="kind" class="cal-legend__item">
                            <span class="cal__dot" :class="`cal-tone--${kind}`" />
                            {{ t(`calendarPage.kinds.${kind}`) }}
                        </span>
                    </div>
                </aside>
            </div>
        </AppBoard>
    </AppPageShell>
</template>

<style scoped>
/* ── barre ─────────────────────────────────────────── */
.cal-bar {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
}

.cal-bar__nav {
    width: 36px;
    min-width: 36px;
    height: 36px;
    padding: 0;
    justify-content: center;
}

.cal-bar__title {
    margin: 0 6px;
    min-width: 9.5em;
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    text-align: center;
    color: var(--ink);
    white-space: nowrap;
}

/* ── tons ─────────────────────────────────────────── */
.cal-tone--income {
    --tone: var(--v-theme-success);
}

.cal-tone--expense {
    --tone: var(--v-theme-error);
}

.cal-tone--due {
    --tone: var(--v-theme-warning);
}

.cal-tone--goal {
    --tone: var(--v-theme-primary);
}

/* ── mise en page ─────────────────────────────────── */
.cal {
    flex: 1 1 auto;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 18px;
    padding: 18px;
    overflow: auto;
}

.cal__month {
    display: flex;
    flex-direction: column;
    min-height: 520px;
}

.cal__weekdays {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    padding: 0 2px 8px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-muted);
}

.cal__weekdays span {
    padding-left: 10px;
}

.cal__grid {
    flex: 1 1 auto;
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    grid-template-rows: repeat(var(--weeks, 6), minmax(84px, 1fr));
    gap: 6px;
}

/* ── cellule ──────────────────────────────────────── */
.cal__cell {
    appearance: none;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    min-width: 0;
    padding: 8px;
    border: 1px solid var(--thread);
    border-radius: 14px;
    background: var(--surface-raised);
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        background 0.2s ease;
}

.cal__cell:hover {
    border-color: rgba(var(--v-theme-primary), 0.35);
    background: var(--surface-hover);
}

.cal__cell:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.18);
}

.cal__cell.is-weekend {
    background: var(--surface);
}

.cal__cell.is-out {
    background: transparent;
    border-style: dashed;
    color: var(--ink-muted);
    opacity: 0.55;
}

.cal__cell.is-selected {
    border-color: rgba(var(--v-theme-primary), 0.7);
    box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.12);
}

.cal__day {
    align-self: flex-start;
    display: inline-grid;
    place-items: center;
    min-width: 26px;
    height: 26px;
    padding: 0 6px;
    border-radius: 999px;
    font-size: 0.82rem;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
}

.cal__cell.is-today .cal__day {
    background: rgb(var(--v-theme-primary));
    color: rgb(var(--v-theme-on-primary));
}

.cal__pills {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
}

.cal__pill {
    display: block;
    min-width: 0;
    padding: 2px 7px;
    border-left: 3px solid rgb(var(--tone));
    border-radius: 6px;
    background: rgba(var(--tone), 0.1);
    font-size: 0.7rem;
    font-weight: 600;
    line-height: 1.35;
}

.cal__pill-title {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cal__more {
    padding-left: 7px;
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--ink-muted);
}

.cal__dots {
    display: none;
    gap: 3px;
    justify-content: center;
}

.cal__dot {
    display: inline-block;
    flex: none;
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: rgb(var(--tone));
}

/* ── panneau latéral ──────────────────────────────── */
.cal__side {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
}

.cal-card {
    padding: 16px;
    border: 1px solid var(--thread);
    border-radius: 18px;
    background: var(--surface-raised);
}

.cal-card__eyebrow {
    margin: 0;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-muted);
}

.cal-card__title {
    margin: 4px 0 10px;
    font-size: 1rem;
    font-weight: 700;
    color: var(--ink);
}

.cal-card__empty {
    margin: 0;
    font-size: 0.82rem;
    color: var(--ink-muted);
}

.cal-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
}

.cal-card__title + .cal-list {
    margin-top: 0;
}

.cal-list__item {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.cal-list__bar {
    flex: none;
    align-self: stretch;
    width: 4px;
    border-radius: 999px;
    background: rgb(var(--tone));
}

.cal-list__main {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
}

.cal-list__title {
    overflow: hidden;
    font-size: 0.86rem;
    font-weight: 650;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--ink);
}

.cal-list__meta {
    overflow: hidden;
    font-size: 0.72rem;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--ink-muted);
}

.cal-list__amount {
    flex: none;
    font-size: 0.84rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.is-in {
    color: rgb(var(--v-theme-success));
}

.is-out {
    color: var(--ink);
}

.cal-summary {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
}

.cal-summary__row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    font-size: 0.84rem;
    color: var(--ink-muted);
}

.cal-summary__row strong {
    font-variant-numeric: tabular-nums;
}

.cal-summary__row--total {
    padding-top: 8px;
    border-top: 1px solid var(--thread);
    font-weight: 650;
    color: var(--ink);
}

.cal-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    padding: 2px 4px;
    font-size: 0.74rem;
    color: var(--ink-muted);
}

.cal-legend__item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

/* ── responsive ───────────────────────────────────── */
@media (max-width: 1100px) {
    .cal {
        grid-template-columns: minmax(0, 1fr);
    }

    .cal__side {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        align-items: start;
    }
}

@media (max-width: 767px) {
    .cal {
        gap: 14px;
        padding: 12px;
    }

    .cal__month {
        min-height: 0;
    }

    .cal__weekdays span {
        padding-left: 0;
        text-align: center;
    }

    .cal__grid {
        grid-template-rows: repeat(var(--weeks, 6), 52px);
        gap: 4px;
    }

    .cal__cell {
        align-items: center;
        padding: 6px 2px;
        border-radius: 12px;
    }

    .cal__day {
        align-self: center;
    }

    .cal__pills {
        display: none;
    }

    .cal__dots {
        display: flex;
    }

    .cal__side {
        display: flex;
        align-items: stretch;
    }

    .cal-bar__title {
        min-width: 0;
        font-size: 0.95rem;
    }
}
</style>
