<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ChartPieIcon } from 'vue-tabler-icons';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';
import { BUDGETS_PATHS, budgetDetailPath } from '@/features/budgets/paths';
import { budgetBarWidth, budgetProgressTone, formatPercentUsed, isBudgetOverspent } from '@/features/budgets/format';
import { useBudgetsStore } from '@/features/budgets/stores/budgets-store';
import { DASHBOARD_MASKED_AMOUNT } from '@/features/dashboard/format';

defineProps<{
    hideAmounts?: boolean;
}>();

const { t, locale } = useI18n();
const store = useBudgetsStore();

const rows = computed(() => store.items.filter((item) => item.isActive).slice(0, 6));
</script>

<template>
    <AppGlassCard :title="t('dashboard.budgets.title')" :subtitle="t('dashboard.budgets.subtitle')">
        <template #icon>
            <ChartPieIcon :size="20" stroke-width="1.5" />
        </template>
        <template #actions>
            <RouterLink :to="BUDGETS_PATHS.list" class="su-btn su-btn--ghost">
                {{ t('dashboard.actions.seeAll') }}
            </RouterLink>
        </template>

        <div v-if="store.loading && !rows.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <div v-else-if="!rows.length" class="su-empty">
            <p>{{ t('dashboard.budgets.empty') }}</p>
            <RouterLink :to="BUDGETS_PATHS.list" class="su-btn su-btn--ink">
                {{ t('dashboard.actions.addBudget') }}
            </RouterLink>
        </div>
        <div v-else class="dash-budgets">
            <RouterLink v-for="budget in rows" :key="budget.publicId" class="dash-budget" :to="budgetDetailPath(budget.publicId)">
                <span class="dash-budget__meta">
                    <span class="dash-budget__name">{{ budget.name }}</span>
                    <span class="dash-budget__sub">
                        {{
                            hideAmounts
                                ? DASHBOARD_MASKED_AMOUNT
                                : isBudgetOverspent(budget)
                                  ? t('dashboard.budgets.overspent')
                                  : t('dashboard.budgets.used', {
                                        percent: formatPercentUsed(budget.isCurrent ? budget.percentUsed : 0, locale)
                                    })
                        }}
                    </span>
                </span>
                <span class="dash-budget__bar" :class="`is-${budgetProgressTone(budget)}`">
                    <span class="dash-budget__fill" :style="{ width: `${budgetBarWidth(budget)}%` }" />
                </span>
            </RouterLink>
        </div>
    </AppGlassCard>
</template>

<style scoped>
.dash-budgets {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.dash-budget {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 8px;
    border-radius: 12px;
    color: inherit;
    text-decoration: none;
}

.dash-budget:hover {
    background: color-mix(in srgb, rgb(var(--v-theme-primary)) 6%, transparent);
}

.dash-budget__name {
    display: block;
    font-weight: 650;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.dash-budget__sub {
    color: var(--ink-muted);
    font-size: 0.78rem;
}

.dash-budget__bar {
    display: block;
    height: 6px;
    border-radius: 999px;
    background: color-mix(in srgb, rgb(var(--v-theme-primary)) 12%, var(--hair));
    overflow: hidden;
}

.dash-budget__fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: rgb(var(--v-theme-primary));
}

.dash-budget__bar.is-warn .dash-budget__fill {
    background: rgb(var(--v-theme-warning));
}

.dash-budget__bar.is-over .dash-budget__fill {
    background: rgb(var(--v-theme-error));
}

.dash-budget__bar.is-idle .dash-budget__fill {
    background: var(--ink-muted);
}
</style>
