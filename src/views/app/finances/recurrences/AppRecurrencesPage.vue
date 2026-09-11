<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { ArrowsSortIcon, CalendarEventIcon, PlusIcon, Receipt2Icon, TrendingUpIcon } from 'vue-tabler-icons';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import AppFoldableTabs from '@/components/shared/tabs/AppFoldableTabs.vue';
import RecurringCreateMenu from '@/features/recurring-payments/components/RecurringCreateMenu.vue';
import RecurringTemplatesDirectory from '@/features/recurring-payments/components/RecurringTemplatesDirectory.vue';
import RecurringUpcomingPanel from '@/features/recurring-payments/components/RecurringUpcomingPanel.vue';
import {
    UPCOMING_DUE_SORT_DEFAULT,
    UPCOMING_DUE_SORTS,
    parseUpcomingDueSort
} from '@/features/recurring-payments/format';
import { canWriteRecurringOnAccount } from '@/features/recurring-payments/rights';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import type { RecurringKind } from '@/features/recurring-payments/types';
import { useAccountsStore } from '@/features/accounts';

const TABS = ['all', 'expenses', 'incomes', 'upcoming'] as const;
type RecurrenceTab = (typeof TABS)[number];
type DueSettlement = 'all' | 'planned' | 'settled';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useRecurringPaymentsStore();
const accountsStore = useAccountsStore();
const directoryRef = ref<{ openCreate: (kind?: RecurringKind | null) => void } | null>(null);
const showInactive = ref(true);

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

function tabFromQuery(): RecurrenceTab {
    const raw = queryString('tab');
    if ((TABS as readonly string[]).includes(raw)) return raw as RecurrenceTab;
    return 'all';
}

function parseSettlement(raw: string): DueSettlement {
    return raw === 'planned' || raw === 'settled' ? raw : 'all';
}

function parseKind(raw: string): RecurringKind | '' {
    return raw === 'expense' || raw === 'income' ? raw : '';
}

const tab = ref<RecurrenceTab>(tabFromQuery());

const directoryKind = computed<RecurringKind | null>(() => {
    if (tab.value === 'expenses') return 'expense';
    if (tab.value === 'incomes') return 'income';
    return null;
});

const canCreate = computed(() => accountsStore.accounts.some((item) => canWriteRecurringOnAccount(item)));

const accountItems = computed(() => [
    { title: t('recurrencesPage.filters.allAccounts'), value: '' },
    ...accountsStore.accounts.map((account) => ({ title: account.name, value: account.publicId }))
]);

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
    const tabValue = 'tab' in patch ? patch.tab : queryString('tab') || undefined;
    const account = 'account' in patch ? patch.account : queryString('account') || undefined;
    const kind = 'kind' in patch ? patch.kind : queryString('kind') || undefined;
    const due = 'due' in patch ? patch.due : queryString('due') || undefined;
    const sort = 'sort' in patch ? patch.sort : queryString('sort') || undefined;
    if (tabValue && (TABS as readonly string[]).includes(tabValue)) next.tab = tabValue;
    if (account) next.account = account;
    if (kind === 'expense' || kind === 'income') next.kind = kind;
    if (due === 'planned' || due === 'settled') next.due = due;
    if (sort && sort !== UPCOMING_DUE_SORT_DEFAULT && parseUpcomingDueSort(sort) === sort) next.sort = sort;
    void router.replace({ query: next });
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

watch(tab, (value) => {
    if (queryString('tab') === value) return;
    patchQuery({ tab: value });
});

watch(
    () => queryString('tab'),
    () => {
        tab.value = tabFromQuery();
    }
);

function setTab(value: RecurrenceTab) {
    tab.value = value;
}

function onCreate(kind?: RecurringKind) {
    if (!canCreate.value || store.acting) return;
    if (kind) {
        directoryRef.value?.openCreate(kind);
        return;
    }
    if (tab.value === 'incomes') directoryRef.value?.openCreate('income');
    else if (tab.value === 'expenses') directoryRef.value?.openCreate('expense');
    else directoryRef.value?.openCreate(null);
}

function resetFilters() {
    if (tab.value === 'upcoming') {
        patchQuery({ account: undefined, kind: undefined, due: undefined });
        return;
    }
    showInactive.value = true;
}

const upcomingFiltersActive = computed(() => !!(filterAccountId.value || filterKind.value || dueSettlement.value !== 'all'));
const filterCount = computed(() => {
    if (tab.value === 'upcoming') {
        return [filterAccountId.value, filterKind.value, dueSettlement.value !== 'all' ? 'due' : ''].filter(Boolean).length;
    }
    return showInactive.value ? 0 : 1;
});
const sortCount = computed(() => (listSort.value === UPCOMING_DUE_SORT_DEFAULT ? 0 : 1));
</script>

<template>
    <AppPageShell :title="t('recurrencesPage.title')" :subtitle="t('recurrencesPage.subtitle')">
        <template #tabs>
            <AppFoldableTabs :aria-label="t('recurrencesPage.tabs.label')">
                <button type="button" class="su-tab" :class="{ 'is-active': tab === 'all' }" @click="setTab('all')">
                    <span class="su-tab__body">{{ t('recurrencesPage.tabs.all') }}</span>
                </button>
                <button type="button" class="su-tab" :class="{ 'is-active': tab === 'expenses' }" @click="setTab('expenses')">
                    <span class="su-tab__body">
                        <Receipt2Icon :size="16" stroke-width="1.7" />
                        {{ t('recurrencesPage.tabs.expenses') }}
                    </span>
                </button>
                <button type="button" class="su-tab" :class="{ 'is-active': tab === 'incomes' }" @click="setTab('incomes')">
                    <span class="su-tab__body">
                        <TrendingUpIcon :size="16" stroke-width="1.7" />
                        {{ t('recurrencesPage.tabs.incomes') }}
                    </span>
                </button>
                <button type="button" class="su-tab" :class="{ 'is-active': tab === 'upcoming' }" @click="setTab('upcoming')">
                    <span class="su-tab__body">
                        <CalendarEventIcon :size="16" stroke-width="1.7" />
                        {{ t('recurrencesPage.tabs.upcoming') }}
                    </span>
                </button>
            </AppFoldableTabs>
        </template>

        <template #toolbar>
            <div class="su-toolbar__actions">
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
                        <v-list class="py-0">
                            <v-list-item
                                v-for="value in UPCOMING_DUE_SORTS"
                                :key="value"
                                :active="listSort === value"
                                color="primary"
                                @click="listSort = value"
                            >
                                <v-list-item-title>{{ t(`recurrencesPage.sort.${value}`) }}</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </AppDropdownFilter>
                    <AppDropdownFilter
                        :label="t('recurrencesPage.actions.filter')"
                        :min-width="300"
                        :count="filterCount"
                        :reset-disabled="!upcomingFiltersActive"
                        @reset="resetFilters"
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
                        </div>
                    </AppDropdownFilter>
                </template>
                <AppDropdownFilter
                    v-else
                    :label="t('recurrencesPage.actions.filter')"
                    :count="filterCount"
                    :reset-disabled="showInactive"
                    @reset="resetFilters"
                >
                    <v-list-item>
                        <AppSwitch v-model="showInactive" :label="t('recurrencesPage.filters.showInactive')" />
                    </v-list-item>
                </AppDropdownFilter>
                <RecurringCreateMenu
                    v-if="tab === 'all'"
                    :label="t('recurrencesPage.actions.create')"
                    :disabled="!canCreate || store.acting"
                    @select="onCreate"
                />
                <button
                    v-else-if="tab !== 'upcoming'"
                    type="button"
                    class="su-btn su-btn--ink"
                    :disabled="!canCreate || store.acting"
                    @click="onCreate()"
                >
                    <PlusIcon :size="16" stroke-width="1.6" />
                    {{ t('recurrencesPage.actions.create') }}
                </button>
            </div>
        </template>

        <RecurringUpcomingPanel
            v-if="tab === 'upcoming'"
            :settlement="dueSettlement"
            :kind="filterKind || null"
            :account-public-id="filterAccountId || null"
            :sort="listSort"
        />
        <RecurringTemplatesDirectory v-else :key="tab" ref="directoryRef" :kind="directoryKind" :show-inactive="showInactive" />
    </AppPageShell>
</template>
