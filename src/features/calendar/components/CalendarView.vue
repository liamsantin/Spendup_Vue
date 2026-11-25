<script setup lang="ts">
/**
 * Calendrier : navigation, vues Jour, Semaine, Mois et Agenda, formulaire d'événement. Charge les occurrences de la
 * période affichée (en vue Mois, toute la grille, jours des mois voisins compris) ; en mode démo, la même requête
 * est servie par `features/demo/calendar.ts`.
 *
 * Affichage pleine page (le titre de page est replié par AppCalendarPage) : les vues se choisissent dans la barre,
 * le détail d'un jour du Mois s'ouvre dans un panneau flottant (Échap le ferme).
 *
 * Raccourcis : `T` aujourd'hui, `J` / `K` période précédente / suivante, `C` nouvel événement, `1` à `4` les vues.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, SettingsIcon, XIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import CalendarAgendaList from '@/features/calendar/components/agenda/CalendarAgendaList.vue';
import CalendarMonthGrid from '@/features/calendar/components/month/CalendarMonthGrid.vue';
import { calendarApi } from '@/features/calendar/api';
import CalendarDayModal from '@/features/calendar/components/modals/CalendarDayModal.vue';
import CalendarEventFormModal from '@/features/calendar/components/modals/CalendarEventFormModal.vue';
import CalendarProfileModal from '@/features/calendar/components/modals/CalendarProfileModal.vue';
import CalendarEventScopeDialog from '@/features/calendar/components/modals/CalendarEventScopeDialog.vue';
import CalendarLayersPanel from '@/features/calendar/components/side/CalendarLayersPanel.vue';
import CalendarDayPanel from '@/features/calendar/components/side/CalendarDayPanel.vue';
import CalendarTimeGrid from '@/features/calendar/components/week/CalendarTimeGrid.vue';
import { useCalendarOccurrences } from '@/features/calendar/composables/useCalendarOccurrences';
import { useCalendarPreferences } from '@/features/calendar/composables/useCalendarPreferences';
import { addDaysYmd, monthGrid, parseYmd, visibleDays, weekDays, ymdOf } from '@/features/calendar/dates';
import {
    EVENTS_LAYER,
    countByLayer,
    filterByLayers,
    loadHiddenLayers,
    loadSeenSources,
    newSourceKeys,
    saveHiddenLayers,
    saveSeenSources
} from '@/features/calendar/layers';
import { groupByDay } from '@/features/calendar/occurrences';
import { buildUpdateEventPayload, eventToFormFields, occurrenceStartOf } from '@/features/calendar/payload';
import {
    CALENDAR_VIEWS,
    type CalendarEvent,
    type CalendarEventScope,
    type CalendarOccurrence,
    type CalendarProfile,
    type CalendarSourceList,
    type CalendarViewMode
} from '@/features/calendar/types';
import type { PlacedSpan } from '@/features/calendar/timegrid';
import { SETTINGS_PATHS } from '@/features/user-settings/settings-paths';
import { AppError } from '@/utils/errors/app-error';

/** L'agenda charge 30 jours de plus à chaque fois, jusqu'à un an (fenêtre maximale de l'API). */
const AGENDA_STEP_DAYS = 30;
const AGENDA_MAX_DAYS = 365;

const view = defineModel<CalendarViewMode>('view', { required: true });
/** Mois (bureau) : détail du jour dans un panneau flottant, ouvert au clic sur un jour. */
const dayOpen = ref(false);

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const { preferences, load: loadPreferences } = useCalendarPreferences();

const todayYmd = ymdOf(new Date());
const selected = ref(todayYmd);
const agendaSpan = ref(AGENDA_STEP_DAYS);

const weekStartsOn = computed(() => preferences.value?.weekStartsOn ?? 1);
const showWeekends = computed(() => preferences.value?.showWeekends ?? true);
const showWeekNumbers = computed(() => preferences.value?.showWeekNumbers ?? false);
const hour24 = computed(() => preferences.value?.use24HourClock ?? true);
const dayStartHour = computed(() => preferences.value?.dayStartHour ?? 7);
const dayEndHour = computed(() => preferences.value?.dayEndHour ?? 22);
const defaultDuration = computed(() => preferences.value?.defaultDurationMinutes ?? 60);
const secondTimezone = computed(() => preferences.value?.secondTimezone ?? null);

const year = computed(() => Number(selected.value.slice(0, 4)));
const month = computed(() => Number(selected.value.slice(5, 7)) - 1);
const grid = computed(() => monthGrid(year.value, month.value, weekStartsOn.value));
const monthDays = computed(() => visibleDays(grid.value.days, showWeekends.value));
const monthColumns = computed(() => (showWeekends.value ? 7 : 5));
const week = computed(() => visibleDays(weekDays(selected.value, weekStartsOn.value), showWeekends.value));

function openSettings() {
    const base = route.path.startsWith('/demo') ? '/demo' : '/app';
    void router.push(`${base}${SETTINGS_PATHS.calendar.slice('/app'.length)}`);
}

const range = computed(() => {
    switch (view.value) {
        case 'day':
            return { from: selected.value, to: selected.value };
        case 'week':
            return { from: week.value[0], to: week.value[week.value.length - 1] };
        case 'agenda':
            return { from: selected.value, to: addDaysYmd(selected.value, agendaSpan.value - 1) };
        default:
            return { from: grid.value.from, to: grid.value.to };
    }
});
const from = computed(() => range.value.from);
const to = computed(() => range.value.to);
const { items: allItems, loading, error, reload } = useCalendarOccurrences(from, to);

/** Couches proposées : événements + sources activées (réglages, onglet Sources). Toutes si la lecture échoue. */
const layerKeys = ref<string[] | undefined>(undefined);
const profileOpen = ref(false);
const profileSaving = ref(false);
const profileError = ref<string | null>(null);

function applySources(list: CalendarSourceList) {
    layerKeys.value = [EVENTS_LAYER, ...list.items.filter((item) => item.isEnabled).map((item) => item.key)];
}

onMounted(async () => {
    try {
        const list = await calendarApi.sources();
        applySources(list);
        // Premier passage : proposer le profil de départ (jamais en mode démo ni si l'API ne le dit pas).
        profileOpen.value = list.profileChosen === false;
        if (!profileOpen.value) detectNewSources(list);
    } catch {
        layerKeys.value = undefined;
    }
});

/** Sources apparues depuis la dernière visite (désactivées par le profil) : bandeau pour les afficher ou les ignorer. */
const newSources = ref<{ key: string; label: string }[]>([]);
const newSourcesBusy = ref(false);
let allSourceKeys: string[] = [];

function detectNewSources(list: CalendarSourceList) {
    allSourceKeys = list.items.map((item) => item.key);
    const fresh = newSourceKeys(loadSeenSources(), list.items);
    newSources.value = list.items.filter((item) => fresh.includes(item.key)).map((item) => ({ key: item.key, label: item.label }));
    // Première visite sur cet appareil, ou rien de nouveau : on mémorise la liste sans bandeau.
    if (!newSources.value.length) saveSeenSources(allSourceKeys);
}

function ignoreNewSources() {
    saveSeenSources(allSourceKeys);
    newSources.value = [];
}

async function showNewSources() {
    newSourcesBusy.value = true;
    try {
        for (const source of newSources.value) await calendarApi.updateSource(source.key, { isEnabled: true });
        applySources(await calendarApi.sources());
        ignoreNewSources();
        await reload();
    } catch {
        profileError.value = t('calendarPage.firstOpen.error');
    } finally {
        newSourcesBusy.value = false;
    }
}

async function chooseProfile(profile: CalendarProfile) {
    profileSaving.value = true;
    profileError.value = null;
    try {
        const list = await calendarApi.setSourceProfile(profile);
        applySources(list);
        saveSeenSources(list.items.map((item) => item.key));
        profileOpen.value = false;
        await reload();
    } catch {
        profileError.value = t('calendarPage.firstOpen.error');
    } finally {
        profileSaving.value = false;
    }
}

const hiddenLayers = ref<Set<string>>(loadHiddenLayers());
const layerCounts = computed(() => countByLayer(allItems.value));
const items = computed(() => filterByLayers(allItems.value, hiddenLayers.value));

function resetLayers() {
    hiddenLayers.value = new Set();
    saveHiddenLayers(hiddenLayers.value);
}

function toggleLayer(key: string) {
    const next = new Set(hiddenLayers.value);
    if (!next.delete(key)) next.add(key);
    hiddenLayers.value = next;
    saveHiddenLayers(next);
}

watch(view, () => {
    agendaSpan.value = AGENDA_STEP_DAYS;
    dayOpen.value = false;
});

const byDay = computed(() => groupByDay(items.value));

// ── vue Mois ──
const monthPrefix = computed(() => selected.value.slice(0, 7));
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

function onSelectDay(ymd: string) {
    select(ymd);
    dayOpen.value = true;
}

/** « Voir tout le jour » : tous les éléments du jour dans une modale. */
const dayModalOpen = ref(false);

function viewDay(ymd: string = selected.value) {
    select(ymd);
    dayOpen.value = false;
    dayModalOpen.value = true;
}

function openFromDayModal(occurrence: CalendarOccurrence) {
    dayModalOpen.value = false;
    openEvent(occurrence);
}

function createFromDayModal() {
    dayModalOpen.value = false;
    createEvent(selected.value);
}

function openDay(ymd: string) {
    selected.value = ymd;
    view.value = 'day';
}

// ── formulaire ──
const formOpen = ref(false);
const editing = ref<CalendarOccurrence | null>(null);
const draft = ref<{ date: string; time: string | null; endTime: string | null; title: string }>({
    date: todayYmd,
    time: null,
    endTime: null,
    title: ''
});

function createEvent(ymd = selected.value, time: string | null = null, eventTitle = '', endTime: string | null = null) {
    if (view.value === 'month') select(ymd);
    editing.value = null;
    draft.value = { date: ymd, time, endTime, title: eventTitle };
    formOpen.value = true;
}

function openEvent(occurrence: CalendarOccurrence) {
    editing.value = occurrence;
    formOpen.value = true;
}

// ── glisser-déposer : le calcul d'horaire est dans la grille, l'enregistrement ici ──
type Reschedule = { occurrence: CalendarOccurrence } & PlacedSpan;

const dragRelease = ref(0);
const dragScopeOpen = ref(false);
const dragSaving = ref(false);
const dragError = ref<string | null>(null);
const dragPending = ref<Reschedule | null>(null);
const dragEvent = ref<CalendarEvent | null>(null);
const dragLocked = computed(() => dragSaving.value || dragScopeOpen.value || dragPending.value !== null);

function dragMessage(e: unknown): string {
    const status = AppError.fromUnknown(e).status;
    if (status === 409) return t('calendarPage.form.errors.conflict');
    if (status === 404) return t('calendarPage.form.errors.notFound');
    if (status === 403) return t('calendarPage.drag.forbidden');
    return t('calendarPage.drag.failed');
}

function rejectDrag() {
    dragScopeOpen.value = false;
    dragPending.value = null;
    dragEvent.value = null;
    dragRelease.value += 1;
}

async function onReschedule(change: Reschedule) {
    if (dragPending.value) return;
    if (!change.occurrence.eventPublicId) {
        dragRelease.value += 1;
        return;
    }
    dragError.value = null;
    dragPending.value = change;
    try {
        const event = await calendarApi.getEvent(change.occurrence.eventPublicId);
        dragEvent.value = event;
        if (event.recurrenceRule) dragScopeOpen.value = true;
        else await commitDrag('series');
    } catch (e) {
        dragError.value = dragMessage(e);
        rejectDrag();
    }
}

async function commitDrag(scope: CalendarEventScope) {
    const pending = dragPending.value;
    const event = dragEvent.value;
    if (!pending || !event || dragSaving.value) return;
    const initial = eventToFormFields(event, pending.occurrence);
    const built = buildUpdateEventPayload(
        { ...initial, startDate: pending.startDate, startTime: pending.startTime, endDate: pending.endDate, endTime: pending.endTime },
        { event, initial, scope, occurrenceStart: occurrenceStartOf(pending.occurrence) }
    );
    if (!built.ok || !built.changed) {
        rejectDrag();
        return;
    }
    dragSaving.value = true;
    dragScopeOpen.value = false;
    try {
        await calendarApi.updateEvent(event.publicId, built.payload);
        await reload();
        dragPending.value = null;
        dragEvent.value = null;
    } catch (e) {
        dragError.value = dragMessage(e);
        rejectDrag();
    } finally {
        dragSaving.value = false;
    }
}

function onDragScope(open: boolean) {
    dragScopeOpen.value = open;
    if (!open && !dragSaving.value && dragPending.value) rejectDrag();
}

// ── raccourcis clavier ──
function onKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
    if (formOpen.value || dragScopeOpen.value || document.querySelector('.v-overlay--active')) return;

    if (event.key === 'Escape') {
        if (!dayOpen.value) return;
        dayOpen.value = false;
        event.preventDefault();
        return;
    }

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

onMounted(() => {
    window.addEventListener('keydown', onKeydown);
    void loadPreferences();
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
    <div class="cal-root">
        <AppAlert v-if="error" type="error" class="cal-alert">
            {{ t('calendarPage.loadError') }}
        </AppAlert>
        <AppAlert v-if="dragError" type="error" class="cal-alert">
            {{ dragError }}
        </AppAlert>
        <AppAlert v-if="newSources.length" type="info" class="cal-alert">
            <span>{{ t('calendarPage.newSources.text', { names: newSources.map((s) => s.label).join(', ') }, newSources.length) }}</span>
            <button type="button" class="su-btn su-btn--ink cal-alert__btn" :disabled="newSourcesBusy" @click="showNewSources">
                {{ t('calendarPage.newSources.show') }}
            </button>
            <button type="button" class="su-btn cal-alert__btn" :disabled="newSourcesBusy" @click="ignoreNewSources">
                {{ t('calendarPage.newSources.ignore') }}
            </button>
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
            <h2 class="cal-bar__title" :class="`cal-bar__title--${view}`" aria-live="polite">{{ title }}</h2>
            <button
                type="button"
                class="su-orb"
                :aria-label="t('calendarPage.next')"
                :title="`${t('calendarPage.next')} (K)`"
                @click="shift(1)"
            >
                <ChevronRightIcon :size="18" stroke-width="1.8" />
            </button>
            <!-- Le titre de page (et ses onglets) est replié sur bureau : les vues se choisissent ici. -->
            <nav class="su-tabs su-tabs--links cal-bar__views" :aria-label="t('calendarPage.views.label')">
                <button
                    v-for="(mode, index) in CALENDAR_VIEWS"
                    :key="mode"
                    type="button"
                    class="su-tab"
                    :class="{ 'is-active': view === mode }"
                    :aria-pressed="view === mode"
                    :title="`${t(`calendarPage.views.${mode}`)} (${index + 1})`"
                    @click="view = mode"
                >
                    <span class="su-tab__label" :data-label="t(`calendarPage.views.${mode}`)">{{ t(`calendarPage.views.${mode}`) }}</span>
                </button>
            </nav>
            <button type="button" class="su-btn su-btn--ghost cal-bar__today" :title="`${t('calendarPage.today')} (T)`" @click="goToday">
                {{ t('calendarPage.today') }}
            </button>
            <AppDropdownFilter
                class="cal-bar__filters"
                :label="t('calendarPage.filters')"
                :count="hiddenLayers.size"
                :reset-disabled="hiddenLayers.size === 0"
                :min-width="280"
                mobile-sheet
                @reset="resetLayers"
            >
                <CalendarLayersPanel :keys="layerKeys" :hidden="hiddenLayers" :counts="layerCounts" hide-title @toggle="toggleLayer" />
            </AppDropdownFilter>
            <button type="button" class="su-orb cal-bar__settings" :aria-label="t('calendarPage.settings.open')" @click="openSettings">
                <SettingsIcon :size="18" stroke-width="1.8" aria-hidden="true" />
            </button>
            <button type="button" class="su-btn su-btn--ink" :title="`${t('calendarPage.newEvent')} (C)`" @click="createEvent()">
                <PlusIcon :size="16" stroke-width="2" aria-hidden="true" />
                {{ t('calendarPage.newEvent') }}
            </button>
        </div>

        <!-- Seule cette zone défile : la barre ci-dessus reste fixe et la barre de défilement commence dessous. -->
        <div class="cal-scroll" :class="{ 'cal-scroll--fill': view === 'week' || view === 'day' }">
            <div v-if="view === 'month'" class="su-g12 cal">
                <CalendarMonthGrid
                    class="cal__month"
                    :month-prefix="monthPrefix"
                    :days="monthDays"
                    :columns="monthColumns"
                    :week-count="grid.weekCount"
                    :show-week-numbers="showWeekNumbers"
                    :by-day="byDay"
                    :selected="selected"
                    :today="todayYmd"
                    :label="title"
                    @select="onSelectDay"
                    @view-all="viewDay"
                    @create="createEvent"
                />

                <!-- Mobile : le détail du jour reste sous la grille (le panneau flottant est réservé au bureau). -->
                <aside class="cal__side">
                    <CalendarDayPanel :title="selectedTitle" :items="selectedItems" @open="openEvent" @view-all="viewDay()" />
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
                :hour24="hour24"
                :day-start-hour="dayStartHour"
                :day-end-hour="dayEndHour"
                :default-duration="defaultDuration"
                :second-timezone="secondTimezone"
                :show-week-numbers="showWeekNumbers"
                :release="dragRelease"
                :locked="dragLocked"
                @open="openEvent"
                @day="openDay"
                @more="createEvent($event.ymd, $event.time, $event.title, $event.endTime)"
                @created="reload"
                @reschedule="onReschedule"
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
        </div>

        <!-- Mois (bureau) : détail du jour choisi, flottant au-dessus de la grille. -->
        <aside v-if="view === 'month' && dayOpen" class="cal-float">
            <button type="button" class="su-orb cal-float__close" :aria-label="t('calendarPage.closeDay')" @click="dayOpen = false">
                <XIcon :size="16" stroke-width="1.8" aria-hidden="true" />
            </button>
            <CalendarDayPanel :title="selectedTitle" :items="selectedItems" @open="openEvent" @view-all="viewDay()" />
        </aside>

        <CalendarProfileModal v-model="profileOpen" :saving="profileSaving" :error="profileError" @choose="chooseProfile" />

        <CalendarDayModal
            v-model="dayModalOpen"
            :title="selectedTitle"
            :items="selectedItems"
            @open="openFromDayModal"
            @create="createFromDayModal"
        />

        <CalendarEventFormModal
            v-model="formOpen"
            :event-public-id="editing?.eventPublicId ?? null"
            :occurrence="editing"
            :date="draft.date"
            :time="draft.time"
            :end-time="draft.endTime"
            :title="draft.title"
            @changed="reload"
        />

        <CalendarEventScopeDialog
            :model-value="dragScopeOpen"
            mode="save"
            allow-occurrence
            :loading="dragSaving"
            @update:model-value="onDragScope"
            @confirm="commitDrag"
        />
    </div>
</template>

<style scoped>
.cal-alert {
    margin: 0 0 16px;
}

/* ── structure : barre fixe, zone de vues défilante ──────────
   Sur bureau, la racine remplit le corps de page (voir AppCalendarPage) : la barre garde sa
   hauteur et seule `.cal-scroll` défile, sa barre de défilement démarre donc sous la barre. */
.cal-root {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
}

.cal-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    padding-bottom: 16px;
    scrollbar-width: thin;
    overscroll-behavior: contain;
}

/* Semaine et Jour : la grille horaire gère son propre défilement (en-têtes fixes). */
.cal-scroll--fill {
    display: flex;
    flex-direction: column;
    overflow-y: hidden;
    padding-bottom: 0;
}

/* ── barre de navigation ─────────────────────────────── */
.cal-bar {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    margin: 0 0 8px;
    padding: 8px 0;
    background: var(--bg);
}

.cal-bar__filters {
    margin-left: auto;
}

.cal-bar__title {
    margin: 0 8px;
    flex: none;
    width: 19em;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.025em;
    text-align: center;
    white-space: nowrap;
}

/* Largeur fixe par vue, calée sur le texte le plus long de cette vue (Agenda garde la valeur par défaut). */
.cal-bar__title--month {
    width: 11em;
}

.cal-bar__title--day {
    width: 15em;
}

.cal-bar__title--week {
    width: 16em;
}

.cal-bar__today {
    margin-left: auto;
    margin-right: 8px;
}

.cal__month {
    grid-column: 1 / -1;
}

/* le détail du jour est flottant sur bureau ; la colonne ne sert que sur mobile */
.cal__side {
    display: none;
    grid-column: 1 / -1;
    min-width: 0;
}

.cal-bar__views {
    flex: none;
    margin-left: 8px;
}

/* détail du jour flottant (Mois, bureau) */
.cal-float {
    position: absolute;
    right: 24px;
    bottom: 24px;
    z-index: 4;
    width: min(380px, calc(100% - 48px));
    max-height: 60%;
    overflow-y: auto;
    padding: 12px;
    border: 1px solid var(--line);
    background: var(--bg);
    box-shadow: 0 8px 32px color-mix(in srgb, var(--ink) 18%, transparent);
}

.cal-float__close {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 1;
}

@media (max-width: 767px) {
    /* mobile : la page entière défile, seule la barre reste collée en haut */
    .cal-root {
        display: block;
        height: auto;
    }

    .cal-scroll,
    .cal-scroll--fill {
        display: block;
        overflow: visible;
        padding-bottom: 0;
    }

    .cal-bar {
        position: sticky;
        top: 0;
        z-index: 5;
        flex-wrap: wrap;
    }

    /* mobile : les vues restent dans l'en-tête de page */
    .cal-bar__views,
    .cal-float {
        display: none;
    }

    .cal__side {
        display: block;
    }

    .cal-bar__title {
        flex: 1 1 auto;
        width: auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
    }
}
</style>
