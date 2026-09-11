<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { ArrowsSortIcon } from 'vue-tabler-icons';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppSortChoices from '@/components/shared/dropdown-filter/AppSortChoices.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import RecurringCreateMenu from '@/features/recurring-payments/components/RecurringCreateMenu.vue';
import RecurringTemplatesDirectory from '@/features/recurring-payments/components/RecurringTemplatesDirectory.vue';
import RecurringUpcomingPanel from '@/features/recurring-payments/components/RecurringUpcomingPanel.vue';
import {
    UPCOMING_DUE_SORT_DEFAULT,
    UPCOMING_DUE_SORTS,
    parseUpcomingDueSort
} from '@/features/recurring-payments/format';
import { recurrencesPathForTab, recurrencesTabFromPath, type RecurrenceTab } from '@/features/recurring-payments/paths';
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
} | null>(null);
const showInactive = ref(true);

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
    const kind = 'kind' in patch ? patch.kind : queryString('kind') || undefined;
    const due = 'due' in patch ? patch.due : queryString('due') || undefined;
    const sort = 'sort' in patch ? patch.sort : queryString('sort') || undefined;
    if (account) next.account = account;
    if (kind === 'expense' || kind === 'income') next.kind = kind;
    if (due === 'planned' || due === 'settled') next.due = due;
    if (sort && sort !== UPCOMING_DUE_SORT_DEFAULT && parseUpcomingDueSort(sort) === sort) next.sort = sort;
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

function onCreate(kind?: RecurringKind) {
    if (!canCreate.value || store.acting) return;
    directoryRef.value?.openCreate(kind ?? null);
}

function onPick(pick: RecurringTypePick) {
    if (!canCreate.value || store.acting) return;
    directoryRef.value?.openCreate(pick.kind, pick.type);
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
    <AppPageShell :title="pageTitle" :subtitle="t('recurrencesPage.subtitle')">
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
                    v-if="tab !== 'upcoming'"
                    :label="t('recurrencesPage.actions.create')"
                    :disabled="!canCreate || store.acting"
                    :kind="directoryKind"
                    @select="onCreate"
                    @pick="onPick"
                />
            </div>
        </template>

        <RecurringUpcomingPanel
            v-if="tab === 'upcoming'"
            :settlement="dueSettlement"
            :kind="filterKind || null"
            :account-public-id="filterAccountId || null"
            :sort="listSort"
        />
        <RecurringTemplatesDirectory
            v-else
            :key="tab"
            ref="directoryRef"
            :kind="directoryKind"
            :type-choice-first="tab === 'incomes' ? 'income' : tab === 'expenses' ? 'expense' : null"
            :show-inactive="showInactive"
        />
    </AppPageShell>
</template>
