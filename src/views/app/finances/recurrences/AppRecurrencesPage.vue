<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { AbcIcon, ArrowsSortIcon, BuildingBankIcon, CalendarDueIcon, CoinIcon, FileExportIcon, SparklesIcon } from 'vue-tabler-icons';
import AppChoiceList from '@/components/shared/dropdown-filter/AppChoiceList.vue';
import AppBoard from '@/components/shared/board/AppBoard.vue';
import AppBoardSearch from '@/components/shared/board/AppBoardSearch.vue';
import { useBoardSearch } from '@/components/shared/board/useBoardSearch';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppAmountRangeFields from '@/components/shared/dropdown-filter/AppAmountRangeFields.vue';
import AppSortChoices from '@/components/shared/dropdown-filter/AppSortChoices.vue';
import type { AppSortGroup } from '@/components/shared/dropdown-filter/sort-choices';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import RecurringCreateMenu from '@/features/recurring-payments/components/RecurringCreateMenu.vue';
import RecurringTemplatesDirectory from '@/features/recurring-payments/components/RecurringTemplatesDirectory.vue';
import RecurringUpcomingPanel from '@/features/recurring-payments/components/RecurringUpcomingPanel.vue';
import RecurringSuggestionsModal from '@/features/recurring-payments/components/modals/RecurringSuggestionsModal.vue';
import {
    RECURRING_SEARCH_MAX,
    TEMPLATE_SORT_DEFAULT,
    UPCOMING_DUE_SORT_DEFAULT,
    parseTemplateSort,
    parseUpcomingDueSort,
    todayLocalYmd,
    type TemplateSort,
    type UpcomingDueSort
} from '@/features/recurring-payments/format';
import { recurrencesPathForTab, recurrencesTabFromPath, type RecurrenceTab } from '@/features/recurring-payments/paths';
import { serializeAmountFilter } from '@/components/shared/dropdown-filter/amount-range';
import { canWriteRecurringOnAccount } from '@/features/recurring-payments/rights';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import type { RecurringKind } from '@/features/recurring-payments/types';
import type { RecurringTypePick } from '@/features/recurring-payments/components/forms/RecurringTypeChoice.vue';
import { useAccountsStore } from '@/features/accounts';
import { useCreateFromQuery } from '@/components/shared/board/useCreateFromQuery';

const TABS = ['all', 'expenses', 'incomes', 'upcoming'] as const;
type DueSettlement = 'all' | 'planned' | 'settled';

const { t, locale } = useI18n();
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
const suggestionsOpen = ref(false);
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

const subnav = computed<{ tab: RecurrenceTab; label: string; to: string }[]>(() => [
    { tab: 'all', label: t('nav.items.recurrencesOverview'), to: recurrencesPathForTab('all') },
    { tab: 'expenses', label: t('nav.items.recurrencesExpenses'), to: recurrencesPathForTab('expenses') },
    { tab: 'incomes', label: t('nav.items.recurrencesIncomes'), to: recurrencesPathForTab('incomes') },
    { tab: 'upcoming', label: t('nav.items.recurrencesUpcoming'), to: recurrencesPathForTab('upcoming') }
]);

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

/**
 * Sous-titre « N récurrences actives · N échéances en <mois> », calculé sur les listes chargées
 * (nature du tab courant ; échéances = prochaines dates tombant dans le mois en cours).
 */
const pageSubtitle = computed(() => {
    const expensesReady = store.initializedExpenses;
    const incomesReady = store.initializedIncomes;
    const scoped =
        tab.value === 'expenses'
            ? expensesReady
                ? store.expenses
                : null
            : tab.value === 'incomes'
              ? incomesReady
                  ? store.incomes
                  : null
              : expensesReady || incomesReady
                ? [...store.expenses, ...store.incomes]
                : null;
    if (!scoped) return undefined;
    const active = scoped.filter((item) => item.isActive).length;
    const monthPrefix = todayLocalYmd().slice(0, 7);
    const dues = scoped.filter((item) => item.isActive && item.nextDueDate?.startsWith(monthPrefix)).length;
    const [y, m] = monthPrefix.split('-').map(Number);
    const month = new Intl.DateTimeFormat(locale.value || undefined, { month: 'long' }).format(new Date(y, m - 1, 1, 12));
    return [
        t('recurrencesPage.hero.active', { count: active }, active),
        t('recurrencesPage.hero.duesInMonth', { count: dues, month }, dues)
    ].join(' · ');
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

useCreateFromQuery(
    () => onCreate(),
    () => canCreate.value && !store.acting
);

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

/** Critères de tri des échéances : une ligne par critère, le sens en segments. */
const sortGroups = computed<AppSortGroup<UpcomingDueSort>[]>(() => {
    const option = (value: UpcomingDueSort) => ({
        value,
        label: t(`recurrencesPage.sortShort.${value}`),
        ariaLabel: t(`recurrencesPage.sort.${value}`)
    });
    return [
        {
            id: 'date',
            label: t('recurrencesPage.sortGroups.date'),
            icon: CalendarDueIcon,
            options: [option('dateAsc'), option('dateDesc')]
        },
        { id: 'name', label: t('recurrencesPage.sortGroups.name'), icon: AbcIcon, options: [option('nameAsc'), option('nameDesc')] },
        {
            id: 'amount',
            label: t('recurrencesPage.sortGroups.amount'),
            icon: CoinIcon,
            options: [option('amountDesc'), option('amountAsc')]
        }
    ];
});

/** Critères de tri des récurrences (prochaine échéance, nom, montant). */
const templateSortGroups = computed<AppSortGroup<TemplateSort>[]>(() => {
    const option = (value: TemplateSort, labelKey: string) => ({
        value,
        label: t(`recurrencesPage.sortShort.${labelKey}`),
        ariaLabel: t(`recurrencesPage.sort.${labelKey}`)
    });
    return [
        {
            id: 'nextDue',
            label: t('recurrencesPage.sortGroups.date'),
            icon: CalendarDueIcon,
            options: [option('nextDueAsc', 'dateAsc'), option('nextDueDesc', 'dateDesc')]
        },
        {
            id: 'name',
            label: t('recurrencesPage.sortGroups.name'),
            icon: AbcIcon,
            options: [option('nameAsc', 'nameAsc'), option('nameDesc', 'nameDesc')]
        },
        {
            id: 'amount',
            label: t('recurrencesPage.sortGroups.amount'),
            icon: CoinIcon,
            options: [option('amountDesc', 'amountDesc'), option('amountAsc', 'amountAsc')]
        }
    ];
});
const templateSortCount = computed(() => (templateSort.value === TEMPLATE_SORT_DEFAULT ? 0 : 1));

/** Total affiché sur le bouton « Filtres » replié (mobile). */
const activeFilterTotal = computed(() =>
    tab.value === 'upcoming'
        ? sortCount.value + filterCount.value
        : templateSortCount.value + amountCount.value + (filterAccountId.value ? 1 : 0)
);
</script>

<template>
    <AppPageShell class="recurrences-page" :title="pageTitle" :subtitle="pageSubtitle" :body-scroll="false">
        <!-- sous-navigation en haut à droite : passer d'une vue à l'autre sans repasser par le menu -->
        <template #tabs>
            <nav class="su-tabs recurrences-subnav" :aria-label="t('recurrencesPage.subnav')">
                <RouterLink
                    v-for="view in subnav"
                    :key="view.tab"
                    :to="view.to"
                    class="su-tab"
                    :class="{ 'is-active': tab === view.tab }"
                    :aria-current="tab === view.tab ? 'page' : undefined"
                >
                    {{ view.label }}
                </RouterLink>
            </nav>
        </template>
        <AppBoard mobile-filters="sheet" :active-filters="activeFilterTotal">
            <template #filters>
                <template v-if="tab === 'upcoming'">
                    <AppDropdownFilter
                        :label="t('recurrencesPage.actions.sort')"
                        :icon="ArrowsSortIcon"
                        :min-width="320"
                        close-on-content-click
                        :count="sortCount"
                        :reset-disabled="listSort === UPCOMING_DUE_SORT_DEFAULT"
                        @reset="listSort = UPCOMING_DUE_SORT_DEFAULT"
                    >
                        <AppSortChoices v-model="listSort" :groups="sortGroups" :label="t('recurrencesPage.actions.sort')" />
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
                        :label="t('recurrencesPage.actions.sort')"
                        :icon="ArrowsSortIcon"
                        :min-width="320"
                        close-on-content-click
                        :count="templateSortCount"
                        :reset-disabled="templateSort === TEMPLATE_SORT_DEFAULT"
                        @reset="templateSort = TEMPLATE_SORT_DEFAULT"
                    >
                        <AppSortChoices v-model="templateSort" :groups="templateSortGroups" :label="t('recurrencesPage.actions.sort')" />
                    </AppDropdownFilter>
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
                <button
                    type="button"
                    class="su-btn"
                    :disabled="!canCreate"
                    :aria-label="t('recurrencesPage.suggestions.open')"
                    @click="suggestionsOpen = true"
                >
                    <SparklesIcon :size="16" stroke-width="1.6" />
                    <span class="app-board__label">{{ t('recurrencesPage.suggestions.open') }}</span>
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
        <RecurringSuggestionsModal v-model="suggestionsOpen" :account-public-id="filterAccountId || null" />
    </AppPageShell>
</template>

<style scoped>
.recurrences-subnav {
    text-decoration: none;
}

.recurrences-subnav .su-tab {
    text-decoration: none;
}

/* filtre « Actif » : interrupteur + libellé, sans pilule */
.recurrences-active-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0;
    color: var(--gray);
    font-size: 14px;
    white-space: nowrap;
    cursor: pointer;
}

.recurrences-active-toggle.is-active {
    color: var(--ink);
    font-weight: 700;
}

.recurrences-active-toggle :deep(.app-switch) {
    flex: none;
    transform: scale(0.82);
    transform-origin: center;
}
</style>
