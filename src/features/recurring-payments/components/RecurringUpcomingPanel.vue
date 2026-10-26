<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import RecurringTemplateDetailModal from '@/features/recurring-payments/components/modals/RecurringTemplateDetailModal.vue';
import {
    addMonthsYmd,
    displayDueStatus,
    isDueOpen,
    isDueSettled,
    matchesRecurringSearch,
    parseUpcomingDueSort,
    sortUpcomingDueRows,
    todayLocalYmd,
    type UpcomingDueSort
} from '@/features/recurring-payments/format';
import { amountInFilterRange, parseAmountFilter, isAmountRangeFilterActive } from '@/components/shared/dropdown-filter/amount-range';
import { recurringExpensesApi, recurringIncomesApi } from '@/features/recurring-payments/api';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import RecurringUpcomingTable from '@/features/recurring-payments/components/list/RecurringUpcomingTable.vue';
import { downloadCsv } from '@/utils/helpers/csv';
import type { RecurringKind, RecurringUpcomingRow as UpcomingRow } from '@/features/recurring-payments/types';

const props = withDefaults(
    defineProps<{
        settlement?: 'all' | 'planned' | 'settled';
        kind?: RecurringKind | null;
        accountPublicId?: string | null;
        minAmount?: string | null;
        maxAmount?: string | null;
        sort?: UpcomingDueSort;
        search?: string | null;
    }>(),
    { settlement: 'all', kind: null, accountPublicId: null, minAmount: null, maxAmount: null, sort: 'dateAsc', search: null }
);

const emit = defineEmits<{
    sort: [value: UpcomingDueSort];
}>();

const { t } = useI18n();
const accountsStore = useAccountsStore();
const store = useRecurringPaymentsStore();
const loading = ref(false);
const localError = ref<string | null>(null);
const rows = ref<UpcomingRow[]>([]);
const detailKind = ref<RecurringKind>('expense');
const detailId = ref<string | null>(null);

const detailOpen = computed({
    get: () => !!detailId.value,
    set: (value: boolean) => {
        if (!value) detailId.value = null;
    }
});

const visibleRows = computed(() => {
    const accountId = props.accountPublicId?.trim() || null;
    const kind = props.kind;
    const minAmount = parseAmountFilter(props.minAmount);
    const maxAmount = parseAmountFilter(props.maxAmount);
    const needle = props.search?.trim();
    const filtered = rows.value.filter((row) => {
        if (kind && row.kind !== kind) return false;
        if (accountId && row.accountPublicId !== accountId) return false;
        if (needle && !matchesRecurringSearch(needle, row.templateName, accountName(row.accountPublicId))) return false;
        if (!amountInFilterRange(row.due.actualAmount ?? row.due.plannedAmount, minAmount, maxAmount)) return false;
        if (props.settlement === 'planned') return isDueOpen(row.due, row.kind);
        if (props.settlement === 'settled') return isDueSettled(row.due, row.kind);
        return true;
    });
    return sortUpcomingDueRows(filtered, parseUpcomingDueSort(props.sort));
});

const emptyCopy = computed(() => {
    if (props.settlement === 'planned') return t('recurrencesPage.empty.upcomingPlanned');
    if (props.settlement === 'settled') return t('recurrencesPage.empty.upcomingSettled');
    if (props.kind || props.accountPublicId || props.minAmount || props.maxAmount || props.search?.trim()) {
        return t('recurrencesPage.empty.upcomingFiltered');
    }
    return t('recurrencesPage.empty.upcoming');
});

async function loadUpcoming() {
    loading.value = true;
    localError.value = null;
    try {
        await accountsStore.loadAccounts();
        const from = todayLocalYmd();
        const to = addMonthsYmd(from, 3);
        await Promise.all([
            store.loadExpenses({ from, to, pageSize: 200, force: true }),
            store.loadIncomes({ from, to, pageSize: 200, force: true })
        ]);
        if (isAmountRangeFilterActive(props.minAmount, props.maxAmount)) {
            let guard = 0;
            while (guard++ < 30 && (store.hasMoreExpenses || store.hasMoreIncomes)) {
                if (store.hasMoreExpenses) await store.loadMoreExpenses();
                if (store.hasMoreIncomes) await store.loadMoreIncomes();
            }
        }

        const next: UpcomingRow[] = [];
        const expenses = store.expenses.filter((item) => item.nextDueDate && item.nextDueDate >= from && item.nextDueDate <= to);
        const incomes = store.incomes.filter((item) => item.nextDueDate && item.nextDueDate >= from && item.nextDueDate <= to);

        const expenseDues = await Promise.all(
            expenses.map(async (item) => {
                const list = await recurringExpensesApi.listDues(item.publicId, { from, to, pageSize: 200 });
                return { item, dues: list.items ?? [] };
            })
        );
        for (const { item, dues } of expenseDues) {
            for (const due of dues) {
                next.push({
                    kind: 'expense',
                    templatePublicId: item.publicId,
                    templateName: item.name,
                    accountPublicId: item.accountPublicId,
                    currency: item.currency,
                    due
                });
            }
        }

        const incomeDues = await Promise.all(
            incomes.map(async (item) => {
                const list = await recurringIncomesApi.listDues(item.publicId, { from, to, pageSize: 200 });
                return { item, dues: list.items ?? [] };
            })
        );
        for (const { item, dues } of incomeDues) {
            for (const due of dues) {
                next.push({
                    kind: 'income',
                    templatePublicId: item.publicId,
                    templateName: item.name,
                    accountPublicId: item.accountPublicId,
                    currency: item.currency,
                    due
                });
            }
        }

        next.sort((a, b) => a.due.scheduledAt.localeCompare(b.due.scheduledAt) || a.templateName.localeCompare(b.templateName));
        rows.value = next;
    } catch (e: unknown) {
        localError.value = AppError.fromUnknown(e).status === 404 ? t('recurrencesPage.errors.notFound') : getErrorMessage(e);
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    void loadUpcoming();
});

function accountName(id: string) {
    return accountsStore.accounts.find((item) => item.publicId === id)?.name ?? t('recurrencesPage.unknownAccount');
}

function openRow(row: UpcomingRow) {
    detailKind.value = row.kind;
    detailId.value = row.templatePublicId;
}

function exportCsv() {
    const header = (['name', 'date', 'kind', 'account', 'amount', 'status'] as const).map((key) => t(`recurrencesPage.columns.${key}`));
    const lines = visibleRows.value.map((row) => [
        row.templateName,
        row.due.scheduledAt,
        t(`recurrencesPage.kinds.${row.kind}`),
        accountName(row.accountPublicId),
        row.due.plannedAmount,
        t(`recurrencesPage.dueStatuses.${displayDueStatus(row.due, row.kind)}`)
    ]);
    downloadCsv('echeances', header, lines);
}

const visibleCount = computed(() => visibleRows.value.length);

defineExpose({ exportCsv, visibleCount });
</script>

<template>
    <div class="recurring-panel">
        <AppAlert v-if="localError" type="error" class="su-alert" closable @dismiss="localError = null">{{ localError }}</AppAlert>
        <div class="recurring-panel__scroll">
            <div v-if="loading && !rows.length" class="su-loading"><span class="su-spin" /></div>
            <div v-else-if="!visibleRows.length" class="su-empty">
                <p>{{ emptyCopy }}</p>
            </div>
            <div v-else class="recurring-upcoming">
                <RecurringUpcomingTable
                    :rows="visibleRows"
                    :sort="parseUpcomingDueSort(sort)"
                    :account-name="accountName"
                    @open="openRow"
                    @sort="emit('sort', $event)"
                />
            </div>
        </div>

        <RecurringTemplateDetailModal v-model="detailOpen" :kind="detailKind" :public-id="detailId" />
    </div>
</template>

<style scoped>
.recurring-panel {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.recurring-panel__scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    scrollbar-width: thin;
    -webkit-overflow-scrolling: touch;
}

.recurring-upcoming {
    padding: 8px 0 24px;
}

@media (max-width: 767px) {
    .recurring-upcoming {
        padding: 0 0 16px;
    }
}
</style>
