<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { TargetIcon } from 'vue-tabler-icons';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';
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
    <AppGlassCard :title="t('dashboard.savingsGoals.title')" :subtitle="t('dashboard.savingsGoals.subtitle')">
        <template #icon>
            <TargetIcon :size="20" stroke-width="1.5" />
        </template>
        <template #actions>
            <RouterLink :to="SAVINGS_GOALS_PATHS.list" class="su-btn su-btn--ghost">
                {{ t('dashboard.actions.seeAll') }}
            </RouterLink>
        </template>

        <div v-if="store.loading && !rows.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <div v-else-if="!rows.length" class="su-empty">
            <p>{{ t('dashboard.savingsGoals.empty') }}</p>
            <RouterLink :to="SAVINGS_GOALS_PATHS.list" class="su-btn su-btn--ink">
                {{ t('dashboard.actions.addSavingsGoal') }}
            </RouterLink>
        </div>
        <div v-else class="dash-goals">
            <RouterLink v-for="goal in rows" :key="goal.publicId" class="dash-goal" :to="savingsGoalDetailPath(goal.publicId)">
                <span class="dash-goal__meta">
                    <span class="dash-goal__name">{{ goal.name }}</span>
                    <span class="dash-goal__sub">
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
                <span class="dash-goal__bar" :class="`is-${savingsGoalProgressTone(goal)}`">
                    <span class="dash-goal__fill" :style="{ width: `${savingsGoalBarWidth(goal)}%` }" />
                </span>
            </RouterLink>
        </div>
    </AppGlassCard>
</template>

<style scoped>
.dash-goals {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.dash-goal {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 8px;
    border-radius: 12px;
    color: inherit;
    text-decoration: none;
}

.dash-goal:hover {
    background: color-mix(in srgb, rgb(var(--v-theme-primary)) 6%, transparent);
}

.dash-goal__name {
    display: block;
    font-weight: 650;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.dash-goal__sub {
    color: var(--ink-muted);
    font-size: 0.78rem;
}

.dash-goal__bar {
    display: block;
    height: 6px;
    border-radius: 999px;
    background: color-mix(in srgb, rgb(var(--v-theme-primary)) 12%, var(--hair));
    overflow: hidden;
}

.dash-goal__fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: rgb(var(--v-theme-primary));
}

.dash-goal__bar.is-warn .dash-goal__fill {
    background: rgb(var(--v-theme-warning));
}

.dash-goal__bar.is-done .dash-goal__fill {
    background: rgb(var(--v-theme-success));
}

.dash-goal__bar.is-idle .dash-goal__fill {
    background: var(--ink-muted);
}
</style>
