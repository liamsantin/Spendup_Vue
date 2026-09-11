<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { PencilIcon, PlayerPauseIcon, RepeatIcon, TrashIcon } from 'vue-tabler-icons';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { formatCalendarDate, formatPlannedAmount, isExpenseTemplate } from '@/features/recurring-payments/format';
import type { RecurringExpense, RecurringIncome, RecurringKind } from '@/features/recurring-payments/types';

const props = defineProps<{
    template: RecurringExpense | RecurringIncome;
    kind: RecurringKind;
    canWrite: boolean;
    acting?: boolean;
}>();

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
</script>

<template>
    <div
        class="su-person recurring-list-item"
        :class="{ 'opacity-60': !template.isActive, 'recurring-list-item--clickable': true }"
        :data-recurring-id="template.publicId"
        @click="emit('open', template)"
    >
        <span class="su-person__avatar su-person__avatar--tile">
            <RepeatIcon size="22" />
        </span>
        <div class="su-person__meta">
            <p class="su-person__name">{{ template.name }}</p>
            <p class="su-person__sub">{{ typeLabel }} · {{ frequencyLabel }} · {{ accountName }}</p>
            <p class="su-person__sub">{{ amountLabel }} · {{ nextDueLabel }}</p>
        </div>
        <div class="su-person__actions" @click.stop>
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
.recurring-list-item--clickable {
    cursor: pointer;
}
</style>
