<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { PencilIcon, PlayerPauseIcon, Receipt2Icon, TrashIcon, TrendingUpIcon } from 'vue-tabler-icons';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { formatCalendarDate, formatPlannedAmount, isExpenseTemplate } from '@/features/recurring-payments/format';
import type { RecurringExpense, RecurringIncome, RecurringKind } from '@/features/recurring-payments/types';

const props = withDefaults(
    defineProps<{
        template: RecurringExpense | RecurringIncome;
        kind: RecurringKind;
        canWrite: boolean;
        acting?: boolean;
        showKind?: boolean;
    }>(),
    { acting: false, showKind: false }
);

const emit = defineEmits<{
    open: [template: RecurringExpense | RecurringIncome];
    edit: [template: RecurringExpense | RecurringIncome];
    delete: [template: RecurringExpense | RecurringIncome];
}>();

const { t, locale } = useI18n();
const accountsStore = useAccountsStore();

const accountName = computed(
    () =>
        accountsStore.accounts.find((item) => item.publicId === props.template.accountPublicId)?.name ?? t('recurrencesPage.unknownAccount')
);

const typeLabel = computed(() => {
    if (isExpenseTemplate(props.template)) return t(`recurrencesPage.expenseTypes.${props.template.expenseType}`);
    return t(`recurrencesPage.incomeTypes.${props.template.incomeType}`);
});

const frequencyLabel = computed(() =>
    props.kind === 'expense'
        ? t(`recurrencesPage.expenseFrequencies.${props.template.frequency}`)
        : t(`recurrencesPage.incomeFrequencies.${props.template.frequency}`)
);

const amountLabel = computed(() => formatPlannedAmount(props.template.plannedAmount, props.template.currency, locale.value));

const nextDueLabel = computed(() =>
    props.template.nextDueDate
        ? t('recurrencesPage.list.nextDue', { date: formatCalendarDate(props.template.nextDueDate, locale.value) })
        : t('recurrencesPage.list.noNextDue')
);

function onActivate(event: MouseEvent) {
    if (event.target instanceof Element && event.target.closest('button')) return;
    emit('open', props.template);
}
</script>

<template>
    <div
        class="recurring-row"
        :class="{ 'is-paused': !template.isActive }"
        :data-recurring-id="template.publicId"
        @click="onActivate"
    >
        <span class="recurring-row__icon" :class="`recurring-row__icon--${kind}`">
            <component :is="kind === 'expense' ? Receipt2Icon : TrendingUpIcon" size="18" stroke-width="1.8" />
        </span>
        <div class="recurring-row__meta">
            <div class="recurring-row__title">
                <p class="recurring-row__name">{{ template.name }}</p>
                <span v-if="showKind" class="recurring-row__badge" :class="`is-${kind}`">{{ t(`recurrencesPage.kinds.${kind}`) }}</span>
            </div>
            <p class="recurring-row__sub">{{ typeLabel }} · {{ frequencyLabel }} · {{ accountName }}</p>
            <p class="recurring-row__sub">{{ nextDueLabel }}</p>
        </div>
        <div class="recurring-row__actions" @click.stop>
            <span class="recurring-row__amount" :class="kind === 'expense' ? 'is-debit' : 'is-credit'">{{ amountLabel }}</span>
            <span v-if="!template.isActive" class="su-chip su-btn--warn">
                <PlayerPauseIcon :size="14" stroke-width="1.6" />
                {{ t('recurrencesPage.badges.paused') }}
            </span>
            <template v-if="canWrite">
                <button
                    type="button"
                    class="su-orb"
                    :disabled="acting"
                    :aria-label="t('recurrencesPage.actions.edit')"
                    @click="emit('edit', template)"
                >
                    <PencilIcon :size="16" stroke-width="1.6" />
                </button>
                <button
                    type="button"
                    class="su-orb su-orb--danger"
                    :disabled="acting"
                    :aria-label="t('recurrencesPage.actions.delete')"
                    @click="emit('delete', template)"
                >
                    <TrashIcon :size="16" stroke-width="1.6" />
                </button>
            </template>
        </div>
    </div>
</template>

<style scoped>
.recurring-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    min-width: 0;
    padding: 10px;
    box-sizing: border-box;
    border-radius: 12px;
    color: inherit;
    position: relative;
    z-index: 0;
    cursor: pointer;
    transition:
        transform 0.5s var(--spring),
        box-shadow 0.45s var(--ease),
        background 0.3s var(--ease);
}

.recurring-row.is-paused {
    opacity: 0.64;
}

.recurring-row:hover {
    background: var(--surface-hover-soft);
}

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
    .recurring-row:hover {
        z-index: 1;
        transform: scale(1.012);
        box-shadow:
            0 1px 2px rgba(16, 16, 20, 0.04),
            0 12px 28px -16px rgba(16, 16, 20, 0.18);
    }
}

@media (prefers-reduced-motion: reduce) {
    .recurring-row {
        transition: none;
    }
}

.recurring-row__icon {
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

.recurring-row__icon--expense {
    background: rgba(var(--v-theme-error), 0.1);
    color: rgb(var(--v-theme-error));
}

.recurring-row__icon--income {
    background: rgba(var(--v-theme-success), 0.12);
    color: rgb(var(--v-theme-success));
}

.recurring-row__meta {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.recurring-row__title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.recurring-row__name {
    margin: 0;
    min-width: 0;
    font-size: 14.5px;
    font-weight: 620;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.recurring-row__badge {
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

.recurring-row__badge.is-expense {
    background: rgba(var(--v-theme-error), 0.1);
    color: rgb(var(--v-theme-error));
}

.recurring-row__badge.is-income {
    background: rgba(var(--v-theme-success), 0.12);
    color: rgb(var(--v-theme-success));
}

.recurring-row__sub {
    margin: 0;
    font-size: 0.8rem;
    color: var(--ink-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.recurring-row__actions {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    padding: 2px;
    margin: -2px;
}

.recurring-row__amount {
    margin-right: 6px;
    font-size: 0.92rem;
    font-weight: 680;
    letter-spacing: -0.02em;
    white-space: nowrap;
}

.recurring-row__amount.is-debit {
    color: rgb(var(--v-theme-error));
}

.recurring-row__amount.is-credit {
    color: rgb(var(--v-theme-success));
}

@media (max-width: 600px) {
    .recurring-row {
        flex-wrap: wrap;
        gap: 8px;
    }

    .recurring-row__actions {
        width: 100%;
        justify-content: flex-start;
        padding-left: 50px;
    }
}
</style>
