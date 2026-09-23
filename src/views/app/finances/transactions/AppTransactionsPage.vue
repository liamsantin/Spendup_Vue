<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { PlusIcon, CalendarIcon, ChevronDownIcon, CheckIcon, CoinIcon, FileExportIcon, LayoutGridIcon } from 'vue-tabler-icons';
import AppBoard from '@/components/shared/board/AppBoard.vue';
import AppBoardSearch from '@/components/shared/board/AppBoardSearch.vue';
import { useBoardSearch } from '@/components/shared/board/useBoardSearch';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppAmountRangeFields from '@/components/shared/dropdown-filter/AppAmountRangeFields.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { serializeAmountFilter } from '@/components/shared/dropdown-filter/amount-range';
import {
    TransactionsTimeline,
    TRANSACTION_SEARCH_MAX,
    TRANSACTION_SORT_DEFAULT,
    TRANSACTION_TYPES,
    canWriteTransactions,
    isTransactionSort,
    parseTransactionSort,
    useTransactionsStore
} from '@/features/transactions';
import type { TransactionType } from '@/features/transactions';
import { useAccountsStore } from '@/features/accounts';
import { budgetLinkedTransactionsQuery, parseBudgetTransactionScope, useBudgetsStore } from '@/features/budgets';
import BudgetEnvelopeBanner from '@/features/budgets/components/BudgetEnvelopeBanner.vue';
import { categorySelectItems, useCategoriesStore } from '@/features/categories';
import { PAYMENT_METHOD_PAGE_SIZE_MAX, usePaymentMethodsStore } from '@/features/payment-methods';
import { RECURRING_PAGE_SIZE_MAX, useRecurringPaymentsStore } from '@/features/recurring-payments';
import { tierSelectItems, useTiersStore } from '@/features/tiers';
import { TRANSACTION_TYPE_ICONS } from '@/features/transactions/typeUi';
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useTransactionsStore();
const accountsStore = useAccountsStore();
const budgetsStore = useBudgetsStore();
const categoriesStore = useCategoriesStore();
const tiersStore = useTiersStore();
const paymentMethodsStore = usePaymentMethodsStore();
const recurringStore = useRecurringPaymentsStore();
const timelineRef = ref<{ openCreate: () => void; exportCsv: () => void; visibleCount: number } | null>(null);
const visibleCount = computed(() => timelineRef.value?.visibleCount ?? 0);

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

const typeMenuOpen = ref(false);

const canCreate = computed(() => accountsStore.accounts.some((a) => canWriteTransactions(a)));

const accountItems = computed(() => [
    { title: t('transactionsPage.filters.allAccounts'), value: '' },
    ...accountsStore.accounts.map((a) => ({ title: a.name, value: a.publicId }))
]);

const categoryItems = computed(() =>
    categorySelectItems(categoriesStore.items, { noneTitle: t('transactionsPage.filters.allCategories') })
);

const tierItems = computed(() => {
    const items = tierSelectItems(tiersStore.allKnownItems(), { noneTitle: t('transactionsPage.filters.allTiers') });
    const selected = queryString('tier');
    if (selected && !items.some((item) => item.value === selected)) {
        items.push({ title: tiersStore.findByPublicId(selected)?.name ?? selected, value: selected });
    }
    return items;
});

function parseType(raw: string): TransactionType | '' {
    return TRANSACTION_TYPES.includes(raw as TransactionType) ? (raw as TransactionType) : '';
}

const filterAccountId = computed({
    get: () => queryString('account'),
    set: (value: string) => patchQuery({ account: value || undefined })
});

const filteredAccount = computed(() => accountsStore.accounts.find((a) => a.publicId === filterAccountId.value) ?? null);

function recurrenceKey(kind: 'expense' | 'income', publicId: string) {
    return `${kind}:${publicId}`;
}

function parseRecurrenceKey(value: string): { kind: 'expense' | 'income'; publicId: string } | null {
    if (value.startsWith('expense:')) {
        const publicId = value.slice('expense:'.length).trim();
        return publicId ? { kind: 'expense', publicId } : null;
    }
    if (value.startsWith('income:')) {
        const publicId = value.slice('income:'.length).trim();
        return publicId ? { kind: 'income', publicId } : null;
    }
    return null;
}

const filterRecurrenceKey = computed({
    get: () => {
        const expenseId = queryString('recurringExpensePublicId');
        if (expenseId) return recurrenceKey('expense', expenseId);
        const incomeId = queryString('recurringIncomePublicId');
        if (incomeId) return recurrenceKey('income', incomeId);
        return '';
    },
    set: (value: string) => {
        const parsed = parseRecurrenceKey(value);
        if (!parsed) {
            patchQuery({ recurringExpensePublicId: undefined, recurringIncomePublicId: undefined });
            return;
        }
        if (parsed.kind === 'expense') {
            patchQuery({ recurringExpensePublicId: parsed.publicId, recurringIncomePublicId: undefined });
            return;
        }
        patchQuery({ recurringExpensePublicId: undefined, recurringIncomePublicId: parsed.publicId });
    }
});

function recurrenceName(kind: 'expense' | 'income', publicId: string): string | null {
    if (kind === 'expense') {
        return (
            recurringStore.expenses.find((item) => item.publicId === publicId)?.name ??
            recurringStore.getDetail('expense', publicId)?.name ??
            null
        );
    }
    return (
        recurringStore.incomes.find((item) => item.publicId === publicId)?.name ??
        recurringStore.getDetail('income', publicId)?.name ??
        null
    );
}

const filteredRecurrence = computed(() => {
    const parsed = parseRecurrenceKey(filterRecurrenceKey.value);
    if (!parsed) return null;
    return {
        kind: parsed.kind,
        publicId: parsed.publicId,
        name: recurrenceName(parsed.kind, parsed.publicId) ?? t('transactionsPage.unknownRecurrence')
    };
});

const recurrenceItems = computed(() => {
    const items: { title: string; value: string }[] = [{ title: t('transactionsPage.filters.allRecurrences'), value: '' }];
    for (const item of recurringStore.expenses) {
        items.push({
            title: `${t('recurrencesPage.kinds.expense')} · ${item.name}`,
            value: recurrenceKey('expense', item.publicId)
        });
    }
    for (const item of recurringStore.incomes) {
        items.push({
            title: `${t('recurrencesPage.kinds.income')} · ${item.name}`,
            value: recurrenceKey('income', item.publicId)
        });
    }
    const selected = filterRecurrenceKey.value;
    if (selected && !items.some((item) => item.value === selected) && filteredRecurrence.value) {
        items.push({
            title: `${t(`recurrencesPage.kinds.${filteredRecurrence.value.kind}`)} · ${filteredRecurrence.value.name}`,
            value: selected
        });
    }
    return items;
});

const filterBudgetId = computed({
    get: () => queryString('budget'),
    set: (value: string) => {
        if (!value) {
            patchQuery({ budget: undefined, budgetScope: undefined });
            return;
        }
        const budget = budgetsStore.findByPublicId(value);
        if (!budget) {
            patchQuery({ budget: value });
            return;
        }
        const next = budgetLinkedTransactionsQuery(budget);
        patchQuery({
            budget: next.budget,
            type: next.type,
            from: next.from,
            to: next.to,
            category: next.category,
            budgetScope: undefined
        });
    }
});

const filteredBudget = computed(() => {
    const id = filterBudgetId.value;
    if (!id) return null;
    return {
        publicId: id,
        name: budgetsStore.findByPublicId(id)?.name ?? t('transactionsPage.unknownBudget')
    };
});

const envelopeBudget = computed(() => {
    const id = filterBudgetId.value;
    return id ? (budgetsStore.findByPublicId(id) ?? null) : null;
});

const envelopeScope = computed({
    get: () => {
        if (!envelopeBudget.value?.categoryPublicId) return 'in' as const;
        return parseBudgetTransactionScope(queryString('budgetScope'));
    },
    set: (value: 'in' | 'out') => patchQuery({ budgetScope: value === 'out' ? 'out' : undefined })
});

const budgetItems = computed(() => {
    const items: { title: string; value: string }[] = [{ title: t('transactionsPage.filters.allBudgets'), value: '' }];
    const seen = new Set<string>();
    for (const item of budgetsStore.allKnownItems()) {
        seen.add(item.publicId);
        items.push({ title: item.name, value: item.publicId });
    }
    const selected = filterBudgetId.value;
    if (selected && !seen.has(selected) && filteredBudget.value) {
        items.push({ title: filteredBudget.value.name, value: selected });
    }
    return items;
});

const pageTitle = computed(() => {
    if (filteredBudget.value) {
        return t('transactionsPage.titleForBudget', { name: filteredBudget.value.name });
    }
    if (filteredRecurrence.value) {
        return t('transactionsPage.titleForRecurrence', { name: filteredRecurrence.value.name });
    }
    if (filteredAccount.value) {
        return t('transactionsPage.titleForAccount', { name: filteredAccount.value.name });
    }
    return t('transactionsPage.title');
});

const filterType = computed({
    get: () => parseType(queryString('type')),
    set: (value: string) => patchQuery({ type: value || undefined })
});

const filterFrom = computed({
    get: () => queryString('from') || null,
    set: (value: string | null) => patchQuery({ from: value || undefined })
});

const filterTo = computed({
    get: () => queryString('to') || null,
    set: (value: string | null) => patchQuery({ to: value || undefined })
});

const filterCategoryId = computed({
    get: () => queryString('category'),
    set: (value: string) => patchQuery({ category: value || undefined })
});

const filterTierId = computed({
    get: () => queryString('tier'),
    set: (value: string) => patchQuery({ tier: value || undefined })
});

const filterPaymentMethodId = computed({
    get: () => queryString('paymentMethod'),
    set: (value: string) => patchQuery({ paymentMethod: value || undefined })
});

const paymentMethodItems = computed(() => {
    const items: { title: string; value: string }[] = [{ title: t('transactionsPage.filters.allPaymentMethods'), value: '' }];
    const accountId = filterAccountId.value;
    let methods = paymentMethodsStore.allKnownItems();
    if (accountId) {
        methods = methods.filter((method) => method.accountPublicId === accountId);
    }
    const seen = new Set<string>();
    for (const method of methods) {
        seen.add(method.publicId);
        const accountName = accountsStore.accounts.find((account) => account.publicId === method.accountPublicId)?.name;
        items.push({
            title: accountId || !accountName ? method.label : `${method.label} · ${accountName}`,
            value: method.publicId
        });
    }
    const selected = filterPaymentMethodId.value;
    if (selected && !seen.has(selected)) {
        const found = paymentMethodsStore.allKnownItems().find((method) => method.publicId === selected);
        items.push({ title: found?.label ?? selected, value: selected });
    }
    return items;
});

const listSort = computed({
    get: () => parseTransactionSort(queryString('sort')),
    set: (value: string) => patchQuery({ sort: value === TRANSACTION_SORT_DEFAULT ? undefined : value })
});

const filterMinAmount = computed({
    get: () => queryString('minAmount'),
    set: (value: string) => patchQuery({ minAmount: serializeAmountFilter(value) })
});

const filterMaxAmount = computed({
    get: () => queryString('maxAmount'),
    set: (value: string) => patchQuery({ maxAmount: serializeAmountFilter(value) })
});

function patchQuery(patch: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    const q = 'q' in patch ? patch.q : queryString('q') || undefined;
    const account = 'account' in patch ? patch.account : queryString('account') || undefined;
    const type = 'type' in patch ? patch.type : queryString('type') || undefined;
    const from = 'from' in patch ? patch.from : queryString('from') || undefined;
    const to = 'to' in patch ? patch.to : queryString('to') || undefined;
    const category = 'category' in patch ? patch.category : queryString('category') || undefined;
    const tier = 'tier' in patch ? patch.tier : queryString('tier') || undefined;
    const paymentMethod = 'paymentMethod' in patch ? patch.paymentMethod : queryString('paymentMethod') || undefined;
    const recurringExpensePublicId =
        'recurringExpensePublicId' in patch ? patch.recurringExpensePublicId : queryString('recurringExpensePublicId') || undefined;
    const recurringIncomePublicId =
        'recurringIncomePublicId' in patch ? patch.recurringIncomePublicId : queryString('recurringIncomePublicId') || undefined;
    const budget = 'budget' in patch ? patch.budget : queryString('budget') || undefined;
    const budgetScope = 'budgetScope' in patch ? patch.budgetScope : queryString('budgetScope') || undefined;
    const sort = 'sort' in patch ? patch.sort : queryString('sort') || undefined;
    const minAmount = 'minAmount' in patch ? patch.minAmount : queryString('minAmount') || undefined;
    const maxAmount = 'maxAmount' in patch ? patch.maxAmount : queryString('maxAmount') || undefined;
    if (q) next.q = q.slice(0, TRANSACTION_SEARCH_MAX);
    if (account) next.account = account;
    if (type && TRANSACTION_TYPES.includes(type as TransactionType)) next.type = type;
    if (from) next.from = from;
    if (to) next.to = to;
    if (category) next.category = category;
    if (tier) next.tier = tier;
    if (paymentMethod) next.paymentMethod = paymentMethod;
    if (recurringExpensePublicId) next.recurringExpensePublicId = recurringExpensePublicId;
    if (recurringIncomePublicId) next.recurringIncomePublicId = recurringIncomePublicId;
    if (budget) next.budget = budget;
    if (budget && budgetScope === 'out') next.budgetScope = 'out';
    if (sort && isTransactionSort(sort) && sort !== TRANSACTION_SORT_DEFAULT) next.sort = sort;
    if (minAmount) next.minAmount = minAmount;
    if (maxAmount) next.maxAmount = maxAmount;
    void router.replace({ path: '/app/finances/transactions', query: next });
}

const search = useBoardSearch({
    read: () => queryString('q'),
    commit: (value) => patchQuery({ q: value }),
    max: TRANSACTION_SEARCH_MAX
});

function clearBudgetEnvelope() {
    patchQuery({
        budget: undefined,
        budgetScope: undefined,
        type: undefined,
        from: undefined,
        to: undefined,
        category: undefined
    });
}

function onCreate() {
    if (!canCreate.value || store.acting) return;
    timelineRef.value?.openCreate();
}

function resetFilters() {
    patchQuery({
        account: undefined,
        category: undefined,
        tier: undefined,
        paymentMethod: undefined,
        recurringExpensePublicId: undefined,
        recurringIncomePublicId: undefined,
        budget: undefined,
        budgetScope: undefined
    });
}

function resetPeriod() {
    patchQuery({ from: undefined, to: undefined });
}

function resetAmount() {
    patchQuery({ minAmount: undefined, maxAmount: undefined });
}

const filterCount = computed(
    () =>
        [
            filterAccountId.value,
            filterCategoryId.value,
            filterTierId.value,
            filterPaymentMethodId.value,
            filterRecurrenceKey.value,
            filterBudgetId.value
        ].filter(Boolean).length
);

const filtersActive = computed(() => filterCount.value > 0);

const periodCount = computed(() => [filterFrom.value, filterTo.value].filter(Boolean).length);

const amountCount = computed(() => [filterMinAmount.value, filterMaxAmount.value].filter(Boolean).length);

const typeTabLabel = computed(() =>
    filterType.value ? t(`transactionsPage.types.${filterType.value}`) : t('transactionsPage.filters.allTypes')
);

const typeTabIcon = computed(() => (filterType.value ? TRANSACTION_TYPE_ICONS[filterType.value] : LayoutGridIcon));

function selectType(value: TransactionType | '') {
    filterType.value = value;
    typeMenuOpen.value = false;
}

onMounted(() => {
    void recurringStore.loadExpenses({ pageSize: RECURRING_PAGE_SIZE_MAX }).catch(() => undefined);
    void recurringStore.loadIncomes({ pageSize: RECURRING_PAGE_SIZE_MAX }).catch(() => undefined);
    void budgetsStore.loadList().catch(() => undefined);
    void paymentMethodsStore.loadList({ pageSize: PAYMENT_METHOD_PAGE_SIZE_MAX }).catch(() => undefined);
});

watch(
    () => [queryString('recurringExpensePublicId'), queryString('recurringIncomePublicId')] as const,
    ([expenseId, incomeId]) => {
        if (expenseId && !recurrenceName('expense', expenseId)) {
            void recurringStore.getExpense(expenseId).catch(() => undefined);
        }
        if (incomeId && !recurrenceName('income', incomeId)) {
            void recurringStore.getIncome(incomeId).catch(() => undefined);
        }
    },
    { immediate: true }
);

watch(
    () => queryString('budget'),
    (id) => {
        if (id && !budgetsStore.findByPublicId(id)) {
            void budgetsStore.fetchBudget(id).catch(() => undefined);
        }
    },
    { immediate: true }
);
</script>

<template>
    <AppPageShell class="transactions-page" :title="pageTitle" :body-scroll="false">
        <BudgetEnvelopeBanner
            v-if="envelopeBudget"
            class="transactions-page__banner"
            :budget="envelopeBudget"
            :scope="envelopeScope"
            @update:scope="envelopeScope = $event"
            @dismiss="clearBudgetEnvelope"
        />
        <AppBoard>
            <template #filters>
                <v-menu v-if="!filterBudgetId" v-model="typeMenuOpen" location="bottom start" :offset="8" scrim>
                    <template #activator="{ props: menuProps }">
                        <nav class="transactions-type-tabs" :aria-label="t('transactionsPage.filters.type')">
                            <button
                                type="button"
                                class="transactions-type-trigger"
                                v-bind="menuProps"
                                :aria-expanded="typeMenuOpen"
                                :aria-haspopup="true"
                            >
                                <span class="su-tab__body">
                                    <component :is="typeTabIcon" :size="16" />
                                    {{ typeTabLabel }}
                                </span>
                                <ChevronDownIcon
                                    class="transactions-type-menu__chevron"
                                    :class="{ 'is-open': typeMenuOpen }"
                                    :size="16"
                                    stroke-width="1.8"
                                />
                            </button>
                        </nav>
                    </template>
                    <v-sheet elevation="0" class="su-menu transactions-type-menu">
                        <p class="transactions-type-menu__label">{{ t('transactionsPage.filters.type') }}</p>
                        <button
                            type="button"
                            class="transactions-type-menu__item is-all"
                            :class="{ 'is-active': !filterType }"
                            @click="selectType('')"
                        >
                            <span class="transactions-type-menu__icon">
                                <LayoutGridIcon :size="18" stroke-width="1.75" />
                            </span>
                            <span class="transactions-type-menu__name">{{ t('transactionsPage.filters.allTypes') }}</span>
                            <CheckIcon v-if="!filterType" class="transactions-type-menu__check" :size="16" stroke-width="2" />
                        </button>
                        <button
                            v-for="type in TRANSACTION_TYPES"
                            :key="type"
                            type="button"
                            class="transactions-type-menu__item"
                            :class="[`is-${type}`, { 'is-active': filterType === type }]"
                            @click="selectType(type)"
                        >
                            <span class="transactions-type-menu__icon">
                                <component :is="TRANSACTION_TYPE_ICONS[type]" :size="18" />
                            </span>
                            <span class="transactions-type-menu__name">{{ t(`transactionsPage.types.${type}`) }}</span>
                            <CheckIcon v-if="filterType === type" class="transactions-type-menu__check" :size="16" stroke-width="2" />
                        </button>
                    </v-sheet>
                </v-menu>
                <AppDropdownFilter
                    :label="t('transactionsPage.actions.filter')"
                    :min-width="520"
                    mobile-sheet
                    :count="filterCount"
                    :reset-disabled="!filtersActive"
                    @reset="resetFilters"
                >
                    <div class="pa-3 transactions-filters">
                        <AppSelect
                            v-model="filterAccountId"
                            :items="accountItems"
                            :label="t('transactionsPage.filters.account')"
                            hide-details
                        />
                        <AppSelect
                            v-model="filterCategoryId"
                            :items="categoryItems"
                            :label="t('transactionsPage.filters.category')"
                            hide-details
                        />
                        <AppSelect v-model="filterTierId" :items="tierItems" :label="t('transactionsPage.filters.tier')" hide-details />
                        <AppSelect
                            v-model="filterPaymentMethodId"
                            :items="paymentMethodItems"
                            :label="t('transactionsPage.filters.paymentMethod')"
                            searchable
                            :search-placeholder="t('transactionsPage.filters.paymentMethod')"
                            hide-details
                        />
                        <AppSelect
                            v-model="filterRecurrenceKey"
                            :items="recurrenceItems"
                            :label="t('transactionsPage.filters.recurrence')"
                            searchable
                            :search-placeholder="t('transactionsPage.filters.recurrence')"
                            hide-details
                        />
                        <AppSelect
                            v-model="filterBudgetId"
                            :items="budgetItems"
                            :label="t('transactionsPage.filters.budget')"
                            searchable
                            :search-placeholder="t('transactionsPage.filters.budget')"
                            hide-details
                        />
                    </div>
                </AppDropdownFilter>
                <AppDropdownFilter
                    :label="t('transactionsPage.filters.period')"
                    :icon="CalendarIcon"
                    :min-width="320"
                    :count="periodCount"
                    :reset-disabled="!periodCount"
                    @reset="resetPeriod"
                >
                    <div class="pa-3 d-flex flex-column ga-3">
                        <AppDatePicker
                            v-model="filterFrom"
                            :label="t('transactionsPage.filters.from')"
                            :placeholder="t('transactionsPage.filters.from')"
                            :max="filterTo || undefined"
                        />
                        <AppDatePicker
                            v-model="filterTo"
                            :label="t('transactionsPage.filters.to')"
                            :placeholder="t('transactionsPage.filters.to')"
                            :min="filterFrom || undefined"
                        />
                    </div>
                </AppDropdownFilter>
                <AppDropdownFilter
                    :label="t('transactionsPage.filters.amount')"
                    :icon="CoinIcon"
                    :min-width="320"
                    :count="amountCount"
                    :reset-disabled="!amountCount"
                    @reset="resetAmount"
                >
                    <div class="pa-3">
                        <AppAmountRangeFields v-model:min="filterMinAmount" v-model:max="filterMaxAmount" />
                    </div>
                </AppDropdownFilter>
            </template>
            <template #bar>
                <AppBoardSearch
                    :model-value="search.input.value"
                    :maxlength="TRANSACTION_SEARCH_MAX"
                    :placeholder="t('transactionsPage.searchPlaceholder')"
                    :search-label="t('transactionsPage.actions.search')"
                    :clear-label="t('transactionsPage.actions.clearSearch')"
                    @update:model-value="search.onInput"
                    @clear="search.clear"
                />
                <span v-if="visibleCount" class="su-toolbar__count app-board__count">
                    {{ t('transactionsPage.count', { count: visibleCount }, visibleCount) }}
                </span>
            </template>
            <template #actions>
                <button
                    type="button"
                    class="su-btn su-btn--ink"
                    :disabled="!visibleCount"
                    :aria-label="t('transactionsPage.actions.export')"
                    @click="timelineRef?.exportCsv()"
                >
                    <FileExportIcon :size="16" stroke-width="1.6" />
                    <span class="app-board__label">{{ t('transactionsPage.actions.export') }}</span>
                </button>
                <button
                    type="button"
                    class="su-btn su-btn--ink app-board__primary"
                    :disabled="!canCreate || store.acting"
                    :aria-label="t('transactionsPage.actions.create')"
                    @click="onCreate"
                >
                    <PlusIcon :size="16" stroke-width="1.6" />
                    <span class="app-board__label">{{ t('transactionsPage.actions.create') }}</span>
                </button>
            </template>

            <TransactionsTimeline ref="timelineRef" @sort="listSort = $event" />
        </AppBoard>
    </AppPageShell>
</template>

<style scoped>
.transactions-page__banner {
    flex: none;
    margin-bottom: 10px;
}

.transactions-filters {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    align-items: start;
}

.transactions-type-tabs {
    display: flex;
}

.transactions-type-trigger {
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 34px;
    margin: 0;
    padding: 0 14px;
    border: 0;
    border-radius: 17px;
    background: #fff;
    color: var(--ink);
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
    box-shadow:
        0 1px 2px rgba(16, 16, 20, 0.06),
        0 0 0 1px rgba(16, 16, 20, 0.05);
}

.transactions-type-trigger .su-tab__body {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.transactions-type-menu__chevron {
    flex: none;
    color: var(--ink-mute);
    transition: transform 0.28s var(--ease, ease);
}

.transactions-type-menu__chevron.is-open {
    transform: rotate(180deg);
}

@media (max-width: 767px) {
    .transactions-type-trigger {
        padding: 0 10px;
    }

    .transactions-filters {
        grid-template-columns: 1fr;
        gap: 10px;
        padding: 4px 4px 8px;
    }
}
</style>

<style>
.transactions-type-menu.su-menu {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: min(280px, calc(100vw - 24px));
    padding: 10px 8px 8px !important;
}

.transactions-type-menu__label {
    margin: 2px 10px 8px;
    font-size: 11px;
    font-weight: 650;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-muted);
}

.transactions-type-menu__item {
    --type-tint: rgb(var(--v-theme-primary));
    appearance: none;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    margin: 0;
    padding: 8px 10px;
    border: 0;
    border-radius: 16px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.2s var(--ease, ease);
}

.transactions-type-menu__item.is-depense {
    --type-tint: rgb(var(--amount-debit));
}

.transactions-type-menu__item.is-revenu {
    --type-tint: rgb(var(--amount-credit));
}

.transactions-type-menu__item:hover,
.transactions-type-menu__item:focus-visible {
    background: color-mix(in srgb, var(--type-tint) 10%, transparent);
    outline: none;
}

.transactions-type-menu__item.is-active {
    background: color-mix(in srgb, var(--type-tint) 14%, transparent);
}

.transactions-type-menu__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: 11px;
    background: color-mix(in srgb, var(--type-tint) 16%, var(--surface-raised));
    color: var(--type-tint);
}

.transactions-type-menu__name {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 0.9rem;
    font-weight: 620;
    letter-spacing: -0.02em;
    line-height: 1.2;
}

.transactions-type-menu__check {
    flex: none;
    color: var(--type-tint);
}

@media (max-width: 767px) {
    .transactions-filters .app-select__legend {
        font-size: 11px;
    }

    .transactions-filters .app-select__control,
    .transactions-filters .app-select__ghost,
    .transactions-filters .app-select__input {
        font-size: 0.75rem;
    }
}
</style>
