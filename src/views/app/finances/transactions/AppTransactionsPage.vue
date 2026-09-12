<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { PlusIcon, SearchIcon, XIcon, ArrowsSortIcon } from 'vue-tabler-icons';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppAmountRangeFields from '@/components/shared/dropdown-filter/AppAmountRangeFields.vue';
import AppSortChoices from '@/components/shared/dropdown-filter/AppSortChoices.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { serializeAmountFilter } from '@/components/shared/dropdown-filter/amount-range';
import {
    TransactionsTimeline,
    TRANSACTION_SEARCH_MAX,
    TRANSACTION_SORTS,
    TRANSACTION_SORT_DEFAULT,
    TRANSACTION_TYPES,
    canWriteTransactions,
    isTransactionSort,
    parseTransactionSort,
    useTransactionsStore
} from '@/features/transactions';
import type { TransactionType } from '@/features/transactions';
import { useAccountsStore } from '@/features/accounts';
import { categorySelectItems, useCategoriesStore } from '@/features/categories';
import { RECURRING_PAGE_SIZE_MAX, useRecurringPaymentsStore } from '@/features/recurring-payments';
import { tierSelectItems, useTiersStore } from '@/features/tiers';

const SEARCH_DEBOUNCE_MS = 300;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useTransactionsStore();
const accountsStore = useAccountsStore();
const categoriesStore = useCategoriesStore();
const tiersStore = useTiersStore();
const recurringStore = useRecurringPaymentsStore();
const timelineRef = ref<{ openCreate: () => void } | null>(null);

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

const searchInput = ref(queryString('q').slice(0, TRANSACTION_SEARCH_MAX));
let searchTimer: ReturnType<typeof setTimeout> | null = null;

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

const pageTitle = computed(() => {
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
    const recurringExpensePublicId =
        'recurringExpensePublicId' in patch ? patch.recurringExpensePublicId : queryString('recurringExpensePublicId') || undefined;
    const recurringIncomePublicId =
        'recurringIncomePublicId' in patch ? patch.recurringIncomePublicId : queryString('recurringIncomePublicId') || undefined;
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
    if (recurringExpensePublicId) next.recurringExpensePublicId = recurringExpensePublicId;
    if (recurringIncomePublicId) next.recurringIncomePublicId = recurringIncomePublicId;
    if (sort && isTransactionSort(sort) && sort !== TRANSACTION_SORT_DEFAULT) next.sort = sort;
    if (minAmount) next.minAmount = minAmount;
    if (maxAmount) next.maxAmount = maxAmount;
    void router.replace({ path: '/app/finances/transactions', query: next });
}

function onSearchInput(value: string) {
    searchInput.value = value.slice(0, TRANSACTION_SEARCH_MAX);
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        searchTimer = null;
        patchQuery({ q: searchInput.value.trim() || undefined });
    }, SEARCH_DEBOUNCE_MS);
}

function clearSearch() {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = null;
    searchInput.value = '';
    patchQuery({ q: undefined });
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
        recurringExpensePublicId: undefined,
        recurringIncomePublicId: undefined,
        from: undefined,
        to: undefined,
        minAmount: undefined,
        maxAmount: undefined
    });
}

const filtersActive = computed(
    () =>
        !!(
            filterAccountId.value ||
            filterCategoryId.value ||
            filterTierId.value ||
            filterRecurrenceKey.value ||
            filterFrom.value ||
            filterTo.value ||
            filterMinAmount.value ||
            filterMaxAmount.value
        )
);

const filterCount = computed(
    () =>
        [
            filterAccountId.value,
            filterCategoryId.value,
            filterTierId.value,
            filterRecurrenceKey.value,
            filterFrom.value,
            filterTo.value,
            filterMinAmount.value,
            filterMaxAmount.value
        ].filter(Boolean).length
);

const sortCount = computed(() => (listSort.value === TRANSACTION_SORT_DEFAULT ? 0 : 1));

onMounted(() => {
    void recurringStore.loadExpenses({ pageSize: RECURRING_PAGE_SIZE_MAX }).catch(() => undefined);
    void recurringStore.loadIncomes({ pageSize: RECURRING_PAGE_SIZE_MAX }).catch(() => undefined);
});

onUnmounted(() => {
    if (searchTimer) clearTimeout(searchTimer);
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
    () => queryString('q'),
    (value) => {
        if (searchTimer) return;
        const next = value.slice(0, TRANSACTION_SEARCH_MAX);
        if (next !== searchInput.value.trim() && next !== searchInput.value) {
            searchInput.value = next;
        }
    }
);
</script>

<template>
    <AppPageShell :title="pageTitle" :subtitle="t('transactionsPage.subtitle')">
        <template #tabs>
            <nav class="su-tabs" :aria-label="t('transactionsPage.filters.type')">
                <button type="button" class="su-tab" :class="{ 'is-active': !filterType }" @click="filterType = ''">
                    {{ t('transactionsPage.filters.allTypes') }}
                </button>
                <button
                    v-for="type in TRANSACTION_TYPES"
                    :key="type"
                    type="button"
                    class="su-tab"
                    :class="{ 'is-active': filterType === type }"
                    @click="filterType = type"
                >
                    {{ t(`transactionsPage.types.${type}`) }}
                </button>
            </nav>
        </template>

        <template #toolbar>
            <label class="su-search su-search--discover">
                <SearchIcon class="su-search__icon" :size="18" stroke-width="1.8" />
                <input
                    class="su-search__input"
                    type="search"
                    :value="searchInput"
                    :maxlength="TRANSACTION_SEARCH_MAX"
                    :placeholder="t('transactionsPage.searchPlaceholder')"
                    :aria-label="t('transactionsPage.searchPlaceholder')"
                    autocomplete="off"
                    @input="onSearchInput(($event.target as HTMLInputElement).value)"
                />
                <button
                    v-if="searchInput"
                    type="button"
                    class="su-search__orb"
                    :aria-label="t('transactionsPage.actions.clearSearch')"
                    @click="clearSearch"
                >
                    <XIcon :size="16" stroke-width="1.8" />
                </button>
            </label>
            <div class="su-toolbar__actions">
                <AppDropdownFilter
                    :label="t('transactionsPage.actions.sort')"
                    :icon="ArrowsSortIcon"
                    :min-width="260"
                    close-on-content-click
                    :count="sortCount"
                    :reset-disabled="listSort === TRANSACTION_SORT_DEFAULT"
                    @reset="listSort = TRANSACTION_SORT_DEFAULT"
                >
                    <AppSortChoices
                        v-model="listSort"
                        :items="TRANSACTION_SORTS"
                        :label-for="(value) => t(`transactionsPage.sort.${value}`)"
                    />
                </AppDropdownFilter>
                <AppDropdownFilter
                    :label="t('transactionsPage.actions.filter')"
                    :min-width="300"
                    :count="filterCount"
                    :reset-disabled="!filtersActive"
                    @reset="resetFilters"
                >
                    <div class="pa-3 d-flex flex-column ga-3">
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
                            v-model="filterRecurrenceKey"
                            :items="recurrenceItems"
                            :label="t('transactionsPage.filters.recurrence')"
                            searchable
                            :search-placeholder="t('transactionsPage.filters.recurrence')"
                            hide-details
                        />
                        <v-divider class="my-1" />
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
                        <AppAmountRangeFields v-model:min="filterMinAmount" v-model:max="filterMaxAmount" />
                    </div>
                </AppDropdownFilter>
                <button type="button" class="su-btn su-btn--ink" :disabled="!canCreate || store.acting" @click="onCreate">
                    <PlusIcon :size="16" stroke-width="1.6" />
                    {{ t('transactionsPage.actions.create') }}
                </button>
            </div>
        </template>

        <TransactionsTimeline ref="timelineRef" />
    </AppPageShell>
</template>
