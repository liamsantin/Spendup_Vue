<script setup lang="ts">
/**
 * Courbe éditoriale du patrimoine net : ligne 2 px bleue sans aplat, grille pointillée,
 * valeurs écrites aux extrémités, axe des mois, point courant marqué d’un carré.
 * Le SVG est tracé en pixels réels (largeur mesurée par `ResizeObserver`) : le texte n’est jamais déformé.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { EVOLUTION_CHART_PADDING, formatNetWorthAmount, monthLabel, projectPoints, type ProjectedPoint } from '@/features/net-worth/format';
import type { NetWorthEvolutionPoint } from '@/features/net-worth/types';

const CHART_HEIGHT = 220;
const GRID_LINES = 4;
const MARK_SIZE = 7;
const MIN_LABEL_GAP = 56;

const props = withDefaults(
    defineProps<{
        points: NetWorthEvolutionPoint[];
        currency: string;
        locale?: string;
        height?: number;
    }>(),
    { locale: undefined, height: CHART_HEIGHT }
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

const projected = computed<ProjectedPoint[]>(() => projectPoints(props.points, width.value, props.height, EVOLUTION_CHART_PADDING));

const linePath = computed(() => projected.value.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' '));

const first = computed(() => projected.value[0] ?? null);
const last = computed(() => (projected.value.length > 1 ? projected.value[projected.value.length - 1] : null));
const current = computed(() => projected.value.find((point) => point.isCurrent) ?? null);

const gridLines = computed(() => {
    const top = EVOLUTION_CHART_PADDING.top;
    const bottom = props.height - EVOLUTION_CHART_PADDING.bottom;
    return Array.from({ length: GRID_LINES }, (_, index) => top + ((bottom - top) * index) / (GRID_LINES - 1));
});

/** Libellés de mois sans chevauchement : on en garde un tous les `step` points. */
const axisLabels = computed(() => {
    const list = projected.value;
    if (!list.length) return [];
    const step = Math.max(1, Math.ceil((MIN_LABEL_GAP * (list.length - 1)) / Math.max(1, width.value - 16)));
    return list
        .map((point, index) => ({ point, index }))
        .filter(({ index }) => index % step === 0 || index === list.length - 1)
        .map(({ point, index }) => ({
            key: `${point.periode}-${index}`,
            x: point.x,
            text: point.isCurrent ? t('netWorthPage.evolution.today') : monthLabel(point.periode, props.locale),
            anchor: index === 0 ? 'start' : index === list.length - 1 ? 'end' : 'middle',
            isCurrent: point.isCurrent
        }));
});

function money(value: number): string {
    return formatNetWorthAmount(value, props.currency, props.locale);
}

const axisY = computed(() => props.height - EVOLUTION_CHART_PADDING.bottom);
const labelY = computed(() => props.height - 8);
</script>

<template>
    <div ref="hostRef" class="nw-chart" :style="{ height: `${height}px` }">
        <svg
            class="nw-chart__svg"
            :width="width"
            :height="height"
            :viewBox="`0 0 ${width} ${height}`"
            role="img"
            :aria-label="t('netWorthPage.evolution.chartLabel')"
        >
            <!-- grille pointillée grise -->
            <line
                v-for="(y, index) in gridLines"
                :key="`grid-${index}`"
                class="nw-chart__grid"
                :x1="EVOLUTION_CHART_PADDING.left"
                :x2="width - EVOLUTION_CHART_PADDING.right"
                :y1="y"
                :y2="y"
            />
            <!-- axe des mois : filet fin plein -->
            <line
                class="nw-chart__axis"
                :x1="EVOLUTION_CHART_PADDING.left"
                :x2="width - EVOLUTION_CHART_PADDING.right"
                :y1="axisY"
                :y2="axisY"
            />

            <!-- courbe 2 px bleue sans aplat -->
            <path v-if="projected.length > 1" class="nw-chart__line" :d="linePath" />

            <!-- premier et dernier point : petit carré noir, valeur écrite -->
            <template v-if="first">
                <rect
                    v-if="!first.isCurrent"
                    class="nw-chart__dot"
                    :x="first.x - MARK_SIZE / 2"
                    :y="first.y - MARK_SIZE / 2"
                    :width="MARK_SIZE"
                    :height="MARK_SIZE"
                />
                <text class="nw-chart__value" :x="first.x" :y="first.y - 10" text-anchor="start">{{ money(first.netWorth) }}</text>
            </template>
            <template v-if="last">
                <rect
                    v-if="!last.isCurrent"
                    class="nw-chart__dot"
                    :x="last.x - MARK_SIZE / 2"
                    :y="last.y - MARK_SIZE / 2"
                    :width="MARK_SIZE"
                    :height="MARK_SIZE"
                />
                <text class="nw-chart__value" :x="last.x" :y="last.y - 10" text-anchor="end">{{ money(last.netWorth) }}</text>
            </template>

            <!-- point courant : carré bleu plein -->
            <rect
                v-if="current"
                class="nw-chart__current"
                :x="current.x - MARK_SIZE / 2"
                :y="current.y - MARK_SIZE / 2"
                :width="MARK_SIZE"
                :height="MARK_SIZE"
            />

            <!-- axe des mois en 12.5 px gris -->
            <text
                v-for="label in axisLabels"
                :key="label.key"
                class="nw-chart__month"
                :class="{ 'is-current': label.isCurrent }"
                :x="label.x"
                :y="labelY"
                :text-anchor="label.anchor"
            >
                {{ label.text }}
            </text>
        </svg>
    </div>
</template>

<style scoped>
.nw-chart {
    width: 100%;
    min-width: 0;
    overflow: hidden;
}

.nw-chart__svg {
    display: block;
    max-width: 100%;
    font-family: var(--font-ui);
}

.nw-chart__grid {
    stroke: var(--line);
    stroke-width: 1;
    stroke-dasharray: 2 4;
}

.nw-chart__axis {
    stroke: var(--line);
    stroke-width: 1;
}

.nw-chart__line {
    fill: none;
    stroke: var(--blue);
    stroke-width: 2;
    stroke-linejoin: miter;
    stroke-linecap: square;
}

.nw-chart__dot {
    fill: var(--ink);
}

.nw-chart__current {
    fill: var(--blue);
}

.nw-chart__value {
    fill: var(--ink);
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.nw-chart__month {
    fill: var(--gray);
    font-size: 12.5px;
    font-variant-numeric: tabular-nums;
}

.nw-chart__month.is-current {
    fill: var(--blue-ink);
    font-weight: 700;
}
</style>
