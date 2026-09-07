<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { PlusIcon } from 'vue-tabler-icons';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { TransactionsTimeline, canWriteTransactions, useTransactionsStore } from '@/features/transactions';
import { useAccountsStore } from '@/features/accounts';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useTransactionsStore();
const accountsStore = useAccountsStore();
const timelineRef = ref<{ openCreate: () => void } | null>(null);

const canCreate = computed(() => accountsStore.accounts.some((a) => canWriteTransactions(a)));

const accountItems = computed(() => [
    { title: t('transactionsPage.filters.allAccounts'), value: '' },
    ...accountsStore.accounts.map((a) => ({ title: a.name, value: a.publicId }))
]);

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

const filterAccountId = computed({
    get: () => queryString('account'),
    set: (value: string) => patchQuery({ account: value || undefined })
});

const filterFrom = computed({
    get: () => queryString('from') || null,
    set: (value: string | null) => patchQuery({ from: value || undefined })
});

const filterTo = computed({
    get: () => queryString('to') || null,
    set: (value: string | null) => patchQuery({ to: value || undefined })
});

function patchQuery(patch: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    const account = patch.account !== undefined ? patch.account : queryString('account') || undefined;
    const from = patch.from !== undefined ? patch.from : queryString('from') || undefined;
    const to = patch.to !== undefined ? patch.to : queryString('to') || undefined;
    if (account) next.account = account;
    if (from) next.from = from;
    if (to) next.to = to;
    void router.replace({ path: '/app/finances/transactions', query: next });
}

function onCreate() {
    if (!canCreate.value || store.acting) return;
    timelineRef.value?.openCreate();
}
</script>

<template>
    <AppPageShell :title="t('transactionsPage.title')" :subtitle="t('transactionsPage.subtitle')">
        <template #actions>
            <AppDropdownFilter :label="t('transactionsPage.actions.filter')" :min-width="300">
                <div class="pa-3 d-flex flex-column ga-3">
                    <AppSelect
                        v-model="filterAccountId"
                        :items="accountItems"
                        :label="t('transactionsPage.filters.account')"
                        hide-details
                    />
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
            <button type="button" class="su-btn su-btn--ink" :disabled="!canCreate || store.acting" @click="onCreate">
                <PlusIcon :size="16" stroke-width="1.6" />
                {{ t('transactionsPage.actions.create') }}
            </button>
        </template>

        <TransactionsTimeline ref="timelineRef" />
    </AppPageShell>
</template>
