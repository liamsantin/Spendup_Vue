<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { calendarApi } from '@/features/calendar/api';
import { addDaysYmd, occurrenceDays, ymdOf } from '@/features/calendar/dates';
import { formatOccurrenceAmount, isCanceled, occurrenceTime } from '@/features/calendar/occurrences';
import type { CalendarOccurrence } from '@/features/calendar/types';
import { DASHBOARD_MASKED_AMOUNT, formatShortDayMonth } from '@/features/dashboard/format';

const DAYS = 7;
const LIMIT = 5;

defineProps<{ hideAmounts?: boolean }>();

const { t, locale } = useI18n();
const items = ref<CalendarOccurrence[]>([]);
const riskDate = ref<string | null>(null);
const loading = ref(true);
const failed = ref(false);

const today = ymdOf(new Date());

const rows = computed(() =>
    items.value
        .filter((o) => !isCanceled(o) && o.sourceKey !== 'transactions')
        .map((o) => ({ o, day: occurrenceDays(o)[0] ?? '' }))
        .filter(({ day }) => day >= today)
        .sort((a, b) => a.day.localeCompare(b.day) || a.o.title.localeCompare(b.o.title))
        .slice(0, LIMIT)
);

function timeLabel(o: CalendarOccurrence): string {
    return o.isFullDay ? t('dashboard.calendar.allDay') : (occurrenceTime(o, locale.value) ?? '');
}

onMounted(async () => {
    try {
        const to = addDaysYmd(today, DAYS);
        const [result, prefs] = await Promise.all([calendarApi.occurrences({ from: today, to }), calendarApi.preferences()]);
        items.value = result.items;
        if (prefs.showProjectedBalance && !prefs.discreetMode) {
            const forecast = await calendarApi.forecast(today, to);
            riskDate.value = forecast.firstRiskDate;
        }
    } catch {
        failed.value = true;
    } finally {
        loading.value = false;
    }
});
</script>

<template>
    <section class="su-section dash-cal">
        <header class="su-section__head">
            <h2>{{ t('dashboard.calendar.title') }}</h2>
            <RouterLink to="/app/calendrier" class="su-link">{{ t('dashboard.actions.seeAll') }}</RouterLink>
        </header>

        <div v-if="loading" class="su-loading"><span class="su-spin" /></div>
        <p v-else-if="failed" class="dash-empty">{{ t('dashboard.calendar.failed') }}</p>
        <template v-else>
            <RouterLink v-if="riskDate && !hideAmounts" to="/app/calendrier" class="dash-cal__risk">
                {{ t('dashboard.calendar.risk', { date: formatShortDayMonth(riskDate) }) }}
            </RouterLink>
            <p v-if="!rows.length" class="dash-empty">{{ t('dashboard.calendar.empty', { days: DAYS }) }}</p>
            <ul v-else class="dash-cal__list">
                <li v-for="{ o, day } in rows" :key="o.id" class="dash-cal__row">
                    <span class="dash-cal__date">{{ formatShortDayMonth(day) }}</span>
                    <span class="dash-cal__meta">
                        <span class="dash-cal__title">{{ o.title }}</span>
                        <span class="dash-cal__sub">{{ timeLabel(o) }}</span>
                    </span>
                    <span v-if="o.amount != null && o.currency" class="dash-cal__amount" :class="{ 'su-pos': o.amount > 0 }">
                        {{ hideAmounts ? DASHBOARD_MASKED_AMOUNT : formatOccurrenceAmount(o.amount, o.currency) }}
                    </span>
                </li>
            </ul>
        </template>
    </section>
</template>

<style scoped>
.dash-cal__list {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
}

.dash-cal__row {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid var(--line, rgba(0, 0, 0, 0.1));
}

.dash-cal__date {
    min-width: 52px;
    font-variant-numeric: tabular-nums;
    opacity: 0.7;
}

.dash-cal__meta {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
}

.dash-cal__title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.dash-cal__sub {
    font-size: 12px;
    opacity: 0.65;
}

.dash-cal__amount {
    font-variant-numeric: tabular-nums;
}

.dash-cal__risk {
    display: block;
    margin-bottom: 8px;
    padding: 8px 10px;
    border-left: 3px solid #d12f2f;
    color: #d12f2f;
    text-decoration: none;
}
</style>
