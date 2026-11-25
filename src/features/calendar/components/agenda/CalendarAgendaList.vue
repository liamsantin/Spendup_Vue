<script setup lang="ts">
/**
 * Vue Agenda : liste chronologique des jours qui ont au moins une occurrence. Arrivée en bas de liste,
 * elle demande la période suivante (`more`) tant que le parent l'autorise.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import CalendarOccurrenceRow from '@/features/calendar/components/list/CalendarOccurrenceRow.vue';
import { parseYmd } from '@/features/calendar/dates';
import type { CalendarOccurrence } from '@/features/calendar/types';

const props = defineProps<{
    days: { ymd: string; items: CalendarOccurrence[] }[];
    today: string;
    label: string;
    /** Dernier jour chargé, `yyyy-MM-dd`. */
    until: string;
    canLoadMore: boolean;
    loading: boolean;
}>();

const emit = defineEmits<{ open: [occurrence: CalendarOccurrence]; hide: [occurrence: CalendarOccurrence]; more: [] }>();

const { t, locale } = useI18n();

const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

const groups = computed(() =>
    props.days.map(({ ymd, items }) => {
        const date = parseYmd(ymd);
        return {
            ymd,
            items,
            day: date.getDate(),
            weekday: new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(date),
            month: new Intl.DateTimeFormat(locale.value, { month: 'short', year: 'numeric' }).format(date)
        };
    })
);

const untilLabel = computed(() =>
    new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long', year: 'numeric' }).format(parseYmd(props.until))
);

function maybeMore(entries: IntersectionObserverEntry[]) {
    if (entries.some((entry) => entry.isIntersecting) && props.canLoadMore && !props.loading) emit('more');
}

onMounted(() => {
    if (typeof IntersectionObserver === 'undefined' || !sentinel.value) return;
    observer = new IntersectionObserver(maybeMore, { rootMargin: '200px' });
    observer.observe(sentinel.value);
});

// Une période vide laisse le repère visible : l'observateur ne se redéclenche pas tout seul.
watch(
    () => props.loading,
    (loading) => {
        if (loading || !observer || !sentinel.value) return;
        observer.unobserve(sentinel.value);
        observer.observe(sentinel.value);
    }
);

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
    <section class="cal-agenda" :aria-label="label">
        <ol v-if="groups.length" class="cal-agenda__days">
            <li v-for="group in groups" :key="group.ymd" class="cal-agenda__day" :class="{ 'is-today': group.ymd === today }">
                <div class="cal-agenda__date">
                    <span class="cal-agenda__num">
                        {{ group.day }}
                        <span v-if="group.ymd === today" class="cal-agenda__today-mark" aria-hidden="true" />
                    </span>
                    <span class="cal-agenda__sub">{{ group.weekday }} · {{ group.month }}</span>
                </div>
                <ul class="cal-list cal-agenda__list">
                    <CalendarOccurrenceRow
                        v-for="occurrence in group.items"
                        :key="occurrence.id"
                        :occurrence="occurrence"
                        @open="emit('open', $event)"
                        @hide="emit('hide', $event)"
                    />
                </ul>
            </li>
        </ol>
        <p v-else-if="!loading" class="cal-side__empty cal-agenda__empty">{{ t('calendarPage.agenda.empty', { date: untilLabel }) }}</p>

        <div ref="sentinel" class="cal-agenda__foot">
            <span v-if="loading" class="su-spin" aria-hidden="true" />
            <button v-else-if="canLoadMore" type="button" class="su-btn su-btn--ghost" @click="emit('more')">
                {{ t('calendarPage.agenda.loadMore') }}
            </button>
            <p v-else class="cal-side__empty">{{ t('calendarPage.agenda.until', { date: untilLabel }) }}</p>
        </div>
    </section>
</template>

<style scoped>
/* ── agenda : date à gauche en colonne fixe, lignes du panneau du jour à droite ── */
.cal-agenda {
    max-width: 820px;
}

.cal-agenda__days {
    margin: 0;
    padding: 0;
    list-style: none;
}

.cal-agenda__day {
    display: grid;
    grid-template-columns: 132px minmax(0, 1fr);
    gap: 16px;
    padding: 16px 0;
    border-top: 1px solid var(--line);
}

.cal-agenda__day:first-child {
    border-top: 2px solid var(--ink);
}

.cal-agenda__date {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.cal-agenda__num {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 22px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.025em;
    line-height: 1.1;
}

.cal-agenda__today-mark {
    display: inline-block;
    width: 6px;
    height: 6px;
    background: var(--blue);
}

.cal-agenda__sub {
    color: var(--gray);
    font-size: 13px;
}

.cal-agenda__empty {
    padding: 16px 0;
    border-top: 2px solid var(--ink);
}

.cal-agenda__foot {
    display: flex;
    justify-content: center;
    padding: 20px 0 4px;
    border-top: 1px solid var(--line);
}

@media (max-width: 767px) {
    .cal-agenda__day {
        grid-template-columns: 64px minmax(0, 1fr);
        gap: 12px;
    }

    .cal-agenda__num {
        font-size: 18px;
    }
}
</style>
