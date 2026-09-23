<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDataTable, { type AppDataTableColumn, type AppDataTableSort } from '@/components/shared/data-table/AppDataTable.vue';
import PaymentMethodTableRow from '@/features/payment-methods/components/list/PaymentMethodTableRow.vue';
import type { PaymentMethodSort } from '@/features/payment-methods/format';
import type { PaymentMethod } from '@/features/payment-methods/types';

const COLUMN_SORT: Partial<Record<string, { asc: PaymentMethodSort; desc: PaymentMethodSort }>> = {
    label: { asc: 'labelAsc', desc: 'labelDesc' },
    type: { asc: 'typeAsc', desc: 'typeDesc' },
    account: { asc: 'accountAsc', desc: 'accountDesc' },
    expiration: { asc: 'expirationAsc', desc: 'expirationDesc' }
};

const COLUMN_WIDTH: Record<string, string> = {
    label: '26%',
    type: '14%',
    account: '18%',
    number: '14%',
    expiration: '14%',
    status: '14%'
};

const props = withDefaults(
    defineProps<{
        items: PaymentMethod[];
        sort: PaymentMethodSort;
        acting?: boolean;
        accountName: (accountPublicId: string) => string;
        canWrite: (accountPublicId: string) => boolean;
    }>(),
    { acting: false }
);

const emit = defineEmits<{
    edit: [method: PaymentMethod];
    delete: [method: PaymentMethod];
    sort: [value: PaymentMethodSort];
}>();

const { t } = useI18n();

const columns = computed<AppDataTableColumn[]>(() =>
    Object.keys(COLUMN_WIDTH).map((key) => ({
        key,
        label: t(`paymentMethodsPage.columns.${key}`),
        sortable: !!COLUMN_SORT[key],
        width: COLUMN_WIDTH[key]
    }))
);

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
        :sort-asc-label="t('paymentMethodsPage.sort.asc')"
        :sort-desc-label="t('paymentMethodsPage.sort.desc')"
        @sort="onSort"
    >
        <template #head-end />
        <PaymentMethodTableRow
            v-for="method in items"
            :key="method.publicId"
            :method="method"
            :account-name="accountName(method.accountPublicId)"
            :can-write="canWrite(method.accountPublicId)"
            :acting="acting"
            @edit="emit('edit', $event)"
            @delete="emit('delete', $event)"
        />
    </AppDataTable>
</template>
