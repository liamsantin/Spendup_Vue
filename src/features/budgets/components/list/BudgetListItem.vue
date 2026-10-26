<script setup lang="ts">
/**
 * Ligne « Par catégorie » (maquette 06) : nom 700 | dépensé / plafond (plafond gris),
 * jauge carrée 4 px (noire, bleue pour le budget global, violette si dépassé),
 * note grise « Reste 188 » ou violette « Dépassé de 68 », filet fin entre les lignes.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { DotsIcon, PencilIcon, PlayerPauseIcon, PlayerPlayIcon, TrashIcon } from 'vue-tabler-icons';
import {
    budgetBarWidth,
    budgetScheduleStatus,
    formatBudgetAmount,
    formatCalendarDate,
    formatPercentUsed,
    isBudgetOverspent
} from '@/features/budgets/format';
import { BUDGET_ALERT_OVER_PERCENT, type Budget } from '@/features/budgets/types';
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

const isGlobal = computed(() => !props.budget.categoryPublicId);
const categoryLabel = computed(() => {
    if (isGlobal.value) return t('budgetsPage.scope.global');
    return categoriesStore.findByPublicId(props.budget.categoryPublicId!)?.name ?? t('budgetsPage.scope.unknownCategory');
});

const periodeLabel = computed(() => t(`budgetsPage.periodes.${props.budget.periode}`));
const schedule = computed(() => budgetScheduleStatus(props.budget));
const overspent = computed(() => isBudgetOverspent(props.budget));
const reached = computed(() => props.budget.isCurrent && !overspent.value && props.budget.percentUsed >= BUDGET_ALERT_OVER_PERCENT);
const spentText = computed(() => formatBudgetAmount(props.budget.spentAmount, props.budget.currency, locale.value));
const limitText = computed(() => formatBudgetAmount(props.budget.limitAmount, props.budget.currency, locale.value));
const remainingText = computed(() => formatBudgetAmount(Math.abs(props.budget.remainingAmount), props.budget.currency, locale.value));
const windowText = computed(() =>
    t('budgetsPage.list.window', {
        start: formatCalendarDate(props.budget.periodStart, locale.value),
        end: formatCalendarDate(props.budget.periodEnd, locale.value)
    })
);
const percentText = computed(() => formatPercentUsed(props.budget.isCurrent ? props.budget.percentUsed : 0, locale.value));
const barWidth = computed(() => budgetBarWidth(props.budget));

/** Note sous la jauge : état du budget en toutes lettres (jamais la couleur seule). */
const note = computed(() => {
    if (!props.budget.isActive) return { text: t('budgetsPage.badges.paused'), tone: '' };
    if (schedule.value === 'upcoming') return { text: t('budgetsPage.badges.upcoming'), tone: '' };
    if (schedule.value === 'ended') return { text: t('budgetsPage.badges.ended'), tone: '' };
    if (overspent.value) return { text: t('budgetsPage.list.overBy', { amount: remainingText.value }), tone: 'su-over' };
    if (reached.value) return { text: t('budgetsPage.overview.reached'), tone: '' };
    return { text: t('budgetsPage.list.remaining', { amount: remainingText.value }), tone: '' };
});

const fillClass = computed(() => {
    if (overspent.value || reached.value) return 'su-gauge__fill--over';
    return isGlobal.value ? 'su-gauge__fill--blue' : '';
});

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
        role="button"
        tabindex="0"
        @click="onActivate"
        @keydown.enter.prevent="emit('edit', budget)"
    >
        <div class="budget-row__head">
            <p class="budget-row__name">{{ budget.name }}</p>
            <p class="budget-row__amounts" :aria-label="percentText">
                <span class="budget-row__spent">{{ spentText }}</span>
                <span class="budget-row__limit"> / {{ limitText }}</span>
            </p>
            <div class="budget-row__actions" @click.stop>
                <v-menu location="bottom end" :offset="4">
                    <template #activator="{ props: menuProps }">
                        <button v-bind="menuProps" type="button" class="su-orb" :disabled="acting" :aria-label="t('common.more')">
                            <DotsIcon :size="18" stroke-width="1.75" />
                        </button>
                    </template>
                    <v-sheet class="su-menu budget-actions-menu">
                        <button type="button" class="su-menu-item" :disabled="acting" @click="emit('toggleActive', budget)">
                            <span class="su-menu-item__icon su-menu-item__icon--gray">
                                <PlayerPauseIcon v-if="budget.isActive" :size="18" stroke-width="1.6" />
                                <PlayerPlayIcon v-else :size="18" stroke-width="1.6" />
                            </span>
                            <span class="su-menu-item__title">
                                {{ budget.isActive ? t('budgetsPage.actions.pause') : t('budgetsPage.actions.resume') }}
                            </span>
                        </button>
                        <button type="button" class="su-menu-item" :disabled="acting" @click="emit('edit', budget)">
                            <span class="su-menu-item__icon"><PencilIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('budgetsPage.actions.edit') }}</span>
                        </button>
                        <button
                            type="button"
                            class="su-menu-item budget-actions-menu__delete"
                            :disabled="acting"
                            @click="emit('delete', budget)"
                        >
                            <span class="su-menu-item__icon su-menu-item__icon--danger"><TrashIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('budgetsPage.actions.delete') }}</span>
                        </button>
                    </v-sheet>
                </v-menu>
            </div>
        </div>
        <div class="su-gauge budget-row__gauge" role="img" :aria-label="percentText">
            <span class="su-gauge__fill" :class="fillClass" :style="{ width: `${barWidth}%` }" />
        </div>
        <div class="budget-row__foot">
            <span class="budget-row__note" :class="note.tone">{{ note.text }}</span>
            <span class="budget-row__sub">{{ categoryLabel }} · {{ periodeLabel }} · {{ windowText }}</span>
        </div>
    </div>
</template>

<style scoped>
.budget-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    min-width: 0;
    padding: 16px 0 14px;
    border-top: 1px solid var(--line);
    color: var(--ink);
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    transition: background 0.15s var(--ease);
}

.budget-row--editable {
    cursor: pointer;
}

.budget-row:hover {
    background: var(--soft);
}

.budget-row:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: -2px;
}

.budget-row.is-paused > :not(.budget-row__head),
.budget-row.is-paused .budget-row__name,
.budget-row.is-paused .budget-row__amounts {
    opacity: 0.55;
}

.budget-row__head {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}

.budget-row__name {
    flex: 1 1 auto;
    min-width: 0;
    margin: 0;
    font-weight: 700;
    letter-spacing: -0.006em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.budget-row__amounts {
    flex: none;
    margin: 0;
    white-space: nowrap;
}

.budget-row__spent {
    font-weight: 700;
}

.budget-row__limit {
    color: var(--gray);
}

.budget-row__actions {
    flex: none;
    display: flex;
    margin: -8px -8px -8px 0;
}

@media (hover: hover) and (pointer: fine) {
    .budget-row__actions {
        opacity: 0;
        transition: opacity 0.15s var(--ease);
    }

    .budget-row:hover .budget-row__actions,
    .budget-row:focus-within .budget-row__actions {
        opacity: 1;
    }
}

.budget-row__gauge {
    height: 4px;
}

.budget-row__foot {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
    font-size: 13px;
    color: var(--gray);
}

.budget-row__note {
    flex: none;
}

.budget-row__note.su-over {
    font-weight: 700;
}

.budget-row__sub {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: right;
}

.budget-actions-menu {
    width: min(240px, calc(100vw - 32px));
}

.budget-actions-menu .su-menu-item:disabled {
    opacity: 0.45;
    cursor: default;
}

.budget-actions-menu .su-menu-item__icon--gray {
    background: var(--t-gray-bg);
    color: var(--t-gray-ink);
}

.budget-actions-menu .su-menu-item__icon--danger {
    background: var(--danger-soft);
    color: var(--danger);
}

.budget-actions-menu__delete .su-menu-item__title {
    color: var(--danger);
}

@media (max-width: 599.98px) {
    .budget-row__foot {
        flex-direction: column;
        gap: 2px;
    }

    .budget-row__sub {
        text-align: left;
    }
}
</style>
