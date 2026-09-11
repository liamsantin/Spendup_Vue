<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { CalendarEventIcon, PlusIcon, Receipt2Icon, TrendingUpIcon } from 'vue-tabler-icons';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import AppTabsShell from '@/components/shared/tabs/AppTabsShell.vue';
import RecurringTemplatesDirectory from '@/features/recurring-payments/components/RecurringTemplatesDirectory.vue';
import RecurringUpcomingPanel from '@/features/recurring-payments/components/RecurringUpcomingPanel.vue';
import { canWriteRecurringOnAccount } from '@/features/recurring-payments/rights';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import { useAccountsStore } from '@/features/accounts';

const TABS = ['expenses', 'incomes', 'upcoming'] as const;
type RecurrenceTab = (typeof TABS)[number];

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useRecurringPaymentsStore();
const accountsStore = useAccountsStore();
const expensesRef = ref<{ openCreate: () => void } | null>(null);
const incomesRef = ref<{ openCreate: () => void } | null>(null);
const showInactive = ref(true);

function tabFromQuery(): RecurrenceTab {
    const raw = route.query.tab;
    if (typeof raw === 'string' && (TABS as readonly string[]).includes(raw)) return raw as RecurrenceTab;
    return 'expenses';
}

const tab = ref<RecurrenceTab>(tabFromQuery());

const tabs = computed(() => [
    { value: 'expenses' as const, label: t('recurrencesPage.tabs.expenses'), icon: Receipt2Icon },
    { value: 'incomes' as const, label: t('recurrencesPage.tabs.incomes'), icon: TrendingUpIcon },
    { value: 'upcoming' as const, label: t('recurrencesPage.tabs.upcoming'), icon: CalendarEventIcon }
]);

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

function onCreate() {
    if (!canCreate.value || store.acting) return;
    if (tab.value === 'incomes') incomesRef.value?.openCreate();
    else {
        tab.value = 'expenses';
        expensesRef.value?.openCreate();
    }
}

function resetFilters() {
    showInactive.value = true;
}
</script>

<template>
    <AppTabsShell v-model="tab" :tabs="tabs" :title="t('recurrencesPage.title')" :subtitle="t('recurrencesPage.subtitle')" hide-actions>
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
                <button
                    v-if="tab !== 'upcoming'"
                    type="button"
                    class="su-btn su-btn--ink"
                    :disabled="!canCreate || store.acting"
                    @click="onCreate"
                >
                    <PlusIcon :size="16" stroke-width="1.6" />
                    {{ t('recurrencesPage.actions.create') }}
                </button>
            </div>
        </template>

        <Transition name="su-pane" mode="out-in">
            <RecurringTemplatesDirectory
                v-if="tab === 'expenses'"
                key="expenses"
                ref="expensesRef"
                kind="expense"
                :show-inactive="showInactive"
            />
            <RecurringTemplatesDirectory
                v-else-if="tab === 'incomes'"
                key="incomes"
                ref="incomesRef"
                kind="income"
                :show-inactive="showInactive"
            />
            <RecurringUpcomingPanel v-else key="upcoming" />
        </Transition>
    </AppTabsShell>
</template>
