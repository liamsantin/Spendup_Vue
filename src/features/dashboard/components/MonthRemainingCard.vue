<script setup lang="ts">
/**
 * Résumé « Reste à dépenser » du mois en cours sur le tableau de bord (M1) : balance constatée, revenus,
 * sorties, taux d’épargne et répartition obligatoire / plaisir / épargne. Le détail (autres mois, prévu,
 * catégories par type, notes) est sur la page « Mon mois ».
 */
defineOptions({ name: 'MonthRemainingCard' });

import { computed, toRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatAccountBalance } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import { DASHBOARD_MASKED_AMOUNT } from '@/features/dashboard/format';
import { monthKey, spendingSegments } from '@/features/dashboard/insights';
import { MONTH_PATH, SPENDING_KIND_COLORS } from '@/features/dashboard/month-page';
import { useMonthInsights } from '@/features/dashboard/composables/useMonthInsights';

const props = defineProps<{ currency: string; hideAmounts: boolean }>();

const { t, locale } = useI18n();

const month = computed(() => monthKey());
const { data, loading, failed, reload } = useMonthInsights(month, toRef(props, 'currency'));

function money(amount: number): string {
    if (props.hideAmounts) return DASHBOARD_MASKED_AMOUNT;
    return formatAccountBalance(amount, (data.value?.currency ?? props.currency) as Currency, locale.value);
}

function percent(share: number): string {
    return new Intl.NumberFormat(locale.value, { style: 'percent', maximumFractionDigits: 0 }).format(share);
}

const actual = computed(() => data.value?.actual ?? null);
const planned = computed(() => data.value?.planned ?? null);
const hasPlanned = computed(() => !!planned.value && (planned.value.income > 0 || planned.value.expense > 0));
const segments = computed(() => spendingSegments(actual.value));
const isEmpty = computed(() => !!actual.value && actual.value.count === 0 && !hasPlanned.value);
</script>

<template>
    <section class="su-section month-rest" :aria-label="t('dashboard.remaining.title')">
        <header class="su-section__head month-rest__head">
            <h2>{{ t('dashboard.remaining.title') }}</h2>
            <RouterLink :to="MONTH_PATH" class="su-link">{{ t('dashboard.remaining.seeMonth') }}</RouterLink>
        </header>

        <div v-if="loading && !data" class="su-loading"><span class="su-spin" /></div>
        <p v-else-if="failed" class="dash-empty">
            {{ t('dashboard.remaining.loadFailed') }}
            <button type="button" class="su-link" @click="reload()">{{ t('common.retry') }}</button>
        </p>
        <template v-else-if="data && actual">
            <p v-if="isEmpty" class="dash-empty">{{ t('dashboard.remaining.empty') }}</p>
            <template v-else>
                <div class="month-rest__lead">
                    <span class="month-rest__badge">{{ t('dashboard.remaining.actual') }}</span>
                    <p class="month-rest__num" :class="{ 'su-pos': actual.balance >= 0 }">{{ money(actual.balance) }}</p>
                </div>

                <div class="su-figs month-rest__figs">
                    <div class="su-fig">
                        <p class="su-fig__label">{{ t('dashboard.remaining.income') }}</p>
                        <p class="su-fig__num">{{ money(actual.income) }}</p>
                    </div>
                    <div class="su-fig">
                        <p class="su-fig__label">{{ t('dashboard.remaining.expense') }}</p>
                        <p class="su-fig__num">{{ money(actual.expense) }}</p>
                    </div>
                    <div class="su-fig">
                        <p class="su-fig__label">{{ t('dashboard.remaining.savingsRate') }}</p>
                        <p class="su-fig__num">
                            {{ actual.savingsRate == null ? t('dashboard.remaining.noSavingsRate') : percent(actual.savingsRate) }}
                        </p>
                    </div>
                </div>

                <div v-if="segments.length" class="month-rest__breakdown">
                    <p class="su-fig__label">{{ t('dashboard.remaining.breakdown') }}</p>
                    <div class="month-rest__bar" role="img" :aria-label="t('dashboard.remaining.breakdown')">
                        <span
                            v-for="row in segments"
                            :key="row.kind"
                            class="month-rest__seg"
                            :style="{ width: `${Math.max(row.share * 100, 1)}%`, background: SPENDING_KIND_COLORS[row.kind] }"
                        />
                    </div>
                    <ul class="month-rest__legend">
                        <li v-for="row in segments" :key="row.kind">
                            <span class="su-sq" :style="{ '--sq-color': SPENDING_KIND_COLORS[row.kind] }" aria-hidden="true" />
                            <span class="month-rest__kind">{{ t(`spendingKinds.${row.kind}`) }}</span>
                            <span class="month-rest__share">{{ percent(row.share) }}</span>
                            <span class="month-rest__amount">{{ money(row.amount) }}</span>
                        </li>
                    </ul>
                </div>

                <div v-if="hasPlanned && data" class="month-rest__planned">
                    <span class="month-rest__badge month-rest__badge--planned">{{ t('dashboard.remaining.planned') }}</span>
                    <p>{{ t('dashboard.remaining.projected', { amount: money(data.total.balance) }) }}</p>
                </div>
            </template>
        </template>
    </section>
</template>

<style scoped>
.month-rest__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.month-rest__lead {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin: 8px 0 12px;
}

.month-rest__num {
    margin: 0;
    font-size: 2rem;
    font-variant-numeric: tabular-nums;
}

.month-rest__badge {
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.75rem;
    color: var(--t-gray-ink);
    background: var(--t-gray-bg);
}

.month-rest__badge--planned {
    color: var(--t-blue-ink);
    background: var(--t-blue-bg);
}

.month-rest__breakdown {
    margin-top: 16px;
}

.month-rest__bar {
    display: flex;
    height: 10px;
    overflow: hidden;
    border-radius: 2px;
    background: var(--line);
}

.month-rest__seg {
    height: 100%;
}

.month-rest__legend {
    display: grid;
    gap: 4px;
    margin: 8px 0 0;
    padding: 0;
    list-style: none;
}

.month-rest__legend li {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: 8px;
    font-variant-numeric: tabular-nums;
}

.month-rest__share {
    color: var(--gray);
}

.month-rest__planned {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-top: 16px;
}

.month-rest__planned p {
    margin: 0;
}
</style>
