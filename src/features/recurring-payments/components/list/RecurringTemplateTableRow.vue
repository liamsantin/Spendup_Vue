<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { PencilIcon, Receipt2Icon, TrashIcon, TrendingUpIcon } from 'vue-tabler-icons';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { formatCalendarDate, formatPlannedAmount, isExpenseTemplate } from '@/features/recurring-payments/format';
import type { RecurringExpense, RecurringIncome, RecurringKind } from '@/features/recurring-payments/types';
import TagChips from '@/features/tags/components/list/TagChips.vue';

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

const statusLabel = computed(() => (props.template.isActive ? t('recurrencesPage.badges.active') : t('recurrencesPage.badges.paused')));

function onActivate(event: MouseEvent) {
    if (event.target instanceof Element && event.target.closest('button, a')) return;
    emit('open', props.template);
}
</script>

<template>
    <tr
        class="app-data-table__row recurring-table__row"
        :class="[`is-${kind}`, { 'is-muted': !template.isActive }]"
        :data-recurring-id="template.publicId"
        @click="onActivate"
    >
        <td>
            <div class="app-data-table__name">
                <span class="app-data-table__avatar">
                    <component :is="kind === 'expense' ? Receipt2Icon : TrendingUpIcon" size="16" stroke-width="1.8" />
                </span>
                <span class="app-data-table__identity">
                    <span class="app-data-table__title">{{ template.name }}</span>
                    <TagChips v-if="isExpenseTemplate(template)" :tag-public-ids="template.tagPublicIds" compact />
                    <span class="app-data-table__muted">{{ typeLabel }}</span>
                </span>
            </div>
        </td>
        <td v-if="showKind">
            <span class="app-data-table__pill" :title="t(`recurrencesPage.kinds.${kind}`)">
                <span class="app-data-table__pill-label">{{ t(`recurrencesPage.kinds.${kind}`) }}</span>
            </span>
        </td>
        <td>{{ frequencyLabel }}</td>
        <td>{{ accountName }}</td>
        <td>
            <span v-if="template.nextDueDate">{{ formatCalendarDate(template.nextDueDate, locale) }}</span>
            <span v-else class="app-data-table__muted">—</span>
        </td>
        <td>
            <span class="app-data-table__strong recurring-table__amount">
                {{ formatPlannedAmount(template.plannedAmount, template.currency, locale) }}
            </span>
        </td>
        <td>
            <span class="app-data-table__pill recurring-table__status" :class="{ 'is-paused': !template.isActive }" :title="statusLabel">
                <span class="app-data-table__pill-label">{{ statusLabel }}</span>
            </span>
        </td>
        <td class="app-data-table__actions-cell" @click.stop>
            <div v-if="canWrite" class="app-data-table__actions">
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
            </div>
        </td>
    </tr>
</template>

<style scoped>
.recurring-table__row.is-expense {
    --tint: rgb(var(--amount-debit));
}

.recurring-table__row.is-income {
    --tint: rgb(var(--amount-credit));
}

.recurring-table__amount {
    color: var(--tint);
}

.recurring-table__status {
    --tint: rgb(var(--v-theme-success));
}

.recurring-table__status.is-paused {
    --tint: rgb(var(--v-theme-warning));
}
</style>
