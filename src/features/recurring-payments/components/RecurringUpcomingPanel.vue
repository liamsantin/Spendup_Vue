<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Receipt2Icon, TrendingUpIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import RecurringTemplateDetailModal from '@/features/recurring-payments/components/modals/RecurringTemplateDetailModal.vue';
import {
    addMonthsYmd,
    displayDueStatus,
    formatCalendarDate,
    formatPlannedAmount,
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

const { t, locale } = useI18n();
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
                <div class="recurring-upcoming__list">
                    <button
                        v-for="row in visibleRows"
                        :key="`${row.kind}-${row.due.publicId}`"
                        type="button"
                        class="recurring-upcoming-row"
                        @click="openRow(row)"
                    >
                        <span class="recurring-upcoming-row__icon" :class="`is-${row.kind}`">
                            <component :is="row.kind === 'expense' ? Receipt2Icon : TrendingUpIcon" size="18" stroke-width="1.8" />
                        </span>
                        <div class="recurring-upcoming-row__meta">
                            <div class="recurring-upcoming-row__title">
                                <p class="recurring-upcoming-row__name">{{ row.templateName }}</p>
                                <span class="recurring-upcoming-row__badge" :class="`is-${row.kind}`">{{
                                    t(`recurrencesPage.kinds.${row.kind}`)
                                }}</span>
                            </div>
                            <p class="recurring-upcoming-row__sub">
                                {{ formatCalendarDate(row.due.scheduledAt, locale) }} · {{ accountName(row.accountPublicId) }}
                            </p>
                            <p class="recurring-upcoming-row__sub">
                                {{ t(`recurrencesPage.dueStatuses.${displayDueStatus(row.due, row.kind)}`) }}
                            </p>
                        </div>
                        <span class="recurring-upcoming-row__amount" :class="row.kind === 'expense' ? 'is-debit' : 'is-credit'">
                            {{ formatPlannedAmount(row.due.plannedAmount, row.currency, locale) }}
                        </span>
                    </button>
                </div>
                <RecurringUpcomingTable
                    class="recurring-upcoming__table"
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
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.recurring-upcoming {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 4px 16px 10px;
}

.recurring-upcoming__list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: visible;
}

.recurring-upcoming__table {
    display: none;
}

@media (min-width: 768px) {
    .recurring-upcoming__list {
        display: none;
    }

    .recurring-upcoming__table {
        display: flex;
        flex: 1 1 auto;
        min-height: 0;
        flex-direction: column;
    }
}

@media (max-width: 767px) {
    .recurring-panel__scroll {
        display: block;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
    }

    .recurring-upcoming {
        display: block;
        padding: 0 4px 4px;
    }
}

.recurring-upcoming-row {
    appearance: none;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    margin: 0;
    padding: 10px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    position: relative;
    z-index: 0;
    transition:
        transform 0.5s var(--spring),
        box-shadow 0.45s var(--ease),
        background 0.3s var(--ease);
}

.recurring-upcoming-row:hover {
    background: var(--surface-hover-soft);
}

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
    .recurring-upcoming-row:hover {
        z-index: 1;
        transform: scale(1.012);
        box-shadow:
            0 1px 2px rgba(16, 16, 20, 0.04),
            0 12px 28px -16px rgba(16, 16, 20, 0.18);
    }
}

.recurring-upcoming-row__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 38px;
    height: 38px;
    margin-top: 1px;
    border-radius: 12px;
    background: var(--hair);
}

.recurring-upcoming-row__icon.is-expense {
    background: rgba(var(--amount-debit), 0.1);
    color: rgb(var(--amount-debit));
}

.recurring-upcoming-row__icon.is-income {
    background: rgba(var(--amount-credit), 0.12);
    color: rgb(var(--amount-credit));
}

.recurring-upcoming-row__meta {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.recurring-upcoming-row__title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.recurring-upcoming-row__name {
    margin: 0;
    min-width: 0;
    font-size: 14.5px;
    font-weight: 620;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.recurring-upcoming-row__badge {
    flex: none;
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    background: var(--hair);
    color: var(--ink-muted);
}

.recurring-upcoming-row__badge.is-expense {
    background: rgba(var(--amount-debit), 0.1);
    color: rgb(var(--amount-debit));
}

.recurring-upcoming-row__badge.is-income {
    background: rgba(var(--amount-credit), 0.12);
    color: rgb(var(--amount-credit));
}

.recurring-upcoming-row__sub {
    margin: 0;
    font-size: 0.8rem;
    color: var(--ink-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.recurring-upcoming-row__amount {
    flex: none;
    margin-top: 8px;
    font-size: 0.92rem;
    font-weight: 680;
    letter-spacing: -0.02em;
    white-space: nowrap;
}

.recurring-upcoming-row__amount.is-debit {
    color: rgb(var(--amount-debit));
}

.recurring-upcoming-row__amount.is-credit {
    color: rgb(var(--amount-credit));
}
</style>
