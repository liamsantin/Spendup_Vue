<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { ArrowsSortIcon, BuildingBankIcon, CoinIcon, FileExportIcon } from 'vue-tabler-icons';
import AppChoiceList from '@/components/shared/dropdown-filter/AppChoiceList.vue';
import AppBoard from '@/components/shared/board/AppBoard.vue';
import AppBoardSearch from '@/components/shared/board/AppBoardSearch.vue';
import { useBoardSearch } from '@/components/shared/board/useBoardSearch';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppAmountRangeFields from '@/components/shared/dropdown-filter/AppAmountRangeFields.vue';
import AppSortChoices from '@/components/shared/dropdown-filter/AppSortChoices.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import RecurringCreateMenu from '@/features/recurring-payments/components/RecurringCreateMenu.vue';
import RecurringTemplatesDirectory from '@/features/recurring-payments/components/RecurringTemplatesDirectory.vue';
import RecurringUpcomingPanel from '@/features/recurring-payments/components/RecurringUpcomingPanel.vue';
import {
    RECURRING_SEARCH_MAX,
    TEMPLATE_SORT_DEFAULT,
    UPCOMING_DUE_SORT_DEFAULT,
    UPCOMING_DUE_SORTS,
    parseTemplateSort,
    parseUpcomingDueSort
} from '@/features/recurring-payments/format';
import { recurrencesPathForTab, recurrencesTabFromPath, type RecurrenceTab } from '@/features/recurring-payments/paths';
import { serializeAmountFilter } from '@/components/shared/dropdown-filter/amount-range';
import { canWriteRecurringOnAccount } from '@/features/recurring-payments/rights';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import type { RecurringKind } from '@/features/recurring-payments/types';
import type { RecurringTypePick } from '@/features/recurring-payments/components/forms/RecurringTypeChoice.vue';
import { useAccountsStore } from '@/features/accounts';

const TABS = ['all', 'expenses', 'incomes', 'upcoming'] as const;
type DueSettlement = 'all' | 'planned' | 'settled';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useRecurringPaymentsStore();
const accountsStore = useAccountsStore();
const directoryRef = ref<{
    openCreate: (kind?: RecurringKind | null, type?: RecurringTypePick['type'] | null) => void;
    exportCsv: () => void;
    visibleCount: number;
} | null>(null);
const upcomingRef = ref<{ exportCsv: () => void; visibleCount: number } | null>(null);
const showInactive = ref(true);
const { width: viewportWidth } = useDisplay();
const compactNotch = computed(() => viewportWidth.value < 768);

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

function parseSettlement(raw: string): DueSettlement {
    return raw === 'planned' || raw === 'settled' ? raw : 'all';
}

function parseKind(raw: string): RecurringKind | '' {
    return raw === 'expense' || raw === 'income' ? raw : '';
}

const tab = computed(() => recurrencesTabFromPath(route.path));

const directoryKind = computed<RecurringKind | null>(() => {
    if (tab.value === 'expenses') return 'expense';
    if (tab.value === 'incomes') return 'income';
    return null;
});

const pageTitle = computed(() => {
    if (tab.value === 'expenses') return t('nav.items.recurrencesExpenses');
    if (tab.value === 'incomes') return t('nav.items.recurrencesIncomes');
    if (tab.value === 'upcoming') return t('nav.items.recurrencesUpcoming');
    return t('recurrencesPage.title');
});

const canCreate = computed(() => accountsStore.accounts.some((item) => canWriteRecurringOnAccount(item)));

const accountItems = computed(() => [
    { title: t('recurrencesPage.filters.allAccounts'), value: '' },
    ...accountsStore.accounts.map((account) => ({ title: account.name, value: account.publicId }))
]);

const selectedAccountName = computed(
    () => accountsStore.accounts.find((account) => account.publicId === filterAccountId.value)?.name ?? null
);

const kindItems = computed(() => [
    { title: t('recurrencesPage.filters.allKinds'), value: '' },
    { title: t('recurrencesPage.kinds.expense'), value: 'expense' },
    { title: t('recurrencesPage.kinds.income'), value: 'income' }
]);

const dueSettlementItems = computed(() => [
    { title: t('recurrencesPage.filters.allDueStates'), value: 'all' },
    { title: t('recurrencesPage.filters.planned'), value: 'planned' },
    { title: t('recurrencesPage.filters.settled'), value: 'settled' }
]);

function patchQuery(patch: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    const account = 'account' in patch ? patch.account : queryString('account') || undefined;
    const minAmount = 'minAmount' in patch ? patch.minAmount : queryString('minAmount') || undefined;
    const maxAmount = 'maxAmount' in patch ? patch.maxAmount : queryString('maxAmount') || undefined;
    const q = 'q' in patch ? patch.q : queryString('q') || undefined;
    const sort = 'sort' in patch ? patch.sort : queryString('sort') || undefined;
    if (account) next.account = account;
    if (minAmount) next.minAmount = minAmount;
    if (maxAmount) next.maxAmount = maxAmount;
    if (q) next.q = q.slice(0, RECURRING_SEARCH_MAX);
    if (tab.value === 'upcoming') {
        const kind = 'kind' in patch ? patch.kind : queryString('kind') || undefined;
        const due = 'due' in patch ? patch.due : queryString('due') || undefined;
        if (kind === 'expense' || kind === 'income') next.kind = kind;
        if (due === 'planned' || due === 'settled') next.due = due;
        if (sort && sort !== UPCOMING_DUE_SORT_DEFAULT && parseUpcomingDueSort(sort) === sort) next.sort = sort;
    } else if (sort && sort !== TEMPLATE_SORT_DEFAULT && parseTemplateSort(sort) === sort) {
        next.sort = sort;
    }
    void router.replace({ path: route.path, query: next });
}

const filterAccountId = computed({
    get: () => queryString('account'),
    set: (value: string) => patchQuery({ account: value || undefined })
});

const filterKind = computed({
    get: () => parseKind(queryString('kind')),
    set: (value: string) => patchQuery({ kind: parseKind(value) || undefined })
});

const dueSettlement = computed({
    get: () => parseSettlement(queryString('due')),
    set: (value: string) => patchQuery({ due: parseSettlement(value) === 'all' ? undefined : value })
});

const listSort = computed({
    get: () => parseUpcomingDueSort(queryString('sort')),
    set: (value: string) => patchQuery({ sort: parseUpcomingDueSort(value) === UPCOMING_DUE_SORT_DEFAULT ? undefined : value })
});

const templateSort = computed({
    get: () => parseTemplateSort(queryString('sort')),
    set: (value: string) => patchQuery({ sort: parseTemplateSort(value) === TEMPLATE_SORT_DEFAULT ? undefined : value })
});

const search = useBoardSearch({
    read: () => queryString('q'),
    commit: (value) => patchQuery({ q: value }),
    max: RECURRING_SEARCH_MAX
});

const visibleCount = computed(() => (tab.value === 'upcoming' ? upcomingRef.value?.visibleCount : directoryRef.value?.visibleCount) ?? 0);

function exportCsv() {
    if (tab.value === 'upcoming') upcomingRef.value?.exportCsv();
    else directoryRef.value?.exportCsv();
}

const filterMinAmount = computed({
    get: () => queryString('minAmount'),
    set: (value: string) => patchQuery({ minAmount: serializeAmountFilter(value) })
});

const filterMaxAmount = computed({
    get: () => queryString('maxAmount'),
    set: (value: string) => patchQuery({ maxAmount: serializeAmountFilter(value) })
});

watch(
    () => [route.path, queryString('tab')] as const,
    () => {
        const raw = queryString('tab');
        if (!(TABS as readonly string[]).includes(raw)) return;
        const target = recurrencesPathForTab(raw as RecurrenceTab);
        const nextQuery = { ...route.query };
        delete nextQuery.tab;
        void router.replace({ path: target, query: nextQuery });
    },
    { immediate: true }
);

watch(tab, (current, previous) => {
    if (!previous || current === previous || current === 'upcoming') return;
    if (!queryString('kind') && !queryString('due') && !queryString('sort')) return;
    patchQuery({});
});

function onCreate(kind?: RecurringKind) {
    if (!canCreate.value || store.acting) return;
    directoryRef.value?.openCreate(kind ?? null);
}

function onPick(pick: RecurringTypePick) {
    if (!canCreate.value || store.acting) return;
    directoryRef.value?.openCreate(pick.kind, pick.type);
}

function resetUpcomingFilters() {
    patchQuery({ account: undefined, kind: undefined, due: undefined, minAmount: undefined, maxAmount: undefined });
}

const activeOnly = computed({
    get: () => !showInactive.value,
    set: (value: boolean) => {
        showInactive.value = !value;
    }
});

const upcomingFiltersActive = computed(
    () => !!(filterAccountId.value || filterKind.value || dueSettlement.value !== 'all' || filterMinAmount.value || filterMaxAmount.value)
);
const filterCount = computed(
    () =>
        [
            filterAccountId.value,
            filterKind.value,
            dueSettlement.value !== 'all' ? 'due' : '',
            filterMinAmount.value,
            filterMaxAmount.value
        ].filter(Boolean).length
);
const amountCount = computed(() => [filterMinAmount.value, filterMaxAmount.value].filter(Boolean).length);
const sortCount = computed(() => (listSort.value === UPCOMING_DUE_SORT_DEFAULT ? 0 : 1));
</script>

<template>
    <AppPageShell :title="pageTitle" :body-scroll="false">
        <AppBoard>
            <template #filters>
                <template v-if="tab === 'upcoming'">
                    <AppDropdownFilter
                        :label="t('recurrencesPage.actions.sort')"
                        :icon="ArrowsSortIcon"
                        :min-width="280"
                        close-on-content-click
                        :count="sortCount"
                        :reset-disabled="listSort === UPCOMING_DUE_SORT_DEFAULT"
                        @reset="listSort = UPCOMING_DUE_SORT_DEFAULT"
                    >
                        <AppSortChoices
                            v-model="listSort"
                            :items="UPCOMING_DUE_SORTS"
                            :label-for="(value) => t(`recurrencesPage.sort.${value}`)"
                        />
                    </AppDropdownFilter>
                    <AppDropdownFilter
                        :label="t('recurrencesPage.actions.filter')"
                        :min-width="300"
                        :count="filterCount"
                        :reset-disabled="!upcomingFiltersActive"
                        @reset="resetUpcomingFilters"
                    >
                        <div class="pa-3 d-flex flex-column ga-3">
                            <AppSelect
                                v-model="filterAccountId"
                                :items="accountItems"
                                :label="t('recurrencesPage.filters.account')"
                                hide-details
                            />
                            <AppSelect v-model="filterKind" :items="kindItems" :label="t('recurrencesPage.filters.kind')" hide-details />
                            <AppSelect
                                v-model="dueSettlement"
                                :items="dueSettlementItems"
                                :label="t('recurrencesPage.filters.dueState')"
                                hide-details
                            />
                            <AppAmountRangeFields v-model:min="filterMinAmount" v-model:max="filterMaxAmount" />
                        </div>
                    </AppDropdownFilter>
                </template>
                <template v-else>
                    <AppDropdownFilter
                        :label="t('recurrencesPage.filters.amount')"
                        :icon="CoinIcon"
                        :min-width="320"
                        :count="amountCount"
                        :reset-disabled="!amountCount"
                        @reset="patchQuery({ minAmount: undefined, maxAmount: undefined })"
                    >
                        <div class="pa-3">
                            <AppAmountRangeFields v-model:min="filterMinAmount" v-model:max="filterMaxAmount" />
                        </div>
                    </AppDropdownFilter>
                    <AppDropdownFilter
                        :label="selectedAccountName || t('recurrencesPage.filters.account')"
                        :icon="BuildingBankIcon"
                        :min-width="260"
                        :count="filterAccountId ? 1 : 0"
                        :reset-disabled="!filterAccountId"
                        close-on-content-click
                        @reset="filterAccountId = ''"
                    >
                        <AppChoiceList v-model="filterAccountId" :items="accountItems" :label="t('recurrencesPage.filters.account')" />
                    </AppDropdownFilter>
                    <label class="recurrences-active-toggle" :class="{ 'is-active': activeOnly }">
                        <AppSwitch v-model="activeOnly" :aria-label="t('recurrencesPage.filters.activeOnly')" />
                        <span>{{ t('recurrencesPage.filters.activeOnly') }}</span>
                    </label>
                </template>
            </template>
            <template #bar>
                <AppBoardSearch
                    :model-value="search.input.value"
                    :maxlength="RECURRING_SEARCH_MAX"
                    :placeholder="t('recurrencesPage.searchPlaceholder')"
                    :search-label="t('recurrencesPage.actions.search')"
                    :clear-label="t('recurrencesPage.actions.clearSearch')"
                    @update:model-value="search.onInput"
                    @clear="search.clear"
                />
                <span v-if="visibleCount" class="su-toolbar__count app-board__count">
                    {{
                        tab === 'upcoming'
                            ? t('recurrencesPage.dueCount', { count: visibleCount }, visibleCount)
                            : t('recurrencesPage.count', { count: visibleCount }, visibleCount)
                    }}
                </span>
            </template>
            <template #actions>
                <button
                    type="button"
                    class="su-btn su-btn--ink"
                    :disabled="!visibleCount"
                    :aria-label="t('recurrencesPage.actions.export')"
                    @click="exportCsv"
                >
                    <FileExportIcon :size="16" stroke-width="1.6" />
                    <span class="app-board__label">{{ t('recurrencesPage.actions.export') }}</span>
                </button>
                <RecurringCreateMenu
                    v-if="tab !== 'upcoming'"
                    :compact="compactNotch"
                    :label="t('recurrencesPage.actions.create')"
                    :disabled="!canCreate || store.acting"
                    :kind="directoryKind"
                    @select="onCreate"
                    @pick="onPick"
                />
            </template>

            <RecurringUpcomingPanel
                v-if="tab === 'upcoming'"
                ref="upcomingRef"
                :settlement="dueSettlement"
                :kind="filterKind || null"
                :account-public-id="filterAccountId || null"
                :min-amount="filterMinAmount"
                :max-amount="filterMaxAmount"
                :sort="listSort"
                :search="queryString('q') || null"
                @sort="listSort = $event"
            />
            <RecurringTemplatesDirectory
                v-else
                :key="tab"
                ref="directoryRef"
                :kind="directoryKind"
                :type-choice-first="tab === 'incomes' ? 'income' : tab === 'expenses' ? 'expense' : null"
                :show-inactive="showInactive"
                :account-public-id="filterAccountId || null"
                :min-amount="filterMinAmount"
                :max-amount="filterMaxAmount"
                :search="queryString('q') || null"
                :sort="templateSort"
                @sort="templateSort = $event"
            />
        </AppBoard>
    </AppPageShell>
</template>

<style scoped>
.recurrences-active-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 34px;
    padding: 0 12px 0 6px;
    border-radius: 17px;
    background: #fff;
    font-size: 0.8rem;
    font-weight: 550;
    color: var(--ink);
    white-space: nowrap;
    cursor: pointer;
    box-shadow:
        0 1px 2px rgba(16, 16, 20, 0.06),
        0 0 0 1px rgba(16, 16, 20, 0.05);
}

.recurrences-active-toggle.is-active {
    color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.14);
    box-shadow: none;
}

.recurrences-active-toggle :deep(.app-switch) {
    flex: none;
    transform: scale(0.82);
    transform-origin: center;
}
</style>
