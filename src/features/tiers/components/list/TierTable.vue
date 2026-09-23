<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDataTable, { type AppDataTableSort } from '@/components/shared/data-table/AppDataTable.vue';
import type { Tier } from '@/features/tiers/types';
import type { TierSort } from '@/features/tiers/format';
import TierTableRow from '@/features/tiers/components/list/TierTableRow.vue';

const COLUMN_SORT = {
    name: { asc: 'nameAsc', desc: 'nameDesc' },
    roles: { asc: 'rolesAsc', desc: 'rolesDesc' },
    email: { asc: 'emailAsc', desc: 'emailDesc' },
    phone: { asc: 'phoneAsc', desc: 'phoneDesc' },
    website: { asc: 'websiteAsc', desc: 'websiteDesc' },
    nature: { asc: 'natureAsc', desc: 'natureDesc' }
} as const satisfies Record<string, { asc: TierSort; desc: TierSort }>;

const props = defineProps<{
    items: Tier[];
    acting?: boolean;
    sort?: TierSort;
}>();

const emit = defineEmits<{
    edit: [tier: Tier];
    delete: [tier: Tier];
    sort: [value: TierSort];
}>();

const { t } = useI18n();

const COLUMN_WIDTH = {
    name: '23%',
    roles: '16%',
    email: '19%',
    phone: '12%',
    website: '13%',
    nature: '17%'
} as const;

const columns = computed(() =>
    (Object.keys(COLUMN_SORT) as Array<keyof typeof COLUMN_SORT>).map((key) => ({
        key,
        label: t(`tiersPage.columns.${key}`),
        sortable: true,
        width: COLUMN_WIDTH[key]
    }))
);

const sortKey = computed(() => {
    const current = props.sort ?? 'nameAsc';
    return (
        (Object.keys(COLUMN_SORT) as Array<keyof typeof COLUMN_SORT>).find((key) => {
            const pair = COLUMN_SORT[key];
            return pair.asc === current || pair.desc === current;
        }) ?? null
    );
});

const sortDirection = computed<'asc' | 'desc' | null>(() => {
    if (!sortKey.value) return null;
    return COLUMN_SORT[sortKey.value].desc === props.sort ? 'desc' : 'asc';
});

function onSort(value: AppDataTableSort) {
    const pair = COLUMN_SORT[value.key as keyof typeof COLUMN_SORT];
    if (!pair) return;
    emit('sort', pair[value.direction]);
}
</script>

<template>
    <AppDataTable
        :columns="columns"
        :sort-key="sortKey"
        :sort-direction="sortDirection"
        :sort-asc-label="t('tiersPage.sort.asc')"
        :sort-desc-label="t('tiersPage.sort.desc')"
        @sort="onSort"
    >
        <template #head-end />
        <TierTableRow
            v-for="(tier, index) in items"
            :key="tier.publicId"
            :tier="tier"
            :acting="acting"
            :style="{ '--i': index }"
            @edit="emit('edit', $event)"
            @delete="emit('delete', $event)"
        />
    </AppDataTable>
</template>
