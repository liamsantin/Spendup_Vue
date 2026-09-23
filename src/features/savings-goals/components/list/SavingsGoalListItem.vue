<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { DotsVerticalIcon, PencilIcon, TargetIcon, WalletIcon } from 'vue-tabler-icons';
import {
    formatCalendarDate,
    formatPercentReached,
    formatSavingsGoalAmount,
    savingsGoalBarWidth,
    savingsGoalProgressTone
} from '@/features/savings-goals/format';
import type { SavingsGoal } from '@/features/savings-goals/types';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';

const props = defineProps<{
    savingsGoal: SavingsGoal;
    acting?: boolean;
}>();

const emit = defineEmits<{
    edit: [goal: SavingsGoal];
    delete: [goal: SavingsGoal];
    deposit: [goal: SavingsGoal];
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

const tone = computed(() => savingsGoalProgressTone(props.savingsGoal));
const remainingText = computed(() => formatSavingsGoalAmount(props.savingsGoal.remainingAmount, props.savingsGoal.currency, locale.value));
const currentText = computed(() =>
    t('savingsGoalsPage.list.savedOf', {
        current: formatSavingsGoalAmount(props.savingsGoal.currentAmount, props.savingsGoal.currency, locale.value),
        target: formatSavingsGoalAmount(props.savingsGoal.targetAmount, props.savingsGoal.currency, locale.value)
    })
);
const dateText = computed(() => {
    if (!props.savingsGoal.targetDate) return t('savingsGoalsPage.list.noDate');
    return t('savingsGoalsPage.list.dueOn', { date: formatCalendarDate(props.savingsGoal.targetDate, locale.value) });
});
const percentText = computed(() => formatPercentReached(props.savingsGoal.percentReached, locale.value));
const barWidth = computed(() => savingsGoalBarWidth(props.savingsGoal));
const exceeded = computed(() => props.savingsGoal.remainingAmount < 0);

function onActivate(event: MouseEvent) {
    if (props.acting) return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    emit('edit', props.savingsGoal);
}
</script>

<template>
    <div
        class="goal-row"
        :class="{
            'goal-row--editable': !acting,
            'is-abandonne': savingsGoal.status === 'abandonne',
            'is-overdue': savingsGoal.isOverdue
        }"
        :data-savings-goal-id="savingsGoal.publicId"
        @click="onActivate"
    >
        <span class="goal-row__icon" :class="`is-${tone}`">
            <TargetIcon size="18" stroke-width="1.8" />
        </span>
        <div class="goal-row__meta">
            <div class="goal-row__title">
                <p class="goal-row__name">{{ savingsGoal.name }}</p>
                <span v-if="savingsGoal.status === 'abandonne'" class="goal-row__badge is-abandonne">
                    {{ t('savingsGoalsPage.badges.abandonne') }}
                </span>
                <span v-else-if="savingsGoal.status === 'atteint'" class="goal-row__badge is-done">
                    {{ t('savingsGoalsPage.badges.atteint') }}
                </span>
                <span v-else-if="savingsGoal.isOverdue" class="goal-row__badge is-overdue">
                    {{ t('savingsGoalsPage.badges.overdue') }}
                </span>
            </div>
            <p class="goal-row__sub">{{ accountLabel }} · {{ dateText }}</p>
            <div class="goal-row__progress">
                <div class="goal-bar" :class="`is-${tone}`">
                    <span class="goal-bar__fill" :style="{ width: `${barWidth}%` }" />
                </div>
                <span class="goal-row__percent">{{ percentText }}</span>
            </div>
            <p class="goal-row__amounts">
                <span>{{ currentText }}</span>
                <span :class="{ 'is-exceeded': exceeded }">
                    {{
                        exceeded
                            ? t('savingsGoalsPage.list.exceededBy', { amount: remainingText })
                            : t('savingsGoalsPage.list.remaining', { amount: remainingText })
                    }}
                </span>
            </p>
        </div>
        <div class="goal-row__actions" @click.stop>
            <v-menu location="bottom end" :offset="8">
                <template #activator="{ props: menuProps }">
                    <button v-bind="menuProps" type="button" class="su-orb" :disabled="acting" :aria-label="t('common.more')">
                        <DotsVerticalIcon size="18" stroke-width="1.75" />
                    </button>
                </template>
                <v-sheet class="su-menu goal-actions-menu">
                    <button
                        v-if="savingsGoal.status !== 'abandonne'"
                        type="button"
                        class="su-btn su-btn--tonal"
                        :disabled="acting"
                        @click="emit('deposit', savingsGoal)"
                    >
                        <WalletIcon :size="16" stroke-width="1.6" />
                        {{ t('savingsGoalsPage.actions.deposit') }}
                    </button>
                    <button type="button" class="su-btn su-btn--ink" :disabled="acting" @click="emit('edit', savingsGoal)">
                        <PencilIcon :size="16" stroke-width="1.6" />
                        {{ t('savingsGoalsPage.actions.edit') }}
                    </button>
                    <button type="button" class="goal-actions-menu__delete" :disabled="acting" @click="emit('delete', savingsGoal)">
                        {{ t('savingsGoalsPage.actions.delete') }}
                    </button>
                </v-sheet>
            </v-menu>
        </div>
    </div>
</template>

<style scoped>
.goal-row {
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

.goal-row--editable {
    cursor: pointer;
}

.goal-row:hover {
    background: var(--surface-hover-soft);
}

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
    .goal-row:hover {
        z-index: 1;
        transform: scale(1.008);
        box-shadow: var(--shadow-hover, var(--shadow-rest));
    }
}

@media (max-width: 767px) {
    .goal-row {
        gap: 10px;
        padding: 12px 10px;
        border-radius: 16px;
    }
}

.goal-row__icon {
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

.goal-row__icon.is-warn {
    background: rgba(var(--v-theme-warning), 0.14);
    color: rgb(var(--v-theme-warning));
}

.goal-row__icon.is-done {
    background: rgba(var(--v-theme-success), 0.14);
    color: rgb(var(--v-theme-success));
}

.goal-row__icon.is-idle {
    background: var(--hair);
    color: var(--ink-muted);
}

.goal-row__meta {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.goal-row__title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.goal-row__name {
    margin: 0;
    min-width: 0;
    font-size: 14.5px;
    font-weight: 620;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.goal-row__badge {
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

.goal-row__badge.is-overdue {
    background: rgba(var(--v-theme-warning), 0.14);
    color: rgb(var(--v-theme-warning));
}

.goal-row__badge.is-done {
    background: rgba(var(--v-theme-success), 0.14);
    color: rgb(var(--v-theme-success));
}

.goal-row__badge.is-abandonne {
    background: rgba(var(--v-theme-warning), 0.14);
    color: rgb(var(--v-theme-warning));
}

.goal-row__sub {
    margin: 0;
    font-size: 0.8rem;
    color: var(--ink-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.goal-row__progress {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 4px;
}

.goal-bar {
    flex: 1 1 auto;
    min-width: 0;
    height: 7px;
    border-radius: 999px;
    background: color-mix(in srgb, rgb(var(--v-theme-primary)) 12%, var(--hair));
    overflow: hidden;
}

.goal-bar__fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: rgb(var(--v-theme-primary));
}

.goal-bar.is-warn .goal-bar__fill {
    background: rgb(var(--v-theme-warning));
}

.goal-bar.is-done .goal-bar__fill {
    background: rgb(var(--v-theme-success));
}

.goal-bar.is-idle .goal-bar__fill {
    background: var(--ink-muted);
}

.goal-row__percent {
    flex: none;
    font-size: 0.75rem;
    font-weight: 650;
    letter-spacing: -0.01em;
    color: var(--ink-muted);
}

.goal-row__amounts {
    margin: 2px 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 0.76rem;
    color: var(--ink-muted);
}

.goal-row__amounts .is-exceeded {
    color: rgb(var(--v-theme-success));
    font-weight: 650;
}

.goal-row__actions {
    display: flex;
    flex: none;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 2px;
    margin: -2px;
}

.goal-actions-menu {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: min(176px, calc(100vw - 32px));
    padding: 12px !important;
}

.goal-actions-menu .su-btn {
    width: 100%;
}

.goal-actions-menu__delete {
    appearance: none;
    display: block;
    width: 100%;
    margin: 2px 0 0;
    padding: 6px 4px;
    border: 0;
    background: transparent;
    color: #e11d48;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.3;
    text-align: center;
    cursor: pointer;
    transition: transform 0.18s var(--ease, ease);
}

.goal-actions-menu__delete:disabled {
    opacity: 0.45;
    cursor: default;
}

.goal-actions-menu__delete:hover:not(:disabled) {
    color: #be123c;
    transform: scale(1.06);
}
</style>
