<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { SAVINGS_GOALS_PATHS, savingsGoalDetailPath } from '@/features/savings-goals/paths';
import { formatPercentReached, savingsGoalBarWidth, savingsGoalProgressTone } from '@/features/savings-goals/format';
import { useSavingsGoalsStore } from '@/features/savings-goals/stores/savings-goals-store';
import { DASHBOARD_MASKED_AMOUNT } from '@/features/dashboard/format';

defineProps<{
    hideAmounts?: boolean;
}>();

const { t, locale } = useI18n();
const store = useSavingsGoalsStore();

const rows = computed(() => store.items.filter((item) => item.status === 'active').slice(0, 6));
</script>

<template>
    <section class="su-section dash-goals">
        <header class="su-section__head">
            <h2>{{ t('dashboard.savingsGoals.title') }}</h2>
            <RouterLink :to="SAVINGS_GOALS_PATHS.list" class="su-link">{{ t('dashboard.actions.seeAll') }}</RouterLink>
        </header>

        <div v-if="store.loading && !rows.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <div v-else-if="!rows.length" class="su-empty">
            <p>{{ t('dashboard.savingsGoals.empty') }}</p>
            <RouterLink :to="SAVINGS_GOALS_PATHS.list" class="su-btn su-btn--ink">
                {{ t('dashboard.actions.addSavingsGoal') }}
            </RouterLink>
        </div>
        <ul v-else class="dash-goals__list">
            <li v-for="goal in rows" :key="goal.publicId">
                <RouterLink class="dash-goal" :to="savingsGoalDetailPath(goal.publicId)">
                    <span class="su-kv dash-goal__kv">
                        <span class="dash-goal__name">{{ goal.name }}</span>
                        <span class="dash-goal__sub" :class="{ 'su-over': !hideAmounts && goal.isOverdue }">
                            {{
                                hideAmounts
                                    ? DASHBOARD_MASKED_AMOUNT
                                    : goal.isOverdue
                                      ? t('dashboard.savingsGoals.overdue')
                                      : t('dashboard.savingsGoals.reached', {
                                            percent: formatPercentReached(goal.percentReached, locale)
                                        })
                            }}
                        </span>
                    </span>
                    <span class="su-gauge dash-goal__gauge">
                        <span
                            class="su-gauge__fill su-gauge__fill--blue"
                            :class="{ 'su-gauge__fill--over': savingsGoalProgressTone(goal) === 'warn' }"
                            :style="{ width: `${savingsGoalBarWidth(goal)}%` }"
                        />
                    </span>
                </RouterLink>
            </li>
        </ul>
    </section>
</template>

<style scoped>
/* Objectifs d'épargne Swiss : ligne libellé / valeur sur filet fin, jauge bleue 4 px (retard en violet). */
.dash-goals__list {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
}

.dash-goal {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 0 14px;
    color: inherit;
    text-decoration: none;
    transition: background 0.15s var(--ease);
}

.dash-goal:hover {
    background: var(--soft);
}

.dash-goal__kv {
    padding: 12px 0 0;
}

.dash-goal__kv > .dash-goal__name {
    min-width: 0;
    overflow: hidden;
    color: var(--ink);
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.dash-goal__kv > .dash-goal__sub {
    flex: none;
    color: var(--gray);
    font-size: 13px;
}

.dash-goal__gauge {
    height: 4px;
}
</style>
