<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { CalendarEventIcon, PlusIcon, Receipt2Icon, TrendingUpIcon } from 'vue-tabler-icons';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import AppFoldableTabs from '@/components/shared/tabs/AppFoldableTabs.vue';
import RecurringCreateMenu from '@/features/recurring-payments/components/RecurringCreateMenu.vue';
import RecurringTemplatesDirectory from '@/features/recurring-payments/components/RecurringTemplatesDirectory.vue';
import RecurringUpcomingPanel from '@/features/recurring-payments/components/RecurringUpcomingPanel.vue';
import { canWriteRecurringOnAccount } from '@/features/recurring-payments/rights';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import type { RecurringKind } from '@/features/recurring-payments/types';
import { useAccountsStore } from '@/features/accounts';

const TABS = ['all', 'expenses', 'incomes', 'upcoming'] as const;
type RecurrenceTab = (typeof TABS)[number];

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useRecurringPaymentsStore();
const accountsStore = useAccountsStore();
const directoryRef = ref<{ openCreate: (kind?: RecurringKind | null) => void } | null>(null);
const showInactive = ref(true);

function tabFromQuery(): RecurrenceTab {
    const raw = route.query.tab;
    if (typeof raw === 'string' && (TABS as readonly string[]).includes(raw)) return raw as RecurrenceTab;
    return 'all';
}

const tab = ref<RecurrenceTab>(tabFromQuery());

const directoryKind = computed<RecurringKind | null>(() => {
    if (tab.value === 'expenses') return 'expense';
    if (tab.value === 'incomes') return 'income';
    return null;
});

const canCreate = computed(() => accountsStore.accounts.some((item) => canWriteRecurringOnAccount(item)));

watch(tab, (value) => {
    if (route.query.tab === value) return;
    void router.replace({ query: { ...route.query, tab: value } });
});

watch(
    () => route.query.tab,
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
    showInactive.value = true;
}
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
                <AppDropdownFilter
                    :label="t('recurrencesPage.actions.filter')"
                    :count="showInactive ? 0 : 1"
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

        <RecurringUpcomingPanel v-if="tab === 'upcoming'" />
        <RecurringTemplatesDirectory v-else :key="tab" ref="directoryRef" :kind="directoryKind" :show-inactive="showInactive" />
    </AppPageShell>
</template>
