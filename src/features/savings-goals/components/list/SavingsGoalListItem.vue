<script setup lang="ts">
/**
 * Bloc objectif (maquette 06) : pourcentage gris, nom 700, jauge bleue 6 px (violette en retard),
 * lignes libellé / valeur et ligne d’état finale en toutes lettres.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { DotsIcon, PencilIcon, TrashIcon } from 'vue-tabler-icons';
import { formatCalendarDate, formatPercentReached, formatSavingsGoalAmount, savingsGoalBarWidth } from '@/features/savings-goals/format';
import type { SavingsGoal } from '@/features/savings-goals/types';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';

const props = defineProps<{
    savingsGoal: SavingsGoal;
    acting?: boolean;
}>();

const emit = defineEmits<{
    edit: [goal: SavingsGoal];
    delete: [goal: SavingsGoal];
}>();

const { t, locale } = useI18n();
const accountsStore = useAccountsStore();

const accountLabel = computed(() => {
    if (!props.savingsGoal.accountPublicId) return t('savingsGoalsPage.list.noAccount');
    return (
        accountsStore.accounts.find((item) => item.publicId === props.savingsGoal.accountPublicId)?.name ??
        t('savingsGoalsPage.list.unknownAccount')
    );
});

const money = (amount: number) => formatSavingsGoalAmount(amount, props.savingsGoal.currency, locale.value);

const percentText = computed(() => formatPercentReached(props.savingsGoal.percentReached, locale.value));
const barWidth = computed(() => savingsGoalBarWidth(props.savingsGoal));
const currentText = computed(() => money(props.savingsGoal.currentAmount));
const targetText = computed(() => money(props.savingsGoal.targetAmount));
const dueText = computed(() =>
    props.savingsGoal.targetDate ? formatCalendarDate(props.savingsGoal.targetDate, locale.value) : t('savingsGoalsPage.list.noDate')
);
const done = computed(() => props.savingsGoal.status === 'atteint' || props.savingsGoal.percentReached >= 100);
const abandoned = computed(() => props.savingsGoal.status === 'abandonne');
const late = computed(() => !done.value && !abandoned.value && props.savingsGoal.isOverdue);

/** Ligne d’état : états existants de l’objectif (atteint, abandonné, en retard, estimation). */
const status = computed(() => {
    if (abandoned.value) return { text: t('savingsGoalsPage.badges.abandonne'), tone: '' };
    if (done.value) return { text: t('savingsGoalsPage.badges.atteint'), tone: 'su-pos' };
    if (late.value) return { text: t('savingsGoalsPage.badges.overdue'), tone: 'su-over' };
    if (props.savingsGoal.projectedDate) {
        return {
            text: t('savingsGoalsPage.list.projectedOn', { date: formatCalendarDate(props.savingsGoal.projectedDate, locale.value) }),
            tone: ''
        };
    }
    return null;
});

const fillClass = computed(() => (late.value ? 'su-gauge__fill--over' : 'su-gauge__fill--blue'));

function onActivate(event: MouseEvent) {
    if (props.acting) return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    emit('edit', props.savingsGoal);
}
</script>

<template>
    <article
        class="goal-card"
        :class="{ 'goal-card--editable': !acting, 'is-abandonne': abandoned, 'is-overdue': late }"
        :data-savings-goal-id="savingsGoal.publicId"
        role="button"
        tabindex="0"
        @click="onActivate"
        @keydown.enter.prevent="emit('edit', savingsGoal)"
    >
        <div class="goal-card__head">
            <p class="goal-card__percent">{{ percentText }}</p>
            <div class="goal-card__actions" @click.stop>
                <v-menu location="bottom end" :offset="4">
                    <template #activator="{ props: menuProps }">
                        <button v-bind="menuProps" type="button" class="su-orb" :disabled="acting" :aria-label="t('common.more')">
                            <DotsIcon :size="18" stroke-width="1.75" />
                        </button>
                    </template>
                    <v-sheet class="su-menu goal-actions-menu">
                        <button type="button" class="su-menu-item" :disabled="acting" @click="emit('edit', savingsGoal)">
                            <span class="su-menu-item__icon"><PencilIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('savingsGoalsPage.actions.edit') }}</span>
                        </button>
                        <button
                            type="button"
                            class="su-menu-item goal-actions-menu__delete"
                            :disabled="acting"
                            @click="emit('delete', savingsGoal)"
                        >
                            <span class="su-menu-item__icon su-menu-item__icon--danger"><TrashIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('savingsGoalsPage.actions.delete') }}</span>
                        </button>
                    </v-sheet>
                </v-menu>
            </div>
        </div>
        <h3 class="goal-card__name">{{ savingsGoal.name }}</h3>
        <p class="goal-card__account">{{ accountLabel }}</p>
        <div class="su-gauge goal-card__gauge" role="img" :aria-label="percentText">
            <span class="su-gauge__fill" :class="fillClass" :style="{ width: `${barWidth}%` }" />
        </div>
        <div class="su-kv">
            <span>{{ t('savingsGoalsPage.card.saved') }}</span
            ><span>{{ currentText }}</span>
        </div>
        <div class="su-kv">
            <span>{{ t('savingsGoalsPage.card.target') }}</span
            ><span>{{ targetText }}</span>
        </div>
        <div class="su-kv">
            <span>{{ t('savingsGoalsPage.card.dueDate') }}</span
            ><span>{{ dueText }}</span>
        </div>
        <p v-if="status" class="goal-card__status" :class="status.tone">{{ status.text }}</p>
    </article>
</template>

<style scoped>
/* carte légère : bordure fine, pas d'ombre ; noircit au survol */
.goal-card {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 18px 20px 16px;
    border: 1px solid var(--line);
    background: var(--bg);
    transition: border-color 0.15s var(--ease);
    color: var(--ink);
    font-size: 14px;
    font-variant-numeric: tabular-nums;
}

.goal-card--editable {
    cursor: pointer;
}

.goal-card--editable:hover,
.goal-card:focus-within {
    border-color: var(--ink);
}

.goal-card:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 4px;
}

.goal-card.is-abandonne > :not(.goal-card__head):not(.goal-card__status) {
    opacity: 0.55;
}

.goal-card__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 32px;
}

.goal-card__percent {
    margin: 0;
    color: var(--gray);
    font-size: 16px;
}

.goal-card__actions {
    display: flex;
    margin: -4px -8px -4px 0;
}

@media (hover: hover) and (pointer: fine) {
    .goal-card__actions {
        opacity: 0;
        transition: opacity 0.15s var(--ease);
    }

    .goal-card:hover .goal-card__actions,
    .goal-card:focus-within .goal-card__actions {
        opacity: 1;
    }
}

.goal-card__name {
    margin: 6px 0 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.025em;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.goal-card__account {
    margin: 2px 0 14px;
    color: var(--gray);
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.goal-card__gauge {
    margin-bottom: 8px;
}

.goal-card > .su-kv:last-of-type {
    border-bottom: 1px solid var(--line);
}

.goal-card__status {
    margin: 14px 0 0;
    color: var(--gray);
    font-size: 14px;
}

.goal-card__status.su-pos {
    color: var(--blue-ink);
}

.goal-card__status.su-over {
    color: var(--violet-ink);
}

.goal-actions-menu {
    width: min(240px, calc(100vw - 32px));
}

.goal-actions-menu .su-menu-item:disabled {
    opacity: 0.45;
    cursor: default;
}

.goal-actions-menu .su-menu-item__icon--danger {
    background: var(--danger-soft);
    color: var(--danger);
}

.goal-actions-menu__delete .su-menu-item__title {
    color: var(--danger);
}
</style>
