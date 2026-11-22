<script setup lang="ts">
/**
 * Courbe de projection d’épargne : valeur projetée (2 px bleue) et total versé (filet gris pointillé), de l’année 0 à l’horizon.
 * Valeurs écrites à l’arrivée, axe des années, grille pointillée. Le SVG est tracé en pixels réels (largeur mesurée par `ResizeObserver`).
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatSavingsGoalAmount } from '@/features/savings-goals/format';
import type { SavingsProjectionPoint } from '@/features/savings-goals/projection';

const PADDING = { top: 28, right: 16, bottom: 30, left: 16 };
const GRID_LINES = 4;
const MARK_SIZE = 7;

const props = withDefaults(
    defineProps<{
        startAmount: number;
        points: SavingsProjectionPoint[];
        currency: string;
        locale?: string;
        height?: number;
    }>(),
    { locale: undefined, height: 220 }
);

const { t } = useI18n();

const hostRef = ref<HTMLElement | null>(null);
const width = ref(640);
let observer: ResizeObserver | null = null;

function measure() {
    const next = Math.round(hostRef.value?.clientWidth ?? 0);
    if (next > 0) width.value = next;
}

onMounted(() => {
    measure();
    if (typeof ResizeObserver !== 'undefined' && hostRef.value) {
        observer = new ResizeObserver(() => measure());
        observer.observe(hostRef.value);
    }
});

onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
});

/** Année 0 = départ, puis une ligne par année. */
const series = computed(() => [
    { year: 0, contributed: props.startAmount, value: props.startAmount },
    ...props.points.map((p) => ({ year: p.year, contributed: p.contributed, value: p.value }))
]);

const bounds = computed(() => {
    const all = series.value.flatMap((p) => [p.contributed, p.value]);
    const min = Math.min(0, ...all);
    const max = Math.max(...all, 1);
    return { min, max };
});

const plot = computed(() => ({
    left: PADDING.left,
    right: width.value - PADDING.right,
    top: PADDING.top,
    bottom: props.height - PADDING.bottom
}));

function px(year: number): number {
    const last = Math.max(1, series.value[series.value.length - 1]?.year ?? 1);
    return plot.value.left + ((plot.value.right - plot.value.left) * year) / last;
}

function py(amount: number): number {
    const { min, max } = bounds.value;
    const span = max - min || 1;
    return plot.value.bottom - ((plot.value.bottom - plot.value.top) * (amount - min)) / span;
}

const valuePath = computed(() => series.value.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.year)},${py(p.value)}`).join(' '));
const contributedPath = computed(() => series.value.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.year)},${py(p.contributed)}`).join(' '));

const gridLines = computed(() =>
    Array.from({ length: GRID_LINES }, (_, i) => plot.value.top + ((plot.value.bottom - plot.value.top) * i) / (GRID_LINES - 1))
);

/** Une étiquette d’année tous les `step` points, sans chevauchement. */
const axisLabels = computed(() => {
    const list = series.value;
    const step = Math.max(1, Math.ceil((80 * (list.length - 1)) / Math.max(1, width.value - 32)));
    return list
        .filter((p, i) => i % step === 0 || i === list.length - 1)
        .map((p, i, all) => ({
            key: p.year,
            x: px(p.year),
            text: p.year === 0 ? t('savingsGoalsPage.projection.today') : t('savingsGoalsPage.projection.axisYear', { n: p.year }),
            anchor: p.year === 0 ? 'start' : i === all.length - 1 ? 'end' : 'middle'
        }));
});

const lastPoint = computed(() => series.value[series.value.length - 1] ?? null);

function money(value: number): string {
    return formatSavingsGoalAmount(value, props.currency, props.locale);
}
</script>

<template>
    <div ref="hostRef" class="proj-chart">
        <svg
            class="proj-chart__svg"
            :width="width"
            :height="height"
            :viewBox="`0 0 ${width} ${height}`"
            role="img"
            :aria-label="t('savingsGoalsPage.projection.chartLabel')"
        >
            <line v-for="(y, i) in gridLines" :key="`g-${i}`" class="proj-chart__grid" :x1="plot.left" :x2="plot.right" :y1="y" :y2="y" />
            <line class="proj-chart__axis" :x1="plot.left" :x2="plot.right" :y1="plot.bottom" :y2="plot.bottom" />

            <path class="proj-chart__contributed" :d="contributedPath" />
            <path class="proj-chart__line" :d="valuePath" />

            <template v-if="lastPoint">
                <rect
                    class="proj-chart__dot"
                    :x="px(lastPoint.year) - MARK_SIZE / 2"
                    :y="py(lastPoint.value) - MARK_SIZE / 2"
                    :width="MARK_SIZE"
                    :height="MARK_SIZE"
                />
                <text class="proj-chart__value" :x="px(lastPoint.year)" :y="py(lastPoint.value) - 10" text-anchor="end">
                    {{ money(lastPoint.value) }}
                </text>
            </template>

            <text
                v-for="label in axisLabels"
                :key="label.key"
                class="proj-chart__year"
                :x="label.x"
                :y="height - 8"
                :text-anchor="label.anchor"
            >
                {{ label.text }}
            </text>
        </svg>
        <p class="proj-chart__legend">
            <span class="proj-chart__swatch proj-chart__swatch--value" />{{ t('savingsGoalsPage.projection.legendValue') }}
            <span class="proj-chart__swatch proj-chart__swatch--paid" />{{ t('savingsGoalsPage.projection.legendContributed') }}
        </p>
    </div>
</template>

<style scoped>
.proj-chart {
    position: relative;
    width: 100%;
    min-width: 0;
}

.proj-chart__svg {
    display: block;
    max-width: 100%;
    font-family: var(--font-ui);
}

.proj-chart__grid {
    stroke: var(--line);
    stroke-width: 1;
    stroke-dasharray: 2 4;
}

.proj-chart__axis {
    stroke: var(--line);
    stroke-width: 1;
}

.proj-chart__line {
    fill: none;
    stroke: var(--blue);
    stroke-width: 2;
    stroke-linejoin: miter;
    stroke-linecap: square;
}

.proj-chart__contributed {
    fill: none;
    stroke: var(--gray);
    stroke-width: 1.5;
    stroke-dasharray: 4 3;
}

.proj-chart__dot {
    fill: var(--blue);
}

.proj-chart__value {
    fill: var(--ink);
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.proj-chart__year {
    fill: var(--gray);
    font-size: 12.5px;
    font-variant-numeric: tabular-nums;
}

.proj-chart__legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 16px;
    margin: 6px 0 0;
    color: var(--gray);
    font-size: 12.5px;
}

.proj-chart__swatch {
    display: inline-block;
    width: 18px;
    height: 0;
    margin-right: 6px;
    border-top: 2px solid var(--blue);
    vertical-align: middle;
}

.proj-chart__swatch--paid {
    border-top: 2px dashed var(--gray);
}
</style>
