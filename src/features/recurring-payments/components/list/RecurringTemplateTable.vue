<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDataTable, { type AppDataTableColumn, type AppDataTableSort } from '@/components/shared/data-table/AppDataTable.vue';
import RecurringTemplateTableRow from '@/features/recurring-payments/components/list/RecurringTemplateTableRow.vue';
import { isExpenseTemplate, type TemplateSort } from '@/features/recurring-payments/format';
import type { RecurringExpense, RecurringIncome, RecurringKind } from '@/features/recurring-payments/types';

const COLUMN_SORT: Partial<Record<string, { asc: TemplateSort; desc: TemplateSort }>> = {
    name: { asc: 'nameAsc', desc: 'nameDesc' },
    nextDue: { asc: 'nextDueAsc', desc: 'nextDueDesc' },
    amount: { asc: 'amountAsc', desc: 'amountDesc' }
};

const props = withDefaults(
    defineProps<{
        items: (RecurringExpense | RecurringIncome)[];
        sort: TemplateSort;
        showKind?: boolean;
        acting?: boolean;
        canWrite: (accountPublicId: string) => boolean;
    }>(),
    { showKind: false, acting: false }
);

const emit = defineEmits<{
    open: [template: RecurringExpense | RecurringIncome];
    edit: [template: RecurringExpense | RecurringIncome];
    delete: [template: RecurringExpense | RecurringIncome];
    sort: [value: TemplateSort];
}>();

const { t } = useI18n();

const columns = computed<AppDataTableColumn[]>(() => {
    const widths: Record<string, string> = props.showKind
        ? { name: '24%', kind: '12%', frequency: '12%', account: '15%', nextDue: '14%', amount: '11%', status: '12%' }
        : { name: '28%', frequency: '14%', account: '17%', nextDue: '15%', amount: '13%', status: '13%' };
    return Object.keys(widths).map((key) => ({
        key,
        label: t(`recurrencesPage.columns.${key}`),
        sortable: !!COLUMN_SORT[key],
        width: widths[key]
    }));
});

const sortKey = computed(
    () => Object.keys(COLUMN_SORT).find((key) => COLUMN_SORT[key]?.asc === props.sort || COLUMN_SORT[key]?.desc === props.sort) ?? null
);

const sortDirection = computed<'asc' | 'desc' | null>(() => {
    if (!sortKey.value) return null;
    return COLUMN_SORT[sortKey.value]?.desc === props.sort ? 'desc' : 'asc';
});

function onSort(value: AppDataTableSort) {
    const pair = COLUMN_SORT[value.key];
    if (pair) emit('sort', pair[value.direction]);
}

function kindOf(item: RecurringExpense | RecurringIncome): RecurringKind {
    return isExpenseTemplate(item) ? 'expense' : 'income';
}
</script>

<template>
    <AppDataTable
        :columns="columns"
        :sort-key="sortKey"
        :sort-direction="sortDirection"
        :sort-asc-label="t('recurrencesPage.sort.asc')"
        :sort-desc-label="t('recurrencesPage.sort.desc')"
        @sort="onSort"
    >
        <template #head-end />
        <RecurringTemplateTableRow
            v-for="item in items"
            :key="`${kindOf(item)}-${item.publicId}`"
            :template="item"
            :kind="kindOf(item)"
            :show-kind="showKind"
            :can-write="canWrite(item.accountPublicId)"
            :acting="acting"
            @open="emit('open', $event)"
            @edit="emit('edit', $event)"
            @delete="emit('delete', $event)"
        />
    </AppDataTable>
</template>
