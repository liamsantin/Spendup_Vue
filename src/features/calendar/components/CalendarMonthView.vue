<script setup lang="ts">
/**
 * Vue Mois : navigation, grille et panneau latéral. Charge les occurrences de toute la grille affichée
 * (jours des mois voisins compris) ; en mode démo, la même requête est servie par `features/demo/calendar.ts`.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import CalendarMonthGrid from '@/features/calendar/components/month/CalendarMonthGrid.vue';
import CalendarEventFormModal from '@/features/calendar/components/modals/CalendarEventFormModal.vue';
import CalendarDayPanel from '@/features/calendar/components/side/CalendarDayPanel.vue';
import CalendarMonthSummary from '@/features/calendar/components/side/CalendarMonthSummary.vue';
import { useCalendarOccurrences } from '@/features/calendar/composables/useCalendarOccurrences';
import { monthGrid, parseYmd, toYmd, ymdOf } from '@/features/calendar/dates';
import { groupByDay, monthSummary, upcomingOutflows } from '@/features/calendar/occurrences';
import type { CalendarOccurrence } from '@/features/calendar/types';

const { t, locale } = useI18n();

const todayYmd = ymdOf(new Date());
const year = ref(Number(todayYmd.slice(0, 4)));
const month = ref(Number(todayYmd.slice(5, 7)) - 1);
const selected = ref(todayYmd);

const grid = computed(() => monthGrid(year.value, month.value));
const from = computed(() => grid.value.from);
const to = computed(() => grid.value.to);
const { items, error, reload } = useCalendarOccurrences(from, to);

const formOpen = ref(false);
const editing = ref<CalendarOccurrence | null>(null);

function createEvent(ymd = selected.value) {
    select(ymd);
    editing.value = null;
    formOpen.value = true;
}

function openEvent(occurrence: CalendarOccurrence) {
    editing.value = occurrence;
    formOpen.value = true;
}

const monthPrefix = computed(() => toYmd(year.value, month.value, 1).slice(0, 7));
const byDay = computed(() => groupByDay(items.value));
const summary = computed(() => monthSummary(items.value, monthPrefix.value));
/** Prochaines sorties du mois affiché, à partir d’aujourd’hui. */
const upcoming = computed(() => {
    const monthStart = toYmd(year.value, month.value, 1);
    const next = new Date(year.value, month.value + 1, 1);
    return upcomingOutflows(items.value, monthStart > todayYmd ? monthStart : todayYmd, ymdOf(next));
});

function capitalize(label: string): string {
    return label.charAt(0).toUpperCase() + label.slice(1);
}

const monthTitle = computed(() =>
    capitalize(new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(new Date(year.value, month.value, 1)))
);

const selectedItems = computed(() => byDay.value.get(selected.value) ?? []);
const selectedTitle = computed(() =>
    capitalize(new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long' }).format(parseYmd(selected.value)))
);

function shiftMonth(delta: number) {
    const next = new Date(year.value, month.value + delta, 1);
    year.value = next.getFullYear();
    month.value = next.getMonth();
    selected.value = toYmd(year.value, month.value, 1);
}

function goToday() {
    year.value = Number(todayYmd.slice(0, 4));
    month.value = Number(todayYmd.slice(5, 7)) - 1;
    selected.value = todayYmd;
}

function select(ymd: string) {
    if (!ymd.startsWith(monthPrefix.value)) {
        const date = parseYmd(ymd);
        year.value = date.getFullYear();
        month.value = date.getMonth();
    }
    selected.value = ymd;
}
</script>

<template>
    <div>
        <AppAlert v-if="error" type="error" class="cal-alert">
            {{ t('calendarPage.loadError') }}
        </AppAlert>

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
            <button type="button" class="su-btn su-btn--ink" @click="createEvent()">
                <PlusIcon :size="16" stroke-width="2" aria-hidden="true" />
                {{ t('calendarPage.newEvent') }}
            </button>
        </div>

        <div class="su-g12 cal">
            <CalendarMonthGrid
                class="cal__month"
                :month-prefix="monthPrefix"
                :days="grid.days"
                :week-count="grid.weekCount"
                :by-day="byDay"
                :selected="selected"
                :today="todayYmd"
                :label="monthTitle"
                @select="select"
                @create="createEvent"
            />

            <aside class="cal__side su-stack su-stack--tight">
                <CalendarDayPanel :title="selectedTitle" :items="selectedItems" @open="openEvent" />
                <CalendarMonthSummary :summary="summary" :upcoming="upcoming" />
            </aside>
        </div>

        <CalendarEventFormModal
            v-model="formOpen"
            :event-public-id="editing?.eventPublicId ?? null"
            :occurrence="editing"
            :date="selected"
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
    min-width: 9.5em;
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
    .cal-bar__title {
        min-width: 0;
    }
}
</style>
