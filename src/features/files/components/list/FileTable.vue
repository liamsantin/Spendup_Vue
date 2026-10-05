<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDataTable, { type AppDataTableColumn, type AppDataTableSort } from '@/components/shared/data-table/AppDataTable.vue';
import FileTableRow from '@/features/files/components/list/FileTableRow.vue';
import type { FileSort } from '@/features/files/format';
import type { FileDto } from '@/features/files/types';

const COLUMN_SORT: Partial<Record<string, { asc: FileSort; desc: FileSort }>> = {
    name: { asc: 'nameAsc', desc: 'nameDesc' },
    documentDate: { asc: 'documentDateAsc', desc: 'documentDateDesc' },
    size: { asc: 'sizeAsc', desc: 'sizeDesc' },
    added: { asc: 'oldest', desc: 'recent' }
};

const COLUMN_WIDTH: Record<string, string> = {
    name: '38%',
    documentDate: '22%',
    size: '16%',
    added: '24%'
};

const props = withDefaults(
    defineProps<{
        items: FileDto[];
        sort: FileSort;
        acting?: boolean;
    }>(),
    { acting: false }
);

const emit = defineEmits<{
    preview: [file: FileDto];
    download: [file: FileDto];
    edit: [file: FileDto];
    delete: [file: FileDto];
    sort: [value: FileSort];
}>();

const { t } = useI18n();

const columns = computed<AppDataTableColumn[]>(() =>
    Object.keys(COLUMN_WIDTH).map((key) => ({
        key,
        label: t(`filesPage.columns.${key}`),
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
        :sort-asc-label="t('filesPage.sort.asc')"
        :sort-desc-label="t('filesPage.sort.desc')"
        end-width="176px"
        @sort="onSort"
    >
        <template #head-end />
        <FileTableRow
            v-for="file in items"
            :key="file.publicId"
            :file="file"
            :acting="acting"
            @preview="emit('preview', $event)"
            @download="emit('download', $event)"
            @edit="emit('edit', $event)"
            @delete="emit('delete', $event)"
        />
    </AppDataTable>
</template>
