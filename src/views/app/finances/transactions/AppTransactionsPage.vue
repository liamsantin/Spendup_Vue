<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { CheckIcon, FileExportIcon, PlusIcon, SearchIcon, XIcon } from 'vue-tabler-icons';
import { useBoardSearch } from '@/components/shared/board/useBoardSearch';
import { useCreateFromQuery } from '@/components/shared/board/useCreateFromQuery';
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
    TRANSACTION_SORTS,
    TRANSACTION_TYPES,
    canWriteTransactions,
    formatOperationDate,
    isTransactionSort,
    parseTransactionSort,
    resolveTransactionAmountDisplay,
    useTransactionsStore
} from '@/features/transactions';
import type { TransactionSort, TransactionType } from '@/features/transactions';
import type { TransactionsSummary } from '@/features/transactions/components/TransactionsTimeline.vue';
import { amountSignOf } from '@/features/transactions/composables/useTransactionRowDisplay';
import { useAccountsStore } from '@/features/accounts';
import { budgetLinkedTransactionsQuery, parseBudgetTransactionScope, useBudgetsStore } from '@/features/budgets';
import BudgetEnvelopeBanner from '@/features/budgets/components/BudgetEnvelopeBanner.vue';
import { categorySelectItems, useCategoriesStore } from '@/features/categories';
import { useTagsStore } from '@/features/tags/stores/tags-store';
import { PAYMENT_METHOD_PAGE_SIZE_MAX, usePaymentMethodsStore } from '@/features/payment-methods';
import { RECURRING_PAGE_SIZE_MAX, useRecurringPaymentsStore } from '@/features/recurring-payments';
import { tierSelectItems, useTiersStore } from '@/features/tiers';
const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useTransactionsStore();
const accountsStore = useAccountsStore();
const budgetsStore = useBudgetsStore();
const categoriesStore = useCategoriesStore();
const tagsStore = useTagsStore();
const tiersStore = useTiersStore();
const paymentMethodsStore = usePaymentMethodsStore();
const recurringStore = useRecurringPaymentsStore();
const timelineRef = ref<{
    openCreate: () => void;
    exportCsv: () => void;
    visibleCount: number;
    summary: TransactionsSummary | null;
} | null>(null);
const visibleCount = computed(() => timelineRef.value?.visibleCount ?? 0);
const summary = computed(() => timelineRef.value?.summary ?? null);

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

const sortMenuOpen = ref(false);

const canCreate = computed(() => accountsStore.accounts.some((a) => canWriteTransactions(a)));

const accountItems = computed(() => [
    { title: t('transactionsPage.filters.allAccounts'), value: '' },
    ...accountsStore.accounts.map((a) => ({ title: a.name, value: a.publicId }))
]);

const categoryItems = computed(() =>
    categorySelectItems(categoriesStore.items, { noneTitle: t('transactionsPage.filters.allCategories') })
);

const tagItems = computed(() => {
    const items = [
        { title: t('transactionsPage.filters.allTags'), value: '' },
        ...tagsStore.items.map((tag) => ({ title: tag.name, value: tag.publicId }))
    ];
    const selected = queryString('tag');
    const selectedName = selected ? tagsStore.findByPublicId(selected)?.name : null;
    if (selected && selectedName && !items.some((item) => item.value === selected)) {
        items.push({ title: selectedName, value: selected });
    }
    return items;
});

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

const filterTagId = computed({
    get: () => queryString('tag'),
    set: (value: string) => patchQuery({ tag: value || undefined })
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
    const tag = 'tag' in patch ? patch.tag : queryString('tag') || undefined;
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
    if (tag) next.tag = tag;
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
        tag: undefined,
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
            filterTagId.value,
            filterTierId.value,
            filterPaymentMethodId.value,
            filterRecurrenceKey.value,
            filterBudgetId.value
        ].filter(Boolean).length
);

const filtersActive = computed(() => filterCount.value > 0);

const periodCount = computed(() => [filterFrom.value, filterTo.value].filter(Boolean).length);

const amountCount = computed(() => [filterMinAmount.value, filterMaxAmount.value].filter(Boolean).length);

/** Onglets de type : Toutes / Entrées / Sorties / Virements. */
const typeTabs = computed<{ value: TransactionType | ''; label: string }[]>(() => [
    { value: '', label: t('transactionsPage.typeTabs.all') },
    ...TRANSACTION_TYPES.map((type) => ({ value: type, label: t(`transactionsPage.typeTabs.${type}`) }))
]);

/** Libellé de bouton discret « Période · Octobre » : le libellé seul si aucune valeur. */
function withValue(label: string, value: string | null): string {
    return value ? `${label} · ${value}` : label;
}

const filterLabel = computed(() => withValue(t('transactionsPage.actions.filter'), filterCount.value ? String(filterCount.value) : null));

const periodLabel = computed(() => {
    const from = filterFrom.value;
    const to = filterTo.value;
    let value: string | null = null;
    if (from && to) {
        value = t('transactionsPage.envelope.window', {
            start: formatOperationDate(from, locale.value),
            end: formatOperationDate(to, locale.value)
        });
    } else if (from) {
        value = `${t('transactionsPage.filters.from')} ${formatOperationDate(from, locale.value)}`;
    } else if (to) {
        value = `${t('transactionsPage.filters.to')} ${formatOperationDate(to, locale.value)}`;
    }
    return withValue(t('transactionsPage.filters.period'), value);
});

const amountLabel = computed(() => {
    const min = filterMinAmount.value;
    const max = filterMaxAmount.value;
    let value: string | null = null;
    if (min && max) value = t('transactionsPage.envelope.window', { start: min, end: max });
    else if (min) value = `≥ ${min}`;
    else if (max) value = `≤ ${max}`;
    return withValue(t('transactionsPage.filters.amount'), value);
});

const sortLabel = computed(() =>
    withValue(
        t('transactionsPage.actions.sort'),
        listSort.value === TRANSACTION_SORT_DEFAULT ? null : t(`transactionsPage.sort.${listSort.value}`)
    )
);

function selectSort(value: TransactionSort) {
    listSort.value = value;
    sortMenuOpen.value = false;
}

/** Sous-titre « Octobre 2026 · 42 opérations » (mois seulement si toutes les opérations visibles le partagent). */
const subtitle = computed(() => {
    const data = summary.value;
    if (!data) return undefined;
    const operations = t('transactionsPage.operations', { count: data.count }, data.count);
    return data.monthLabel ? `${data.monthLabel} · ${operations}` : operations;
});

/** Chiffres clés calculés sur la liste chargée : Entrées (+ bleu), Sorties (− noir), Solde net (bleu si positif). */
const figures = computed(() => {
    const data = summary.value;
    if (!data) return null;
    const format = (value: number) => resolveTransactionAmountDisplay(Math.abs(value), data.currency, locale.value).text;
    const operations = (count: number) => t('transactionsPage.operations', { count }, count);
    return [
        {
            key: 'inflow',
            label: t('transactionsPage.figures.inflow'),
            num: `${amountSignOf(data.inflow)}${format(data.inflow)}`,
            tone: data.inflow > 0 ? 'is-credit' : '',
            note: operations(data.inflowCount)
        },
        {
            key: 'outflow',
            label: t('transactionsPage.figures.outflow'),
            num: `${amountSignOf(-data.outflow)}${format(data.outflow)}`,
            tone: '',
            note: operations(data.outflowCount)
        },
        {
            key: 'net',
            label: t('transactionsPage.figures.net'),
            num: `${amountSignOf(data.net)}${format(data.net)}`,
            tone: data.net > 0 ? 'is-credit' : '',
            note: operations(data.count)
        }
    ];
});

const unsubscribeTagDeleted = tagsStore.subscribeToDeleted((publicId) => {
    if (queryString('tag') !== publicId) return;
    patchQuery({ tag: undefined });
});

onMounted(() => {
    void recurringStore.loadExpenses({ pageSize: RECURRING_PAGE_SIZE_MAX }).catch(() => undefined);
    void recurringStore.loadIncomes({ pageSize: RECURRING_PAGE_SIZE_MAX }).catch(() => undefined);
    void budgetsStore.loadList().catch(() => undefined);
    void paymentMethodsStore.loadList({ pageSize: PAYMENT_METHOD_PAGE_SIZE_MAX }).catch(() => undefined);
    void tagsStore.loadList().catch(() => undefined);
});

onUnmounted(() => {
    unsubscribeTagDeleted();
});

useCreateFromQuery(onCreate, () => canCreate.value && !store.acting);

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
    <AppPageShell class="transactions-page" :title="pageTitle" :subtitle="subtitle">
        <template #actions>
            <button
                type="button"
                class="su-btn"
                :disabled="!visibleCount"
                :aria-label="t('transactionsPage.actions.export')"
                @click="timelineRef?.exportCsv()"
            >
                <FileExportIcon :size="16" stroke-width="1.6" />
                {{ t('transactionsPage.actions.export') }}
            </button>
            <button
                type="button"
                class="su-btn su-btn--ink"
                :disabled="!canCreate || store.acting"
                :aria-label="t('transactionsPage.actions.create')"
                @click="onCreate"
            >
                <PlusIcon :size="16" stroke-width="1.6" />
                {{ t('transactionsPage.actions.create') }}
            </button>
        </template>

        <template #toolbar>
            <div class="transactions-toolbar">
                <nav v-if="!filterBudgetId" class="su-tabs transactions-toolbar__tabs" :aria-label="t('transactionsPage.filters.type')">
                    <button
                        v-for="tab in typeTabs"
                        :key="tab.value || 'all'"
                        type="button"
                        class="su-tab"
                        :class="{ 'is-active': filterType === tab.value }"
                        :aria-pressed="filterType === tab.value"
                        @click="filterType = tab.value"
                    >
                        {{ tab.label }}
                    </button>
                </nav>

                <label class="su-search transactions-toolbar__search">
                    <SearchIcon class="su-search__icon" :size="18" stroke-width="1.8" />
                    <input
                        class="su-search__input"
                        type="search"
                        :value="search.input.value"
                        :maxlength="TRANSACTION_SEARCH_MAX"
                        :placeholder="t('transactionsPage.searchPlaceholder')"
                        :aria-label="t('transactionsPage.actions.search')"
                        autocomplete="off"
                        @input="search.onInput(($event.target as HTMLInputElement).value)"
                    />
                    <button
                        v-if="search.input.value"
                        type="button"
                        class="su-search__orb"
                        :aria-label="t('transactionsPage.actions.clearSearch')"
                        @click="search.clear"
                    >
                        <XIcon :size="16" stroke-width="1.8" />
                    </button>
                </label>

                <div class="transactions-toolbar__filters">
                    <AppDropdownFilter
                        :label="filterLabel"
                        :min-width="520"
                        mobile-sheet
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
                            <AppSelect v-model="filterTagId" :items="tagItems" :label="t('transactionsPage.filters.tag')" hide-details />
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
                    <AppDropdownFilter :label="periodLabel" :min-width="320" :reset-disabled="!periodCount" @reset="resetPeriod">
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
                    <AppDropdownFilter :label="amountLabel" :min-width="320" :reset-disabled="!amountCount" @reset="resetAmount">
                        <div class="pa-3">
                            <AppAmountRangeFields v-model:min="filterMinAmount" v-model:max="filterMaxAmount" />
                        </div>
                    </AppDropdownFilter>
                    <v-menu v-model="sortMenuOpen" location="bottom end" :offset="4">
                        <template #activator="{ props: menuProps }">
                            <button
                                type="button"
                                class="su-btn su-btn--ghost"
                                v-bind="menuProps"
                                :aria-expanded="sortMenuOpen"
                                :aria-haspopup="true"
                            >
                                {{ sortLabel }}
                            </button>
                        </template>
                        <v-sheet
                            elevation="0"
                            class="su-menu transactions-sort-menu"
                            role="listbox"
                            :aria-label="t('transactionsPage.actions.sort')"
                        >
                            <button
                                v-for="sort in TRANSACTION_SORTS"
                                :key="sort"
                                type="button"
                                class="transactions-sort-menu__item"
                                :class="{ 'is-active': listSort === sort }"
                                role="option"
                                :aria-selected="listSort === sort"
                                @click="selectSort(sort)"
                            >
                                <span>{{ t(`transactionsPage.sort.${sort}`) }}</span>
                                <CheckIcon v-if="listSort === sort" :size="16" stroke-width="2" />
                            </button>
                        </v-sheet>
                    </v-menu>
                </div>
            </div>
        </template>

        <BudgetEnvelopeBanner
            v-if="envelopeBudget"
            class="transactions-page__banner"
            :budget="envelopeBudget"
            :scope="envelopeScope"
            @update:scope="envelopeScope = $event"
            @dismiss="clearBudgetEnvelope"
        />

        <div v-if="figures" class="su-figs transactions-page__figs">
            <div v-for="figure in figures" :key="figure.key" class="su-fig">
                <p class="su-fig__label">{{ figure.label }}</p>
                <p class="su-fig__num" :class="figure.tone">{{ figure.num }}</p>
                <p class="su-fig__note">{{ figure.note }}</p>
            </div>
        </div>

        <TransactionsTimeline ref="timelineRef" />
    </AppPageShell>
</template>

<style scoped>
/* ── enveloppe budget : bloc à filet, sans boîte ───────── */
.transactions-page .transactions-page__banner {
    margin: 0 0 32px;
    padding: 12px 0 16px;
    border: 0;
    border-top: 1px solid var(--line);
    border-radius: 0;
    background: transparent;
}

.transactions-page__banner :deep(.budget-envelope__icon) {
    width: 36px;
    height: 36px;
    border-radius: 0;
    background: var(--t-blue-bg);
    color: var(--t-blue-ink);
}

/* ── chiffres clés ─────────────────────────────────────── */
.transactions-page__figs {
    margin: 0 0 40px;
}

.transactions-page__figs .su-fig__num.is-credit {
    color: var(--blue-ink);
}

/* ── barre d'outils : onglets texte · recherche soulignée · filtres discrets ── */
/* barre de filtres dans l'en-tête de page : reste fixe pendant le défilement de la liste */
.transactions-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px 22px;
    width: 100%;
    min-width: 0;
}

.transactions-toolbar__tabs {
    flex: none;
    margin-left: 0;
}

.transactions-toolbar__search {
    flex: 1 1 220px;
    width: auto;
    max-width: 520px;
    margin: 0;
}

.transactions-toolbar__filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-left: auto;
    flex: none;
}

/* déclencheurs des menus de filtre : bouton discret, texte gris, sans icône */
.transactions-toolbar__filters :deep(.su-btn) {
    border-color: var(--line);
    color: var(--gray);
    font-weight: 400;
}

.transactions-toolbar__filters :deep(.su-btn:hover:not(:disabled)),
.transactions-toolbar__filters :deep(.su-btn[aria-expanded='true']) {
    border-color: var(--ink);
    color: var(--ink);
    background: transparent;
}

.transactions-toolbar__filters :deep(.su-btn > svg) {
    display: none;
}

.transactions-toolbar__filters :deep(.su-btn__count) {
    display: none;
}

.transactions-filters {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    align-items: start;
}

/* ── menu de tri : items 40 px, actif en 700 avec coche ── */
.transactions-sort-menu {
    display: flex;
    flex-direction: column;
    width: min(260px, calc(100vw - 24px));
}

.transactions-sort-menu__item {
    appearance: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    min-height: 40px;
    padding: 0 10px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
}

.transactions-sort-menu__item + .transactions-sort-menu__item {
    border-top: 1px solid var(--line);
}

.transactions-sort-menu__item:hover,
.transactions-sort-menu__item:focus-visible {
    background: var(--soft);
    outline: none;
}

.transactions-sort-menu__item.is-active {
    font-weight: 700;
}

.transactions-sort-menu__item > svg {
    flex: none;
    color: var(--blue-ink);
}

@media (max-width: 767px) {
    .transactions-page .transactions-page__banner {
        margin-bottom: 24px;
    }

    .transactions-page__figs {
        margin-bottom: 28px;
    }

    .transactions-toolbar {
        gap: 6px;
    }

    .transactions-toolbar .su-tab {
        height: 34px;
    }

    .transactions-toolbar .transactions-toolbar__search {
        height: 36px;
    }

    .transactions-toolbar__filters :deep(.su-btn) {
        height: 32px;
        min-height: 32px;
        padding: 0 10px;
        font-size: 13px;
    }

    .transactions-toolbar__tabs {
        flex: 1 1 100%;
    }

    .transactions-toolbar .transactions-toolbar__search {
        flex: 1 1 100%;
        max-width: 100%;
    }

    /* filtres sur une ligne défilante */
    .transactions-toolbar__filters {
        flex: 1 1 100%;
        flex-wrap: nowrap;
        margin-left: 0;
        overflow-x: auto;
        scrollbar-width: none;
    }

    .transactions-toolbar__filters::-webkit-scrollbar {
        display: none;
    }

    .transactions-toolbar__filters > * {
        flex: none;
    }

    .transactions-filters {
        grid-template-columns: 1fr;
        gap: 10px;
        padding: 4px 4px 8px;
    }
}
</style>

<style>
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
