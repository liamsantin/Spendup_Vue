<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { DotsVerticalIcon, WalletIcon } from 'vue-tabler-icons';
import {
    budgetBarWidth,
    budgetProgressTone,
    budgetScheduleStatus,
    formatBudgetAmount,
    formatCalendarDate,
    formatPercentUsed,
    isBudgetOverspent
} from '@/features/budgets/format';
import type { Budget } from '@/features/budgets/types';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';

const props = defineProps<{
    budget: Budget;
    acting?: boolean;
}>();

const emit = defineEmits<{
    edit: [budget: Budget];
    delete: [budget: Budget];
    toggleActive: [budget: Budget];
}>();

const { t, locale } = useI18n();
const categoriesStore = useCategoriesStore();

const categoryLabel = computed(() => {
    if (!props.budget.categoryPublicId) return t('budgetsPage.scope.global');
    return categoriesStore.findByPublicId(props.budget.categoryPublicId)?.name ?? t('budgetsPage.scope.unknownCategory');
});

const periodeLabel = computed(() => t(`budgetsPage.periodes.${props.budget.periode}`));

const tone = computed(() => budgetProgressTone(props.budget));
const schedule = computed(() => budgetScheduleStatus(props.budget));
const overspent = computed(() => isBudgetOverspent(props.budget));
const remainingText = computed(() => formatBudgetAmount(props.budget.remainingAmount, props.budget.currency, locale.value));
const spentText = computed(() =>
    t('budgetsPage.list.spentOf', {
        spent: formatBudgetAmount(props.budget.spentAmount, props.budget.currency, locale.value),
        limit: formatBudgetAmount(props.budget.limitAmount, props.budget.currency, locale.value)
    })
);
const windowText = computed(() =>
    t('budgetsPage.list.window', {
        start: formatCalendarDate(props.budget.periodStart, locale.value),
        end: formatCalendarDate(props.budget.periodEnd, locale.value)
    })
);
const percentText = computed(() => formatPercentUsed(props.budget.isCurrent ? props.budget.percentUsed : 0, locale.value));
const barWidth = computed(() => budgetBarWidth(props.budget));

function onActivate(event: MouseEvent) {
    if (props.acting) return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    emit('edit', props.budget);
}
</script>

<template>
    <div
        class="budget-row"
        :class="{ 'budget-row--editable': !acting, 'is-paused': !budget.isActive, 'is-over': overspent }"
        :data-budget-id="budget.publicId"
        @click="onActivate"
    >
        <span class="budget-row__icon" :class="`is-${tone}`">
            <WalletIcon size="18" stroke-width="1.8" />
        </span>
        <div class="budget-row__meta">
            <div class="budget-row__title">
                <p class="budget-row__name">{{ budget.name }}</p>
                <span v-if="!budget.isActive" class="budget-row__badge is-paused">{{ t('budgetsPage.badges.paused') }}</span>
                <span v-else-if="schedule === 'upcoming'" class="budget-row__badge is-idle">{{ t('budgetsPage.badges.upcoming') }}</span>
                <span v-else-if="schedule === 'ended'" class="budget-row__badge is-idle">{{ t('budgetsPage.badges.ended') }}</span>
                <span v-else-if="overspent" class="budget-row__badge is-over">{{ t('budgetsPage.badges.overspent') }}</span>
            </div>
            <p class="budget-row__sub">{{ categoryLabel }} · {{ periodeLabel }}</p>
            <p class="budget-row__sub">{{ windowText }}</p>
            <div class="budget-row__progress">
                <div class="budget-bar" :class="`is-${tone}`">
                    <span class="budget-bar__fill" :style="{ width: `${barWidth}%` }" />
                </div>
                <span class="budget-row__percent">{{ percentText }}</span>
            </div>
            <p class="budget-row__amounts">
                <span>{{ spentText }}</span>
                <span :class="{ 'is-over': overspent }">
                    {{
                        overspent
                            ? t('budgetsPage.list.overBy', { amount: remainingText })
                            : t('budgetsPage.list.remaining', { amount: remainingText })
                    }}
                </span>
            </p>
        </div>
        <div class="budget-row__actions" @click.stop>
            <v-menu location="bottom end" :offset="8">
                <template #activator="{ props: menuProps }">
                    <button
                        v-bind="menuProps"
                        type="button"
                        class="su-orb"
                        :disabled="acting"
                        :aria-label="t('common.more')"
                    >
                        <DotsVerticalIcon size="18" stroke-width="1.75" />
                    </button>
                </template>
                <v-sheet class="su-menu budget-actions-menu">
                    <button type="button" class="su-btn su-btn--ink" :disabled="acting" @click="emit('toggleActive', budget)">
                        {{ budget.isActive ? t('budgetsPage.actions.pause') : t('budgetsPage.actions.resume') }}
                    </button>
                    <button type="button" class="su-btn su-btn--ink" :disabled="acting" @click="emit('edit', budget)">
                        {{ t('budgetsPage.actions.edit') }}
                    </button>
                    <button type="button" class="su-btn su-btn--danger" :disabled="acting" @click="emit('delete', budget)">
                        {{ t('budgetsPage.actions.delete') }}
                    </button>
                </v-sheet>
            </v-menu>
        </div>
    </div>
</template>

<style scoped>
.budget-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    min-width: 0;
    padding: 12px 12px;
    box-sizing: border-box;
    border-radius: var(--radius-surface);
    color: inherit;
    position: relative;
    z-index: 0;
    background: var(--surface);
    border: 1px solid var(--stroke);
    backdrop-filter: var(--blur);
    box-shadow: var(--shadow-rest);
    transition:
        transform 0.5s var(--spring),
        box-shadow 0.45s var(--ease),
        background 0.3s var(--ease),
        border-color 0.3s var(--ease);
}

.budget-row--editable {
    cursor: pointer;
}

.budget-row:hover {
    background: var(--surface-hover-soft);
}

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
    .budget-row:hover {
        z-index: 1;
        transform: scale(1.008);
        box-shadow: var(--shadow-hover, var(--shadow-rest));
    }
}

@media (max-width: 767px) {
    .budget-row {
        gap: 10px;
        padding: 12px 10px;
        border-radius: 16px;
    }
}

.budget-row__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 38px;
    height: 38px;
    margin-top: 1px;
    border-radius: 12px;
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
}

.budget-row__icon.is-warn {
    background: rgba(var(--v-theme-warning), 0.14);
    color: rgb(var(--v-theme-warning));
}

.budget-row__icon.is-over {
    background: rgba(var(--v-theme-error), 0.12);
    color: rgb(var(--v-theme-error));
}

.budget-row__icon.is-idle {
    background: var(--hair);
    color: var(--ink-muted);
}

.budget-row__meta {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.budget-row__title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.budget-row__name {
    margin: 0;
    min-width: 0;
    font-size: 14.5px;
    font-weight: 620;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.budget-row__badge {
    flex: none;
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    line-height: 1.2;
    background: var(--hair);
    color: var(--ink-muted);
}

.budget-row__badge.is-over {
    background: rgba(var(--v-theme-error), 0.12);
    color: rgb(var(--v-theme-error));
}

.budget-row__badge.is-paused {
    background: rgba(var(--v-theme-warning), 0.14);
    color: rgb(var(--v-theme-warning));
}

.budget-row__sub {
    margin: 0;
    font-size: 0.8rem;
    color: var(--ink-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.budget-row__progress {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 4px;
}

.budget-bar {
    flex: 1 1 auto;
    min-width: 0;
    height: 7px;
    border-radius: 999px;
    background: color-mix(in srgb, rgb(var(--v-theme-primary)) 12%, var(--hair));
    overflow: hidden;
}

.budget-bar__fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: rgb(var(--v-theme-primary));
}

.budget-bar.is-warn .budget-bar__fill {
    background: rgb(var(--v-theme-warning));
}

.budget-bar.is-over .budget-bar__fill {
    background: rgb(var(--v-theme-error));
}

.budget-bar.is-idle .budget-bar__fill {
    background: var(--ink-muted);
}

.budget-row__percent {
    flex: none;
    font-size: 0.75rem;
    font-weight: 650;
    letter-spacing: -0.01em;
    color: var(--ink-muted);
}

.budget-row__amounts {
    margin: 2px 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 0.76rem;
    color: var(--ink-muted);
}

.budget-row__amounts .is-over {
    color: rgb(var(--v-theme-error));
    font-weight: 650;
}

.budget-row__actions {
    display: flex;
    flex: none;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 2px;
    margin: -2px;
}

.budget-actions-menu {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: min(180px, calc(100vw - 24px));
    padding: 12px;
}

.budget-actions-menu .su-btn {
    width: 100%;
}
</style>
