<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDataTable, { type AppDataTableColumn, type AppDataTableSort } from '@/components/shared/data-table/AppDataTable.vue';
import ImportLineTableRow from '@/features/imports/components/list/ImportLineTableRow.vue';
import { buildImportLineSort, importLineSortParts } from '@/features/imports/format';
import type { ImportLine, ImportLineSort, ImportLineSortKey } from '@/features/imports/types';

/** Colonne affichée → clé de tri API. */
const COLUMN_SORT: Partial<Record<string, ImportLineSortKey>> = {
    lineNumber: 'lineNumber',
    date: 'date',
    amount: 'amount',
    status: 'status'
};

const COLUMN_WIDTH: Record<string, string> = {
    lineNumber: '7%',
    date: '12%',
    label: '31%',
    category: '15%',
    tier: '12%',
    amount: '12%',
    status: '11%'
};

const props = defineProps<{
    lines: ImportLine[];
    sort: ImportLineSort;
    currency?: string | null;
    editable: boolean;
    acting?: boolean;
}>();

const emit = defineEmits<{
    sort: [value: ImportLineSort];
    validate: [line: ImportLine];
    ignore: [line: ImportLine];
    restore: [line: ImportLine];
    edit: [line: ImportLine];
}>();

const { t } = useI18n();

const columns = computed<AppDataTableColumn[]>(() =>
    Object.keys(COLUMN_WIDTH).map((key) => ({
        key,
        label: t(`importsPage.lines.columns.${key}`),
        sortable: !!COLUMN_SORT[key],
        width: COLUMN_WIDTH[key]
    }))
);

const sortKey = computed(() => {
    const { key } = importLineSortParts(props.sort);
    return Object.keys(COLUMN_SORT).find((column) => COLUMN_SORT[column] === key) ?? null;
});

const sortDirection = computed(() => importLineSortParts(props.sort).direction);

function onSort(value: AppDataTableSort) {
    const key = COLUMN_SORT[value.key];
    if (key) emit('sort', buildImportLineSort(key, value.direction));
}
</script>

<template>
    <AppDataTable
        :columns="columns"
        :sort-key="sortKey"
        :sort-direction="sortDirection"
        :sort-asc-label="t('importsPage.lines.sortDir.asc')"
        :sort-desc-label="t('importsPage.lines.sortDir.desc')"
        :end-width="editable ? '136px' : '96px'"
        @sort="onSort"
    >
        <template #head-end />
        <ImportLineTableRow
            v-for="line in lines"
            :key="line.publicId"
            :line="line"
            :currency="currency"
            :editable="editable"
            :acting="acting"
            @validate="emit('validate', $event)"
            @ignore="emit('ignore', $event)"
            @restore="emit('restore', $event)"
            @edit="emit('edit', $event)"
        />
    </AppDataTable>
</template>
