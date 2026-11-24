<script setup lang="ts">
/**
 * Calendrier : navigation, vues Jour, Semaine, Mois et Agenda, formulaire d'événement. Charge les occurrences de la
 * période affichée (en vue Mois, toute la grille, jours des mois voisins compris) ; en mode démo, la même requête
 * est servie par `features/demo/calendar.ts`.
 *
 * Raccourcis : `T` aujourd'hui, `J` / `K` période précédente / suivante, `C` nouvel événement, `1` à `4` les vues.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import CalendarAgendaList from '@/features/calendar/components/agenda/CalendarAgendaList.vue';
import CalendarMonthGrid from '@/features/calendar/components/month/CalendarMonthGrid.vue';
import CalendarEventFormModal from '@/features/calendar/components/modals/CalendarEventFormModal.vue';
import CalendarDayPanel from '@/features/calendar/components/side/CalendarDayPanel.vue';
import CalendarMonthSummary from '@/features/calendar/components/side/CalendarMonthSummary.vue';
import CalendarTimeGrid from '@/features/calendar/components/week/CalendarTimeGrid.vue';
import { useCalendarOccurrences } from '@/features/calendar/composables/useCalendarOccurrences';
import { addDaysYmd, monthGrid, parseYmd, toYmd, weekDays, ymdOf } from '@/features/calendar/dates';
import { groupByDay, monthSummary, upcomingOutflows } from '@/features/calendar/occurrences';
import { CALENDAR_VIEWS, type CalendarOccurrence, type CalendarViewMode } from '@/features/calendar/types';

/** L'agenda charge 30 jours de plus à chaque fois, jusqu'à un an (fenêtre maximale de l'API). */
const AGENDA_STEP_DAYS = 30;
const AGENDA_MAX_DAYS = 365;

const view = defineModel<CalendarViewMode>('view', { required: true });

const { t, locale } = useI18n();

const todayYmd = ymdOf(new Date());
const selected = ref(todayYmd);
const agendaSpan = ref(AGENDA_STEP_DAYS);

const year = computed(() => Number(selected.value.slice(0, 4)));
const month = computed(() => Number(selected.value.slice(5, 7)) - 1);
const grid = computed(() => monthGrid(year.value, month.value));
const week = computed(() => weekDays(selected.value));

const range = computed(() => {
    switch (view.value) {
        case 'day':
            return { from: selected.value, to: selected.value };
        case 'week':
            return { from: week.value[0], to: week.value[6] };
        case 'agenda':
            return { from: selected.value, to: addDaysYmd(selected.value, agendaSpan.value - 1) };
        default:
            return { from: grid.value.from, to: grid.value.to };
    }
});
const from = computed(() => range.value.from);
const to = computed(() => range.value.to);
const { items, loading, error, reload } = useCalendarOccurrences(from, to);

watch(view, () => (agendaSpan.value = AGENDA_STEP_DAYS));

const byDay = computed(() => groupByDay(items.value));

// ── vue Mois ──
const monthPrefix = computed(() => selected.value.slice(0, 7));
const summary = computed(() => monthSummary(items.value, monthPrefix.value));
/** Prochaines sorties du mois affiché, à partir d’aujourd’hui. */
const upcoming = computed(() => {
    const monthStart = toYmd(year.value, month.value, 1);
    const next = new Date(year.value, month.value + 1, 1);
    return upcomingOutflows(items.value, monthStart > todayYmd ? monthStart : todayYmd, ymdOf(next));
});
const selectedItems = computed(() => byDay.value.get(selected.value) ?? []);
const selectedTitle = computed(() =>
    capitalize(new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long' }).format(parseYmd(selected.value)))
);

// ── vue Agenda ──
const agendaDays = computed(() => {
    if (view.value !== 'agenda') return [];
    const days: { ymd: string; items: CalendarOccurrence[] }[] = [];
    for (let ymd = from.value; ymd <= to.value; ymd = addDaysYmd(ymd, 1)) {
        const list = byDay.value.get(ymd);
        if (list?.length) days.push({ ymd, items: list });
    }
    return days;
});

function loadMoreAgenda() {
    agendaSpan.value = Math.min(agendaSpan.value + AGENDA_STEP_DAYS, AGENDA_MAX_DAYS);
}

// ── titre et navigation ──
function capitalize(label: string): string {
    return label.charAt(0).toUpperCase() + label.slice(1);
}

function rangeTitle(first: string, last: string): string {
    const sameYear = first.slice(0, 4) === last.slice(0, 4);
    const format = new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: sameYear ? 'long' : 'short', year: 'numeric' });
    return format.formatRange(parseYmd(first), parseYmd(last));
}

const title = computed(() => {
    switch (view.value) {
        case 'day':
            return capitalize(
                new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
                    parseYmd(selected.value)
                )
            );
        case 'week':
        case 'agenda':
            return rangeTitle(from.value, to.value);
        default:
            return capitalize(
                new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(new Date(year.value, month.value, 1))
            );
    }
});

function shift(delta: number) {
    switch (view.value) {
        case 'day':
            selected.value = addDaysYmd(selected.value, delta);
            break;
        case 'week':
            selected.value = addDaysYmd(selected.value, 7 * delta);
            break;
        case 'agenda':
            selected.value = addDaysYmd(selected.value, AGENDA_STEP_DAYS * delta);
            agendaSpan.value = AGENDA_STEP_DAYS;
            break;
        default:
            selected.value = ymdOf(new Date(year.value, month.value + delta, 1));
    }
}

function goToday() {
    selected.value = todayYmd;
    agendaSpan.value = AGENDA_STEP_DAYS;
}

function select(ymd: string) {
    selected.value = ymd;
}

function openDay(ymd: string) {
    selected.value = ymd;
    view.value = 'day';
}

// ── formulaire ──
const formOpen = ref(false);
const editing = ref<CalendarOccurrence | null>(null);
const draft = ref<{ date: string; time: string | null; title: string }>({ date: todayYmd, time: null, title: '' });

function createEvent(ymd = selected.value, time: string | null = null, eventTitle = '') {
    if (view.value === 'month') select(ymd);
    editing.value = null;
    draft.value = { date: ymd, time, title: eventTitle };
    formOpen.value = true;
}

function openEvent(occurrence: CalendarOccurrence) {
    editing.value = occurrence;
    formOpen.value = true;
}

// ── raccourcis clavier ──
function onKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
    if (formOpen.value || document.querySelector('.v-overlay--active')) return;

    const key = event.key.toLowerCase();
    const viewIndex = ['1', '2', '3', '4'].indexOf(key);
    if (key === 't') goToday();
    else if (key === 'j') shift(-1);
    else if (key === 'k') shift(1);
    else if (key === 'c') createEvent();
    else if (viewIndex !== -1) view.value = CALENDAR_VIEWS[viewIndex];
    else return;
    event.preventDefault();
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
    <div>
        <AppAlert v-if="error" type="error" class="cal-alert">
            {{ t('calendarPage.loadError') }}
        </AppAlert>

        <!-- Navigation : boutons-icônes carrés, titre de la période 16 px 700, « Aujourd’hui » discret. -->
        <div class="cal-bar">
            <button
                type="button"
                class="su-orb"
                :aria-label="t('calendarPage.previous')"
                :title="`${t('calendarPage.previous')} (J)`"
                @click="shift(-1)"
            >
                <ChevronLeftIcon :size="18" stroke-width="1.8" />
            </button>
            <h2 class="cal-bar__title" aria-live="polite">{{ title }}</h2>
            <button
                type="button"
                class="su-orb"
                :aria-label="t('calendarPage.next')"
                :title="`${t('calendarPage.next')} (K)`"
                @click="shift(1)"
            >
                <ChevronRightIcon :size="18" stroke-width="1.8" />
            </button>
            <button type="button" class="su-btn su-btn--ghost cal-bar__today" :title="`${t('calendarPage.today')} (T)`" @click="goToday">
                {{ t('calendarPage.today') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :title="`${t('calendarPage.newEvent')} (C)`" @click="createEvent()">
                <PlusIcon :size="16" stroke-width="2" aria-hidden="true" />
                {{ t('calendarPage.newEvent') }}
            </button>
        </div>

        <div v-if="view === 'month'" class="su-g12 cal">
            <CalendarMonthGrid
                class="cal__month"
                :month-prefix="monthPrefix"
                :days="grid.days"
                :week-count="grid.weekCount"
                :by-day="byDay"
                :selected="selected"
                :today="todayYmd"
                :label="title"
                @select="select"
                @create="createEvent"
            />

            <aside class="cal__side su-stack su-stack--tight">
                <CalendarDayPanel :title="selectedTitle" :items="selectedItems" @open="openEvent" />
                <CalendarMonthSummary :summary="summary" :upcoming="upcoming" />
            </aside>
        </div>

        <CalendarTimeGrid
            v-else-if="view === 'week' || view === 'day'"
            :key="view"
            :days="view === 'week' ? week : [selected]"
            :by-day="byDay"
            :today="todayYmd"
            :label="title"
            :day-links="view === 'week'"
            @open="openEvent"
            @day="openDay"
            @more="createEvent($event.ymd, $event.time, $event.title)"
            @created="reload"
        />

        <CalendarAgendaList
            v-else
            :days="agendaDays"
            :today="todayYmd"
            :label="title"
            :until="to"
            :can-load-more="agendaSpan < AGENDA_MAX_DAYS"
            :loading="loading"
            @open="openEvent"
            @more="loadMoreAgenda"
        />

        <CalendarEventFormModal
            v-model="formOpen"
            :event-public-id="editing?.eventPublicId ?? null"
            :occurrence="editing"
            :date="draft.date"
            :time="draft.time"
            :title="draft.title"
            @changed="reload"
        />
    </div>
</template>

<style scoped>
.cal-alert {
    margin: 0 0 16px;
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
    min-width: 13em;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.025em;
    text-align: center;
    white-space: nowrap;
}

.cal-bar__today {
    margin-left: auto;
    margin-right: 8px;
}

.cal__month {
    grid-column: span 8;
}

.cal__side {
    grid-column: span 4;
    min-width: 0;
}

@media (max-width: 767px) {
    .cal-bar {
        flex-wrap: wrap;
    }

    .cal-bar__title {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
    }
}
</style>
