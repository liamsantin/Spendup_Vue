<script setup lang="ts">
/**
 * Calendrier éditorial du mois (maquette 05) : axe 1–30 en bas, un trait vertical par échéance
 * (noir = charge, bleu = revenu), jour 700, nom gris et montant 700 au-dessus. HTML/CSS pur.
 * Les échéances viennent des `upcomingDues` déjà chargées, sinon de `nextDueDate`.
 */
defineOptions({ name: 'RecurringMonthCalendar' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { dayOfYmd, formatSignedPlannedAmount, isExpenseTemplate, todayLocalYmd } from '@/features/recurring-payments/format';
import type { RecurringExpense, RecurringIncome, RecurringKind } from '@/features/recurring-payments/types';

const LANES = 4;

const props = defineProps<{
    items: readonly (RecurringExpense | RecurringIncome)[];
}>();

const { t, locale } = useI18n();

type Tick = { key: string; day: number; name: string; amount: string; kind: RecurringKind; lane: number; x: number; flip: boolean };

const monthPrefix = computed(() => todayLocalYmd().slice(0, 7));

const daysInMonth = computed(() => {
    const [y, m] = monthPrefix.value.split('-').map(Number);
    return new Date(y, m, 0).getDate();
});

const monthLabel = computed(() => {
    const [y, m] = monthPrefix.value.split('-').map(Number);
    const label = new Intl.DateTimeFormat(locale.value || undefined, { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1, 12));
    return label.charAt(0).toUpperCase() + label.slice(1);
});

const ticks = computed<Tick[]>(() => {
    const raw: Omit<Tick, 'lane' | 'x' | 'flip'>[] = [];
    for (const item of props.items) {
        if (!item.isActive) continue;
        const kind: RecurringKind = isExpenseTemplate(item) ? 'expense' : 'income';
        const dues = item.upcomingDues?.length
            ? item.upcomingDues.map((due) => ({ id: due.publicId, date: due.scheduledAt, amount: due.plannedAmount }))
            : item.nextDueDate
              ? [{ id: 'next', date: item.nextDueDate, amount: item.plannedAmount }]
              : [];
        for (const due of dues) {
            if (!due.date.startsWith(monthPrefix.value)) continue;
            const day = dayOfYmd(due.date);
            if (!day) continue;
            raw.push({
                key: `${kind}-${item.publicId}-${due.id}`,
                day,
                name: item.name,
                amount: formatSignedPlannedAmount(due.amount, kind, item.currency, locale.value),
                kind
            });
        }
    }
    raw.sort((a, b) => a.day - b.day || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    // Répartition sur quatre hauteurs : deux étiquettes trop proches ne partagent pas la même ligne.
    const minGap = Math.max(4, Math.ceil(daysInMonth.value * 0.16));
    const lastDayByLane: number[] = Array.from({ length: LANES }, () => Number.NEGATIVE_INFINITY);
    const span = Math.max(1, daysInMonth.value - 1);
    return raw.map((tick) => {
        let lane = lastDayByLane.findIndex((last) => tick.day - last >= minGap);
        if (lane < 0) lane = lastDayByLane.indexOf(Math.min(...lastDayByLane));
        lastDayByLane[lane] = tick.day;
        const x = ((tick.day - 1) / span) * 100;
        return { ...tick, lane, x, flip: x > 72 };
    });
});

const axisDays = computed(() => {
    const days = [1];
    for (let day = 5; day <= daysInMonth.value; day += 5) days.push(day);
    return days.map((day) => ({ day, x: ((day - 1) / Math.max(1, daysInMonth.value - 1)) * 100 }));
});

const hasTicks = computed(() => ticks.value.length > 0);

defineExpose({ hasTicks });
</script>

<template>
    <section v-if="hasTicks" class="recurring-calendar" :aria-label="monthLabel">
        <header class="recurring-calendar__head">
            <h2 class="su-h2">{{ monthLabel }}</h2>
            <ul class="recurring-calendar__legend" :aria-label="t('recurrencesPage.calendar.legend')">
                <li><span class="su-sq" style="--sq-color: var(--ink)" aria-hidden="true" /> {{ t('recurrencesPage.kinds.expense') }}</li>
                <li><span class="su-sq" style="--sq-color: var(--blue)" aria-hidden="true" /> {{ t('recurrencesPage.kinds.income') }}</li>
            </ul>
        </header>
        <div class="recurring-calendar__scroll">
            <div class="recurring-calendar__chart" role="list">
                <div
                    v-for="tick in ticks"
                    :key="tick.key"
                    class="recurring-calendar__tick"
                    :class="[`is-${tick.kind}`, `is-lane-${tick.lane}`, { 'is-flip': tick.flip }]"
                    :style="{ left: `${tick.x}%` }"
                    role="listitem"
                >
                    <span class="recurring-calendar__label">
                        <span class="recurring-calendar__day">{{ tick.day }}</span>
                        <span class="recurring-calendar__name">{{ tick.name }}</span>
                        <span class="recurring-calendar__amount" :class="tick.kind === 'income' ? 'su-pos' : 'su-neg'">{{
                            tick.amount
                        }}</span>
                    </span>
                </div>
                <div class="recurring-calendar__axis" aria-hidden="true">
                    <span v-for="mark in axisDays" :key="mark.day" class="recurring-calendar__mark" :style="{ left: `${mark.x}%` }">
                        {{ mark.day }}
                    </span>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.recurring-calendar {
    border-top: 1px solid var(--line);
    padding-top: 12px;
}

.recurring-calendar__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--line);
}

.recurring-calendar__legend {
    display: flex;
    gap: 18px;
    margin: 0;
    padding: 0;
    list-style: none;
    color: var(--gray);
    font-size: 13px;
}

.recurring-calendar__legend li {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.recurring-calendar__legend .su-sq {
    width: 8px;
    height: 8px;
}

.recurring-calendar__scroll {
    overflow-x: auto;
    scrollbar-width: thin;
}

/* zone de dessin : 4 hauteurs d’étiquettes (58 px chacune) + axe */
.recurring-calendar__chart {
    position: relative;
    min-width: 640px;
    height: 252px;
    margin: 8px 8px 0;
    font-variant-numeric: tabular-nums;
}

.recurring-calendar__tick {
    position: absolute;
    bottom: 28px;
    width: 2px;
    margin-left: -1px;
    background: var(--ink);
}

.recurring-calendar__tick.is-income {
    background: var(--blue);
}

.recurring-calendar__tick.is-lane-0 {
    height: 216px;
}

.recurring-calendar__tick.is-lane-1 {
    height: 166px;
}

.recurring-calendar__tick.is-lane-2 {
    height: 116px;
}

.recurring-calendar__tick.is-lane-3 {
    height: 66px;
}

.recurring-calendar__label {
    position: absolute;
    top: 0;
    left: 10px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    width: max-content;
    max-width: 160px;
    font-size: 13px;
    line-height: 1.35;
    white-space: nowrap;
}

.recurring-calendar__tick.is-flip .recurring-calendar__label {
    left: auto;
    right: 10px;
    align-items: flex-end;
    text-align: right;
}

.recurring-calendar__day,
.recurring-calendar__amount {
    font-weight: 700;
}

.recurring-calendar__name {
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--gray);
}

.recurring-calendar__axis {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 28px;
    border-top: 1px solid var(--line);
}

.recurring-calendar__mark {
    position: absolute;
    top: 8px;
    transform: translateX(-50%);
    color: var(--gray);
    font-size: 12.5px;
}

.recurring-calendar__mark:first-child {
    transform: none;
}

.recurring-calendar__mark:last-child {
    transform: translateX(-100%);
}
</style>
