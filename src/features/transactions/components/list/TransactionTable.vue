<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDataTable, { type AppDataTableColumn, type AppDataTableSort } from '@/components/shared/data-table/AppDataTable.vue';
import TransactionTableRow from '@/features/transactions/components/list/TransactionTableRow.vue';
import type { TransactionSort } from '@/features/transactions/format';
import type { Transaction } from '@/features/transactions/types';

const COLUMN_SORT: Partial<Record<string, { asc: TransactionSort; desc: TransactionSort }>> = {
    label: { asc: 'labelAsc', desc: 'labelDesc' },
    date: { asc: 'dateAsc', desc: 'dateDesc' },
    amount: { asc: 'amountAsc', desc: 'amountDesc' }
};

const COLUMN_WIDTH: Record<string, string> = {
    label: '27%',
    date: '12%',
    account: '17%',
    category: '15%',
    tier: '15%',
    amount: '14%'
};

const props = withDefaults(
    defineProps<{
        items: Transaction[];
        sort: TransactionSort;
        acting?: boolean;
        statementAccountPublicId?: string | null;
        canWrite: (transaction: Transaction) => boolean;
        envelopeActionFor: (transaction: Transaction) => 'add' | 'remove' | null;
    }>(),
    { acting: false, statementAccountPublicId: null }
);

const emit = defineEmits<{
    edit: [transaction: Transaction];
    delete: [transaction: Transaction];
    envelope: [transaction: Transaction];
    sort: [value: TransactionSort];
}>();

const { t } = useI18n();

const columns = computed<AppDataTableColumn[]>(() =>
    Object.keys(COLUMN_WIDTH).map((key) => ({
        key,
        label: t(`transactionsPage.columns.${key}`),
        sortable: !!COLUMN_SORT[key],
        width: COLUMN_WIDTH[key]
    }))
);

const hasEnvelopeActions = computed(() => props.items.some((item) => !!props.envelopeActionFor(item)));

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
</script>

<template>
    <AppDataTable
        :columns="columns"
        :sort-key="sortKey"
        :sort-direction="sortDirection"
        :sort-asc-label="t('transactionsPage.sortDir.asc')"
        :sort-desc-label="t('transactionsPage.sortDir.desc')"
        :end-width="hasEnvelopeActions ? '128px' : undefined"
        @sort="onSort"
    >
        <template #head-end />
        <TransactionTableRow
            v-for="transaction in items"
            :key="transaction.publicId"
            :transaction="transaction"
            :can-write="canWrite(transaction)"
            :acting="acting"
            :statement-account-public-id="statementAccountPublicId"
            :envelope-action="envelopeActionFor(transaction)"
            @edit="emit('edit', $event)"
            @delete="emit('delete', $event)"
            @envelope="emit('envelope', $event)"
        />
    </AppDataTable>
</template>
