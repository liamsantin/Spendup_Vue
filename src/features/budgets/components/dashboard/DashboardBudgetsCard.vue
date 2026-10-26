<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { BUDGETS_PATHS, budgetDetailPath } from '@/features/budgets/paths';
import { budgetBarWidth, budgetProgressTone, formatBudgetAmount, formatPercentUsed, isBudgetOverspent } from '@/features/budgets/format';
import { useBudgetsStore } from '@/features/budgets/stores/budgets-store';
import { BUDGET_GAUGE_SEGMENTS, DASHBOARD_MASKED_AMOUNT, summarizeBudgets } from '@/features/dashboard/format';

const props = defineProps<{
    hideAmounts?: boolean;
}>();

const { t, locale } = useI18n();
const store = useBudgetsStore();

const rows = computed(() => store.items.filter((item) => item.isActive).slice(0, 6));

/** Budget global de la période en cours (somme des budgets actifs et courants). */
const summary = computed(() => summarizeBudgets(store.items));
const isOver = computed(() => (summary.value?.percent ?? 0) > 100);

const monthLabel = computed(() => new Intl.DateTimeFormat(locale.value, { month: 'long' }).format(new Date()));

const percentText = computed(() => {
    if (!summary.value) return '';
    if (props.hideAmounts) return DASHBOARD_MASKED_AMOUNT;
    return new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 }).format(summary.value.percent);
});

const summaryLine = computed(() => {
    if (!summary.value || props.hideAmounts) return '';
    const { currency, spent, limit, remaining } = summary.value;
    return t('dashboard.budgets.summary', {
        spent: formatBudgetAmount(spent, currency, locale.value),
        limit: formatBudgetAmount(limit, currency, locale.value),
        remaining: formatBudgetAmount(remaining, currency, locale.value)
    });
});

function budgetSub(budget: (typeof rows.value)[number]): string {
    if (props.hideAmounts) return DASHBOARD_MASKED_AMOUNT;
    if (isBudgetOverspent(budget)) return t('dashboard.budgets.overspent');
    return t('dashboard.budgets.used', { percent: formatPercentUsed(budget.isCurrent ? budget.percentUsed : 0, locale.value) });
}
</script>

<template>
    <section class="su-section dash-budgets">
        <header class="su-section__head">
            <h2>{{ t('dashboard.budgets.title') }}</h2>
            <RouterLink :to="BUDGETS_PATHS.list" class="su-link">{{ t('dashboard.actions.seeAll') }}</RouterLink>
        </header>

        <div v-if="store.loading && !rows.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <div v-else-if="!rows.length" class="su-empty">
            <p>{{ t('dashboard.budgets.empty') }}</p>
            <RouterLink :to="BUDGETS_PATHS.list" class="su-btn su-btn--ink">
                {{ t('dashboard.actions.addBudget') }}
            </RouterLink>
        </div>
        <template v-else>
            <!-- budget global : pourcentage héros + jauge segmentée de 20 carrés -->
            <div v-if="summary" class="dash-budgets__total">
                <p class="dash-budgets__label">{{ t('dashboard.budgets.monthLabel', { month: monthLabel }) }}</p>
                <p class="dash-budgets__percent" :class="{ 'su-over': isOver }">{{ percentText }}<small v-if="!hideAmounts">%</small></p>
                <div
                    class="dash-budgets__segments"
                    role="img"
                    :aria-label="hideAmounts ? DASHBOARD_MASKED_AMOUNT : formatPercentUsed(summary.percent, locale)"
                >
                    <span
                        v-for="index in BUDGET_GAUGE_SEGMENTS"
                        :key="index"
                        class="dash-budgets__seg"
                        :class="{ 'is-on': !hideAmounts && index <= summary.segments, 'is-over': isOver }"
                    />
                </div>
                <p v-if="summaryLine" class="dash-budgets__summary">{{ summaryLine }}</p>
            </div>

            <!-- détail par budget : nom, état, jauge carrée -->
            <ul class="dash-budgets__list">
                <li v-for="budget in rows" :key="budget.publicId">
                    <RouterLink class="dash-budget" :to="budgetDetailPath(budget.publicId)">
                        <span class="dash-budget__head">
                            <span class="dash-budget__name">{{ budget.name }}</span>
                            <span class="dash-budget__sub" :class="{ 'su-over': !hideAmounts && isBudgetOverspent(budget) }">{{
                                budgetSub(budget)
                            }}</span>
                        </span>
                        <span class="su-gauge dash-budget__gauge">
                            <span
                                class="su-gauge__fill"
                                :class="{ 'su-gauge__fill--over': budgetProgressTone(budget) === 'over' }"
                                :style="{ width: `${budgetBarWidth(budget)}%` }"
                            />
                        </span>
                    </RouterLink>
                </li>
            </ul>
        </template>
    </section>
</template>

<style scoped>
/* Bloc budget Swiss : libellé 13 px, pourcentage héros, 20 carrés bleus / gris, ligne grise. */
.dash-budgets__total {
    padding-bottom: 20px;
}

.dash-budgets__label {
    margin: 0;
    font-size: 13px;
    color: var(--ink);
}

.dash-budgets__percent {
    margin: 6px 0 14px;
    font-size: 64px;
    font-weight: 700;
    letter-spacing: -0.055em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
}

.dash-budgets__percent small {
    margin-left: 6px;
    font-size: 0.38em;
    font-weight: 400;
    letter-spacing: -0.02em;
    color: var(--gray);
}

.dash-budgets__segments {
    display: grid;
    grid-template-columns: repeat(20, minmax(0, 1fr));
    gap: 3px;
    height: 22px;
}

.dash-budgets__seg {
    display: block;
    background: var(--line);
}

.dash-budgets__seg.is-on {
    background: var(--blue);
}

.dash-budgets__seg.is-on.is-over {
    background: var(--violet);
}

.dash-budgets__summary {
    margin: 12px 0 0;
    color: var(--gray);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}

.dash-budgets__list {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
}

.dash-budget {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 0 14px;
    border-top: 1px solid var(--line);
    color: inherit;
    text-decoration: none;
    transition: background 0.15s var(--ease);
}

.dash-budget:hover {
    background: var(--soft);
}

.dash-budget__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    min-width: 0;
}

.dash-budget__name {
    min-width: 0;
    overflow: hidden;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.dash-budget__sub {
    flex: none;
    color: var(--gray);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}

.dash-budget__gauge {
    height: 4px;
}
</style>
