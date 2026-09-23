<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Receipt2Icon, TrendingUpIcon } from 'vue-tabler-icons';
import AppDataTable, { type AppDataTableColumn, type AppDataTableSort } from '@/components/shared/data-table/AppDataTable.vue';
import {
    displayDueStatus,
    formatCalendarDate,
    formatPlannedAmount,
    isDueSettled,
    type UpcomingDueSort
} from '@/features/recurring-payments/format';
import type { RecurringUpcomingRow } from '@/features/recurring-payments/types';

const COLUMN_SORT: Partial<Record<string, { asc: UpcomingDueSort; desc: UpcomingDueSort }>> = {
    name: { asc: 'nameAsc', desc: 'nameDesc' },
    date: { asc: 'dateAsc', desc: 'dateDesc' },
    amount: { asc: 'amountAsc', desc: 'amountDesc' }
};

const COLUMN_WIDTH: Record<string, string> = {
    name: '26%',
    date: '15%',
    kind: '13%',
    account: '17%',
    amount: '14%',
    status: '15%'
};

const props = defineProps<{
    rows: RecurringUpcomingRow[];
    sort: UpcomingDueSort;
    accountName: (accountPublicId: string) => string;
}>();

const emit = defineEmits<{
    open: [row: RecurringUpcomingRow];
    sort: [value: UpcomingDueSort];
}>();

const { t, locale } = useI18n();

const columns = computed<AppDataTableColumn[]>(() =>
    Object.keys(COLUMN_WIDTH).map((key) => ({
        key,
        label: t(`recurrencesPage.columns.${key}`),
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

function statusTone(row: RecurringUpcomingRow): string {
    const status = displayDueStatus(row.due, row.kind);
    if (isDueSettled(row.due, row.kind)) return 'is-settled';
    if (status === 'enRetard' || status === 'retard') return 'is-late';
    if (status === 'canceled' || status === 'annule') return 'is-canceled';
    return 'is-planned';
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
        <tr
            v-for="row in rows"
            :key="`${row.kind}-${row.due.publicId}`"
            class="app-data-table__row upcoming-table__row"
            :class="`is-${row.kind}`"
            @click="emit('open', row)"
        >
            <td>
                <div class="app-data-table__name">
                    <span class="app-data-table__avatar">
                        <component :is="row.kind === 'expense' ? Receipt2Icon : TrendingUpIcon" size="16" stroke-width="1.8" />
                    </span>
                    <span class="app-data-table__title">{{ row.templateName }}</span>
                </div>
            </td>
            <td>{{ formatCalendarDate(row.due.scheduledAt, locale) }}</td>
            <td>
                <span class="app-data-table__pill" :title="t(`recurrencesPage.kinds.${row.kind}`)">
                    <span class="app-data-table__pill-label">{{ t(`recurrencesPage.kinds.${row.kind}`) }}</span>
                </span>
            </td>
            <td>{{ accountName(row.accountPublicId) }}</td>
            <td>
                <span class="app-data-table__strong upcoming-table__amount">
                    {{ formatPlannedAmount(row.due.plannedAmount, row.currency, locale) }}
                </span>
            </td>
            <td>
                <span
                    class="app-data-table__pill upcoming-table__status"
                    :class="statusTone(row)"
                    :title="t(`recurrencesPage.dueStatuses.${displayDueStatus(row.due, row.kind)}`)"
                >
                    <span class="app-data-table__pill-label">
                        {{ t(`recurrencesPage.dueStatuses.${displayDueStatus(row.due, row.kind)}`) }}
                    </span>
                </span>
            </td>
        </tr>
    </AppDataTable>
</template>

<style scoped>
.upcoming-table__row.is-expense {
    --tint: rgb(var(--amount-debit));
}

.upcoming-table__row.is-income {
    --tint: rgb(var(--amount-credit));
}

.upcoming-table__amount {
    color: var(--tint);
}

.upcoming-table__status.is-planned {
    --tint: rgb(var(--v-theme-primary));
}

.upcoming-table__status.is-settled {
    --tint: rgb(var(--v-theme-success));
}

.upcoming-table__status.is-late {
    --tint: rgb(var(--v-theme-error));
}

.upcoming-table__status.is-canceled {
    --tint: var(--ink-muted);
}
</style>
