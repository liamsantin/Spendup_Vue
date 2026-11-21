<script setup lang="ts">
/**
 * Corps de la page « Mon mois » : reste à dépenser d’un mois (`GET /api/insights/month`),
 * constaté / prévu / total côte à côte, sorties par type de dépense avec leurs catégories, et notes.
 * Le mois est piloté par la page (paramètre `m` de l’adresse).
 */
defineOptions({ name: 'MonthOverviewContent' });

import { computed, toRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { ChevronLeftIcon, ChevronRightIcon } from 'vue-tabler-icons';
import { formatAccountBalance } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import { DASHBOARD_MASKED_AMOUNT } from '@/features/dashboard/format';
import { monthKey, monthStart, shiftMonth, spendingSegments, type MonthFlows } from '@/features/dashboard/insights';
import { groupExpensesByKind, monthTransactionsQuery, SPENDING_KIND_COLORS } from '@/features/dashboard/month-page';
import { useMonthInsights } from '@/features/dashboard/composables/useMonthInsights';

const props = defineProps<{
    month: string;
    /** Devise demandée ; absente = devise du compte principal (choisie par l’API). */
    currency?: string | null;
    hideAmounts: boolean;
    findCategory: Parameters<typeof groupExpensesByKind>[1];
}>();

const emit = defineEmits<{ 'update:month': [month: string] }>();

const { t, locale } = useI18n();

const current = monthKey();
const { data, loading, failed, reload } = useMonthInsights(toRef(props, 'month'), toRef(props, 'currency'));

const monthTitle = computed(() =>
    new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(monthStart(props.month))
);

function money(amount: number, cur: string = data.value?.currency ?? props.currency ?? 'CHF'): string {
    if (props.hideAmounts) return DASHBOARD_MASKED_AMOUNT;
    return formatAccountBalance(amount, cur as Currency, locale.value);
}

function percent(share: number): string {
    return new Intl.NumberFormat(locale.value, { style: 'percent', maximumFractionDigits: 0 }).format(share);
}

function rate(flows: MonthFlows): string {
    return flows.savingsRate == null ? t('dashboard.remaining.noSavingsRate') : percent(flows.savingsRate);
}

const columns = computed(() => {
    const value = data.value;
    if (!value) return [];
    return [
        { key: 'actual', label: t('dashboard.remaining.actual'), flows: value.actual, hint: null },
        { key: 'planned', label: t('dashboard.remaining.planned'), flows: value.planned, hint: null },
        { key: 'total', label: t('monthPage.total'), flows: value.total, hint: t('monthPage.totalHint') }
    ];
});

const hasPlanned = computed(() => !!data.value && (data.value.planned.income > 0 || data.value.planned.expense > 0));
const isEmpty = computed(() => !!data.value && data.value.actual.count === 0 && !hasPlanned.value);
const segments = computed(() => spendingSegments(data.value?.actual));
const groups = computed(() => (data.value ? groupExpensesByKind(data.value, props.findCategory) : []));

const otherCurrencies = computed(() =>
    (data.value?.otherCurrencies ?? []).map((row) => money(row.actualIncome - row.actualExpense, row.currency)).join(' · ')
);
const hasNotes = computed(() => !!data.value && (data.value.savingsTransfers > 0 || data.value.hiddenCount > 0 || !!otherCurrencies.value));

function transactionsLink(categoryPublicId?: string | null) {
    return { path: '/app/finances/transactions', query: data.value ? monthTransactionsQuery(data.value, categoryPublicId) : {} };
}
</script>

<template>
    <div class="month-page">
        <nav class="month-page__nav" :aria-label="t('monthPage.title')">
            <button
                type="button"
                class="su-btn su-btn--ghost su-btn--sm"
                :aria-label="t('dashboard.remaining.previous')"
                @click="emit('update:month', shiftMonth(month, -1))"
            >
                <ChevronLeftIcon :size="16" />
            </button>
            <h2 class="month-page__month">{{ monthTitle }}</h2>
            <button
                type="button"
                class="su-btn su-btn--ghost su-btn--sm"
                :aria-label="t('dashboard.remaining.next')"
                @click="emit('update:month', shiftMonth(month, 1))"
            >
                <ChevronRightIcon :size="16" />
            </button>
            <button v-if="month !== current" type="button" class="su-link" @click="emit('update:month', current)">
                {{ t('dashboard.remaining.current') }}
            </button>
        </nav>

        <div v-if="loading && !data" class="su-loading"><span class="su-spin" /></div>
        <p v-else-if="failed" class="month-page__empty">
            {{ t('dashboard.remaining.loadFailed') }}
            <button type="button" class="su-link" @click="reload()">{{ t('common.retry') }}</button>
        </p>
        <template v-else-if="data">
            <p v-if="isEmpty" class="month-page__empty">{{ t('dashboard.remaining.empty') }}</p>
            <template v-else>
                <section class="su-section" :aria-label="t('dashboard.remaining.title')">
                    <div class="month-page__lead">
                        <span class="month-page__badge">{{ t('dashboard.remaining.actual') }}</span>
                        <p class="month-page__num" :class="{ 'su-pos': data.actual.balance >= 0 }">{{ money(data.actual.balance) }}</p>
                    </div>

                    <div class="month-page__columns">
                        <div v-for="col in columns" :key="col.key" class="month-page__col" :class="`month-page__col--${col.key}`">
                            <h3>{{ col.label }}</h3>
                            <dl>
                                <div>
                                    <dt>{{ t('dashboard.remaining.income') }}</dt>
                                    <dd>{{ money(col.flows.income) }}</dd>
                                </div>
                                <div>
                                    <dt>{{ t('dashboard.remaining.expense') }}</dt>
                                    <dd>{{ money(col.flows.expense) }}</dd>
                                </div>
                                <div class="month-page__balance">
                                    <dt>{{ t('monthPage.balance') }}</dt>
                                    <dd :class="{ 'su-pos': col.flows.balance > 0 }">{{ money(col.flows.balance) }}</dd>
                                </div>
                                <div>
                                    <dt>{{ t('dashboard.remaining.savingsRate') }}</dt>
                                    <dd>{{ rate(col.flows) }}</dd>
                                </div>
                            </dl>
                            <p class="month-page__muted">
                                <template v-if="col.key === 'planned' && !hasPlanned">{{ t('monthPage.plannedEmpty') }}</template>
                                <template v-else-if="col.hint">{{ col.hint }}</template>
                                <template v-else>{{ t('monthPage.count', { count: col.flows.count }, col.flows.count) }}</template>
                            </p>
                        </div>
                    </div>
                </section>

                <section v-if="groups.length" class="su-section">
                    <header class="su-section__head month-page__head">
                        <div>
                            <h2>{{ t('monthPage.byKind') }}</h2>
                            <p>{{ t('monthPage.byKindHint') }}</p>
                        </div>
                        <RouterLink :to="transactionsLink()" class="su-link">{{ t('monthPage.seeTransactions') }}</RouterLink>
                    </header>

                    <div class="month-page__bar" role="img" :aria-label="t('dashboard.remaining.breakdown')">
                        <span
                            v-for="row in segments"
                            :key="row.kind"
                            :style="{ width: `${Math.max(row.share * 100, 1)}%`, background: SPENDING_KIND_COLORS[row.kind] }"
                        />
                    </div>

                    <div class="month-page__groups">
                        <article v-for="group in groups" :key="group.kind" class="month-page__group">
                            <h3>
                                <span class="su-sq" :style="{ '--sq-color': SPENDING_KIND_COLORS[group.kind] }" aria-hidden="true" />
                                <span class="month-page__kind">{{ t(`spendingKinds.${group.kind}`) }}</span>
                                <span class="month-page__muted">{{ percent(group.share) }}</span>
                                <span class="month-page__amount">{{ money(group.amount) }}</span>
                            </h3>
                            <ul>
                                <li v-for="(row, index) in group.categories" :key="row.categoryPublicId ?? `none-${index}`">
                                    <RouterLink
                                        v-if="row.categoryPublicId"
                                        :to="transactionsLink(row.categoryPublicId)"
                                        class="month-page__cat"
                                        :aria-label="t('monthPage.categoryTransactions', { name: row.name })"
                                    >
                                        <span
                                            class="su-sq"
                                            :style="{ '--sq-color': row.color || 'var(--t-gray-ink)' }"
                                            aria-hidden="true"
                                        />
                                        {{ row.name }}
                                    </RouterLink>
                                    <span v-else class="month-page__cat month-page__muted">{{ t('monthPage.uncategorized') }}</span>
                                    <span class="month-page__amount">{{ money(row.amount) }}</span>
                                </li>
                            </ul>
                            <p
                                v-if="group.kind === 'nonClasse' && group.categories.some((row) => row.categoryPublicId)"
                                class="month-page__muted"
                            >
                                {{ t('monthPage.unclassifiedHint') }}
                                <RouterLink to="/app/gestion/categories" class="su-link">{{ t('monthPage.classify') }}</RouterLink>
                            </p>
                        </article>
                    </div>
                </section>

                <section v-if="hasNotes" class="su-section">
                    <header class="su-section__head">
                        <h2>{{ t('monthPage.notes') }}</h2>
                    </header>
                    <ul class="month-page__notes">
                        <li v-if="data.savingsTransfers > 0">
                            {{ t('dashboard.remaining.savingsTransfers', { amount: money(data.savingsTransfers) }) }}
                        </li>
                        <li v-if="data.hiddenCount > 0">
                            {{ t('dashboard.remaining.hidden', { count: data.hiddenCount }, data.hiddenCount) }}
                        </li>
                        <li v-if="otherCurrencies">{{ t('dashboard.remaining.otherCurrencies', { list: otherCurrencies }) }}</li>
                    </ul>
                </section>
            </template>
        </template>
    </div>
</template>

<style scoped>
.month-page {
    display: grid;
    gap: 16px;
}

.month-page__nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
}

.month-page__month {
    min-width: 10em;
    margin: 0;
    font-size: 1.125rem;
    text-align: center;
    text-transform: capitalize;
}

.month-page__empty {
    margin: 0;
    color: var(--gray);
}

.month-page__lead {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 16px;
}

.month-page__num {
    margin: 0;
    font-size: 2.25rem;
    font-variant-numeric: tabular-nums;
}

.month-page__badge {
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.75rem;
    color: var(--t-gray-ink);
    background: var(--t-gray-bg);
}

.month-page__columns {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
}

.month-page__col {
    padding-top: 8px;
    border-top: 2px solid var(--line);
}

.month-page__col--planned {
    border-top-color: var(--t-blue-ink);
}

.month-page__col--total {
    border-top-color: var(--ink);
}

.month-page__col h3,
.month-page__group h3 {
    margin: 0 0 8px;
    font-size: 0.875rem;
    font-weight: 600;
}

.month-page__col dl {
    display: grid;
    gap: 4px;
    margin: 0;
}

.month-page__col dl > div,
.month-page__group li {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-variant-numeric: tabular-nums;
}

.month-page__col dd {
    margin: 0;
}

.month-page__balance {
    font-weight: 600;
}

.month-page__muted {
    margin: 8px 0 0;
    color: var(--gray);
    font-size: 0.875rem;
}

.month-page__head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
}

.month-page__bar {
    display: flex;
    height: 10px;
    margin: 8px 0 16px;
    overflow: hidden;
    border-radius: 2px;
    background: var(--line);
}

.month-page__bar span {
    height: 100%;
}

.month-page__groups {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
}

.month-page__group h3 {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: 8px;
}

.month-page__group h3 .month-page__muted {
    margin: 0;
    font-weight: 400;
}

.month-page__group ul,
.month-page__notes {
    display: grid;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.month-page__cat {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    margin: 0;
    color: inherit;
    text-decoration: none;
}

a.month-page__cat:hover {
    text-decoration: underline;
}

.month-page__amount {
    font-variant-numeric: tabular-nums;
}

.month-page__notes li {
    color: var(--gray);
}

@media (max-width: 640px) {
    .month-page__columns {
        grid-template-columns: 1fr;
    }
}
</style>
