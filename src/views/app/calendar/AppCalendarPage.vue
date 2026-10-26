<script setup lang="ts">
/**
 * Calendrier — maquette de style. Les événements viennent de `calendar-mock.ts` (TEMPORAIRE),
 * en attendant le branchement sur les récurrences, échéances et objectifs.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ChevronLeftIcon, ChevronRightIcon } from 'vue-tabler-icons';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { formatAccountBalance } from '@/features/accounts/format';
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
    const formatted = formatAccountBalance(Math.abs(amount), 'CHF');
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
    <AppPageShell :title="t('calendarPage.title')">
        <!-- Navigation : boutons-icônes carrés, titre du mois 16 px 700, « Aujourd’hui » discret. -->
        <div class="cal-bar">
            <button type="button" class="su-orb" :aria-label="t('calendarPage.previous')" @click="shiftMonth(-1)">
                <ChevronLeftIcon :size="18" stroke-width="1.8" />
            </button>
            <h2 class="cal-bar__title" aria-live="polite">{{ monthTitle }}</h2>
            <button type="button" class="su-orb" :aria-label="t('calendarPage.next')" @click="shiftMonth(1)">
                <ChevronRightIcon :size="18" stroke-width="1.8" />
            </button>
            <button type="button" class="su-btn su-btn--ghost cal-bar__today" @click="goToday">
                {{ t('calendarPage.today') }}
            </button>
        </div>

        <div class="su-g12 cal">
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
                            'is-today': cell.ymd === todayYmd,
                            'is-selected': cell.ymd === selected
                        }"
                        :aria-selected="cell.ymd === selected"
                        :aria-label="`${cell.day} · ${t('calendarPage.eventCount', { count: cell.events.length }, cell.events.length)}`"
                        @click="selectCell(cell)"
                    >
                        <span class="cal__day">
                            {{ cell.day }}
                            <span v-if="cell.ymd === todayYmd" class="cal__today-mark" aria-hidden="true" />
                        </span>
                        <span class="cal__events">
                            <span
                                v-for="event in cell.events.slice(0, MAX_PILLS)"
                                :key="event.id"
                                class="cal__event"
                                :class="`cal-tone--${event.kind}`"
                            >
                                <span class="su-sq" aria-hidden="true" />
                                <span class="cal__event-title">{{ event.title }}</span>
                            </span>
                            <span v-if="cell.events.length > MAX_PILLS" class="cal__more">
                                {{ t('calendarPage.more', { count: cell.events.length - MAX_PILLS }) }}
                            </span>
                        </span>
                        <span v-if="cell.events.length" class="cal__dots" aria-hidden="true">
                            <span
                                v-for="event in cell.events.slice(0, 4)"
                                :key="event.id"
                                class="su-sq"
                                :class="`cal-tone--${event.kind}`"
                            />
                        </span>
                    </button>
                </div>
            </section>

            <aside class="cal__side su-stack su-stack--tight">
                <section class="su-section">
                    <header class="su-section__head cal-side__head">
                        <div>
                            <p class="cal-side__eyebrow">{{ t('calendarPage.selectedDay') }}</p>
                            <h2>{{ selectedTitle }}</h2>
                        </div>
                    </header>
                    <ul v-if="selectedEvents.length" class="cal-list">
                        <li v-for="event in selectedEvents" :key="event.id" class="cal-list__item" :class="`cal-tone--${event.kind}`">
                            <span class="su-sq cal-list__sq" aria-hidden="true" />
                            <span class="cal-list__main">
                                <span class="cal-list__title">{{ event.title }}</span>
                                <span class="cal-list__meta">
                                    {{ t(`calendarPage.kinds.${event.kind}`) }} · {{ event.account
                                    }}<template v-if="event.note"> · {{ event.note }}</template>
                                </span>
                            </span>
                            <span class="cal-list__amount" :class="event.amount < 0 ? 'su-neg' : 'su-pos'">{{
                                formatAmount(event.amount)
                            }}</span>
                        </li>
                    </ul>
                    <p v-else class="cal-side__empty">{{ t('calendarPage.emptyDay') }}</p>
                </section>

                <section class="su-section">
                    <header class="su-section__head">
                        <h2>{{ t('calendarPage.monthSummary') }}</h2>
                    </header>
                    <dl class="cal-summary">
                        <div class="su-kv">
                            <dt>{{ t('calendarPage.inflows') }}</dt>
                            <dd class="su-pos">{{ formatAmount(inflows) }}</dd>
                        </div>
                        <div class="su-kv">
                            <dt>{{ t('calendarPage.outflows') }}</dt>
                            <dd class="su-neg">{{ formatAmount(outflows) }}</dd>
                        </div>
                        <div class="su-kv su-kv--strong">
                            <dt>{{ t('calendarPage.balance') }}</dt>
                            <dd :class="balance < 0 ? 'su-neg' : 'su-pos'">{{ formatAmount(balance) }}</dd>
                        </div>
                    </dl>
                </section>

                <section v-if="upcomingDues.length" class="su-section">
                    <header class="su-section__head">
                        <h2>{{ t('calendarPage.upcomingDues') }}</h2>
                    </header>
                    <ul class="cal-list">
                        <li v-for="event in upcomingDues" :key="event.id" class="cal-list__item cal-tone--due">
                            <span class="su-sq cal-list__sq" aria-hidden="true" />
                            <span class="cal-list__main">
                                <span class="cal-list__title">{{ event.title }}</span>
                                <span class="cal-list__meta">{{ shortDate(event.date) }}</span>
                            </span>
                            <span class="cal-list__amount su-neg">{{ formatAmount(event.amount, false) }}</span>
                        </li>
                    </ul>
                </section>

                <div class="cal-legend">
                    <span v-for="kind in KINDS" :key="kind" class="su-chip cal-legend__item" :class="`cal-tone--${kind}`">
                        {{ t(`calendarPage.kinds.${kind}`) }}
                    </span>
                </div>
            </aside>
        </div>
    </AppPageShell>
</template>

<style scoped>
/* ── tons : charge noir, revenu bleu, épargne violet, échéance gris ── */
.cal-tone--income {
    --tone: var(--blue);
    --tone-ink: var(--blue-ink);
}

.cal-tone--expense {
    --tone: var(--ink);
    --tone-ink: var(--ink);
}

.cal-tone--due {
    --tone: var(--gray);
    --tone-ink: var(--gray);
}

.cal-tone--goal {
    --tone: var(--violet);
    --tone-ink: var(--violet-ink);
}

.cal-tone--income .su-sq,
.cal-tone--expense .su-sq,
.cal-tone--due .su-sq,
.cal-tone--goal .su-sq,
.su-sq.cal-tone--income,
.su-sq.cal-tone--expense,
.su-sq.cal-tone--due,
.su-sq.cal-tone--goal {
    --sq-color: var(--tone);
}

.cal-legend__item {
    --chip-color: var(--tone);
}

/* ── barre de navigation ─────────────────────────────── */
.cal-bar {
    display: flex;
    align-items: center;
    gap: 4px;
    margin: 0 0 24px;
}

.cal-bar__title {
    margin: 0 8px;
    min-width: 9.5em;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.025em;
    text-align: center;
    white-space: nowrap;
}

.cal-bar__today {
    margin-left: auto;
}

/* ── grille mensuelle : en-tête sur filet 2 px, cellules sur filets fins ── */
.cal__month {
    grid-column: span 8;
    min-width: 0;
}

.cal__weekdays {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    padding: 0 0 10px;
    border-bottom: 1px solid var(--line);
    color: var(--gray);
    font-size: 12.5px;
}

.cal__weekdays span {
    padding-left: 8px;
}

.cal__grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    grid-template-rows: repeat(var(--weeks, 6), minmax(104px, auto));
    border-left: 1px solid var(--line);
}

.cal__cell {
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

.cal__cell:hover {
    background: var(--soft);
}

.cal__cell:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: -2px;
}

.cal__cell.is-out {
    color: var(--gray);
}

.cal__cell.is-out .cal__day {
    font-weight: 400;
}

/* sélection : cadre 2 px noir, jamais de fond coloré */
.cal__cell.is-selected {
    box-shadow: inset 0 0 0 2px var(--ink);
}

.cal__day {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
}

/* aujourd’hui : petit carré bleu 6 px à côté du numéro */
.cal__today-mark {
    display: inline-block;
    width: 6px;
    height: 6px;
    background: var(--blue);
}

.cal__events {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
}

.cal__event {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    color: var(--tone-ink);
    font-size: 13px;
    line-height: 1.35;
}

.cal__event-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cal__more {
    padding-left: 13px;
    color: var(--gray);
    font-size: 12.5px;
}

.cal__dots {
    display: none;
    gap: 3px;
    justify-content: center;
}

/* ── panneau latéral : sections à filet 2 px, listes sur filets fins ── */
.cal__side {
    grid-column: span 4;
    min-width: 0;
}

.cal-side__head {
    align-items: flex-start;
}

.cal-side__eyebrow {
    margin: 0 0 4px;
    color: var(--gray);
    font-size: 13px;
}

.cal-side__empty {
    margin: 0;
    color: var(--gray);
    font-size: 14px;
}

.cal-list {
    margin: 0;
    padding: 0;
    list-style: none;
}

.cal-list__item {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 10px 0;
    border-top: 1px solid var(--line);
}

.cal-list__item:first-child {
    border-top: 0;
    padding-top: 0;
}

.cal-list__sq {
    flex: none;
}

.cal-list__main {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
}

.cal-list__title {
    overflow: hidden;
    font-size: 14px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cal-list__meta {
    overflow: hidden;
    color: var(--gray);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cal-list__amount {
    flex: none;
    font-size: 14px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.cal-summary {
    margin: 0;
}

.cal-summary dt,
.cal-summary dd {
    margin: 0;
}

.cal-summary dd {
    font-weight: 700;
}

.cal-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
}

/* ── responsive ───────────────────────────────────────── */
@media (max-width: 767px) {
    .cal-bar__title {
        min-width: 0;
    }

    .cal__weekdays span {
        padding-left: 0;
        text-align: center;
    }

    .cal__grid {
        grid-template-rows: repeat(var(--weeks, 6), 52px);
    }

    .cal__cell {
        align-items: center;
        gap: 4px;
        padding: 6px 2px;
    }

    .cal__events {
        display: none;
    }

    .cal__dots {
        display: flex;
    }
}
</style>
