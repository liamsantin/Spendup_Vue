<script setup lang="ts">
/**
 * Page « Prévisions » : budget prévisionnel de l’année (`GET /api/forecasts/year`).
 * Mois passés = constaté, mois futurs = prévu ; la source de chaque montant est indiquée. L’année vit dans l’adresse (`?y=`).
 */
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { ChevronLeftIcon, ChevronRightIcon } from 'vue-tabler-icons';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { formatAccountBalance } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import { budgetDetailPath } from '@/features/budgets/paths';
import { monthPageLocation } from '@/features/dashboard/month-page';
import { DASHBOARD_MASKED_AMOUNT } from '@/features/dashboard/format';
import {
    cumulativePoints,
    forecastsApi,
    forecastsLocation,
    lineTarget,
    parseYearQuery,
    plannedShare,
    type ForecastLine,
    type ForecastMonth,
    type YearForecast
} from '@/features/forecasts/forecasts';
import { recurrenceDetailPath } from '@/features/recurring-payments/paths';
import { useUserSettingsStore } from '@/features/user-settings/stores/user-settings-store';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const settings = useUserSettingsStore();

const year = computed(() => parseYearQuery(route.query.y));
const hideAmounts = computed(() => settings.current.hideSensitiveAmounts);

const data = shallowRef<YearForecast | null>(null);
const loading = ref(true);
const failed = ref(false);
const openMonth = ref<string | null>(null);
let seq = 0;

async function load() {
    const ticket = ++seq;
    loading.value = true;
    failed.value = false;
    try {
        const result = await forecastsApi.year(year.value);
        if (ticket === seq) data.value = result;
    } catch {
        if (ticket === seq) {
            data.value = null;
            failed.value = true;
        }
    } finally {
        if (ticket === seq) loading.value = false;
    }
}

watch(year, () => {
    openMonth.value = null;
    void load();
});
onMounted(() => void load());

function setYear(next: number) {
    const { query } = forecastsLocation(next);
    const rest = { ...route.query };
    delete rest.y;
    void router.push({ path: route.path, query: { ...rest, ...query } });
}

function money(amount: number): string {
    if (hideAmounts.value) return DASHBOARD_MASKED_AMOUNT;
    return formatAccountBalance(amount, (data.value?.currency ?? 'CHF') as Currency, locale.value);
}

function monthLabel(key: string): string {
    const [y, m] = key.split('-').map(Number);
    return new Intl.DateTimeFormat(locale.value, { month: 'long' }).format(new Date(y, m - 1, 1));
}

function toggle(key: string) {
    openMonth.value = openMonth.value === key ? null : key;
}

const CHART_W = 600;
const CHART_H = 120;
const points = computed(() => cumulativePoints(data.value?.months ?? [], CHART_W, CHART_H));
const path = computed(() => points.value.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' '));
const currentIndex = computed(() => (data.value?.months ?? []).findIndex((m) => m.phase === 'courant'));
const isEmpty = computed(() => !!data.value && data.value.months.every((m) => m.lines.length === 0));

function percent(share: number): string {
    return new Intl.NumberFormat(locale.value, { style: 'percent', maximumFractionDigits: 0 }).format(share);
}

function lineLabel(line: ForecastLine): string {
    return line.label ?? (line.direction === 'revenu' ? t('forecastsPage.incomeLine') : t('forecastsPage.uncategorized'));
}

function targetLink(line: ForecastLine): string | null {
    const target = lineTarget(line);
    if (!target) return null;
    return target.kind === 'budget'
        ? budgetDetailPath(target.publicId)
        : recurrenceDetailPath(line.direction === 'revenu' ? 'income' : 'expense', target.publicId);
}

function monthLink(month: ForecastMonth) {
    return monthPageLocation(month.month);
}
</script>

<template>
    <AppPageShell :title="t('forecastsPage.title')" :subtitle="t('forecastsPage.subtitle')">
        <div class="forecast">
            <nav class="forecast__nav" :aria-label="t('forecastsPage.title')">
                <button
                    type="button"
                    class="su-btn su-btn--ghost su-btn--sm"
                    :aria-label="t('forecastsPage.previous')"
                    @click="setYear(year - 1)"
                >
                    <ChevronLeftIcon :size="16" />
                </button>
                <h2 class="forecast__year">{{ year }}</h2>
                <button
                    type="button"
                    class="su-btn su-btn--ghost su-btn--sm"
                    :aria-label="t('forecastsPage.next')"
                    @click="setYear(year + 1)"
                >
                    <ChevronRightIcon :size="16" />
                </button>
                <button v-if="year !== new Date().getFullYear()" type="button" class="su-link" @click="setYear(new Date().getFullYear())">
                    {{ t('forecastsPage.current') }}
                </button>
            </nav>

            <div v-if="loading && !data" class="su-loading"><span class="su-spin" /></div>
            <p v-else-if="failed" class="forecast__muted">
                {{ t('forecastsPage.loadFailed') }}
                <button type="button" class="su-link" @click="load()">{{ t('common.retry') }}</button>
            </p>
            <template v-else-if="data">
                <p v-if="isEmpty" class="forecast__muted">{{ t('forecastsPage.empty') }}</p>
                <template v-else>
                    <section class="su-section">
                        <header class="su-section__head">
                            <h2>{{ t('forecastsPage.cumulative') }}</h2>
                            <p>{{ t('forecastsPage.cumulativeHint') }}</p>
                        </header>
                        <svg
                            v-if="path"
                            class="forecast__chart"
                            :viewBox="`-8 -8 ${CHART_W + 16} ${CHART_H + 16}`"
                            role="img"
                            :aria-label="t('forecastsPage.cumulative')"
                        >
                            <path :d="path" fill="none" stroke="var(--ink)" stroke-width="2" />
                            <circle
                                v-if="currentIndex >= 0 && points[currentIndex]"
                                :cx="points[currentIndex][0]"
                                :cy="points[currentIndex][1]"
                                r="4"
                                fill="var(--blue)"
                            />
                        </svg>
                        <p class="forecast__muted">{{ t('forecastsPage.estimateNote') }}</p>
                    </section>

                    <section class="su-section">
                        <div class="forecast__scroll">
                            <table class="forecast__table">
                                <thead>
                                    <tr>
                                        <th scope="col">{{ t('forecastsPage.month') }}</th>
                                        <th scope="col">{{ t('dashboard.remaining.income') }}</th>
                                        <th scope="col">{{ t('dashboard.remaining.expense') }}</th>
                                        <th scope="col">{{ t('monthPage.balance') }}</th>
                                        <th scope="col">{{ t('forecastsPage.cumulativeShort') }}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <template v-for="m in data.months" :key="m.month">
                                        <tr class="forecast__row" :class="`forecast__row--${m.phase}`">
                                            <th scope="row">
                                                <button
                                                    type="button"
                                                    class="forecast__toggle"
                                                    :aria-expanded="openMonth === m.month"
                                                    @click="toggle(m.month)"
                                                >
                                                    {{ monthLabel(m.month) }}
                                                </button>
                                                <span class="forecast__badge" :class="{ 'forecast__badge--planned': m.phase === 'futur' }">
                                                    {{ t(`forecastsPage.phase.${m.phase}`) }}
                                                </span>
                                            </th>
                                            <td>{{ money(m.flows.income) }}</td>
                                            <td>
                                                {{ money(m.flows.expense) }}
                                                <small v-if="m.phase !== 'passe' && plannedShare(m) > 0" class="forecast__muted">
                                                    {{ t('forecastsPage.plannedShare', { share: percent(plannedShare(m)) }) }}
                                                </small>
                                            </td>
                                            <td :class="{ 'su-pos': m.flows.balance > 0 }">{{ money(m.flows.balance) }}</td>
                                            <td>{{ money(m.cumulativeBalance) }}</td>
                                        </tr>
                                        <tr v-if="openMonth === m.month" class="forecast__detail">
                                            <td colspan="5">
                                                <ul v-if="m.lines.length">
                                                    <li v-for="(line, i) in m.lines" :key="i">
                                                        <span class="forecast__line-label">
                                                            <RouterLink v-if="targetLink(line)" :to="targetLink(line)!" class="su-link">{{
                                                                lineLabel(line)
                                                            }}</RouterLink>
                                                            <template v-else>{{ lineLabel(line) }}</template>
                                                            <span class="forecast__source">{{
                                                                t(`forecastsPage.source.${line.source}`)
                                                            }}</span>
                                                        </span>
                                                        <span>{{ line.direction === 'revenu' ? '+' : '−' }}{{ money(line.amount) }}</span>
                                                    </li>
                                                </ul>
                                                <p v-else class="forecast__muted">{{ t('forecastsPage.monthEmpty') }}</p>
                                                <RouterLink :to="monthLink(m)" class="su-link">{{
                                                    t('forecastsPage.seeMonth')
                                                }}</RouterLink>
                                            </td>
                                        </tr>
                                    </template>
                                </tbody>
                            </table>
                        </div>
                    </section>
                </template>
            </template>
        </div>
    </AppPageShell>
</template>

<style scoped>
.forecast {
    display: grid;
    gap: 16px;
}

.forecast__nav {
    display: flex;
    align-items: center;
    gap: 8px;
}

.forecast__year {
    min-width: 5em;
    margin: 0;
    font-size: 1.125rem;
    text-align: center;
}

.forecast__muted {
    margin: 0;
    color: var(--gray);
    font-size: 0.875rem;
}

.forecast__chart {
    width: 100%;
    max-height: 180px;
}

.forecast__scroll {
    overflow-x: auto;
}

.forecast__table {
    width: 100%;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
}

.forecast__table th,
.forecast__table td {
    padding: 8px;
    text-align: right;
    border-bottom: 1px solid var(--line);
}

.forecast__table th:first-child {
    text-align: left;
}

.forecast__row--futur {
    background: var(--t-blue-bg);
}

.forecast__toggle {
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    font-weight: 600;
    text-transform: capitalize;
    cursor: pointer;
}

.forecast__badge {
    margin-left: 8px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--t-gray-ink);
    background: var(--t-gray-bg);
}

.forecast__badge--planned {
    color: var(--t-blue-ink);
}

.forecast__detail td {
    text-align: left;
}

.forecast__detail ul {
    display: grid;
    gap: 4px;
    margin: 0 0 8px;
    padding: 0;
    list-style: none;
}

.forecast__detail li {
    display: flex;
    justify-content: space-between;
    gap: 8px;
}

.forecast__source {
    margin-left: 8px;
    color: var(--gray);
    font-size: 0.75rem;
}
</style>
