<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { FileExportIcon, PlusIcon } from 'vue-tabler-icons';
import AppBoard from '@/components/shared/board/AppBoard.vue';
import AppBoardSearch from '@/components/shared/board/AppBoardSearch.vue';
import { useBoardSearch } from '@/components/shared/board/useBoardSearch';
import AppChoiceList from '@/components/shared/dropdown-filter/AppChoiceList.vue';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import {
    PAYMENT_METHOD_SEARCH_MAX,
    PAYMENT_METHOD_SORT_DEFAULT,
    PAYMENT_METHOD_TYPES,
    PaymentMethodsWallet,
    canWritePaymentMethods,
    parsePaymentMethodSort,
    usePaymentMethodsStore
} from '@/features/payment-methods';
import type { PaymentMethodType } from '@/features/payment-methods';
import { useAccountsStore } from '@/features/accounts';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = usePaymentMethodsStore();
const accountsStore = useAccountsStore();
const walletRef = ref<{ openCreate: () => void; exportCsv: () => void; visibleCount: number } | null>(null);
const showInactive = ref(true);

const canCreate = computed(() => accountsStore.accounts.some((a) => canWritePaymentMethods(a)));

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

function isPaymentMethodType(value: string): value is PaymentMethodType {
    return (PAYMENT_METHOD_TYPES as string[]).includes(value);
}

function patchQuery(patch: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    const account = 'account' in patch ? patch.account : queryString('account') || undefined;
    const type = 'type' in patch ? patch.type : queryString('type') || undefined;
    const q = 'q' in patch ? patch.q : queryString('q') || undefined;
    const sort = 'sort' in patch ? patch.sort : queryString('sort') || undefined;
    if (account) next.account = account;
    if (type && isPaymentMethodType(type)) next.type = type;
    if (q) next.q = q.slice(0, PAYMENT_METHOD_SEARCH_MAX);
    if (sort && sort !== PAYMENT_METHOD_SORT_DEFAULT && parsePaymentMethodSort(sort) === sort) next.sort = sort;
    void router.replace({ path: route.path, query: next });
}

const filterType = computed({
    get: (): PaymentMethodType | '' => (isPaymentMethodType(queryString('type')) ? (queryString('type') as PaymentMethodType) : ''),
    set: (value: string) => patchQuery({ type: value || undefined })
});

const listSort = computed({
    get: () => parsePaymentMethodSort(queryString('sort')),
    set: (value: string) => patchQuery({ sort: value === PAYMENT_METHOD_SORT_DEFAULT ? undefined : value })
});

const typeItems = computed(() => [
    { title: t('paymentMethodsPage.filters.allTypes'), value: '' },
    ...PAYMENT_METHOD_TYPES.map((value) => ({ title: t(`paymentMethodsPage.types.${value}`), value }))
]);

const search = useBoardSearch({
    read: () => queryString('q'),
    commit: (value) => patchQuery({ q: value }),
    max: PAYMENT_METHOD_SEARCH_MAX
});

const visibleCount = computed(() => walletRef.value?.visibleCount ?? 0);

function onCreate() {
    if (!canCreate.value || store.acting) return;
    walletRef.value?.openCreate();
}

function resetFilters() {
    showInactive.value = true;
}
</script>

<template>
    <AppPageShell :title="t('paymentMethodsPage.title')" :body-scroll="false">
        <AppBoard>
            <template #filters>
                <AppDropdownFilter
                    :label="filterType ? t(`paymentMethodsPage.types.${filterType}`) : t('paymentMethodsPage.filters.type')"
                    :min-width="240"
                    :count="filterType ? 1 : 0"
                    :reset-disabled="!filterType"
                    close-on-content-click
                    @reset="filterType = ''"
                >
                    <AppChoiceList v-model="filterType" :items="typeItems" :label="t('paymentMethodsPage.filters.type')" />
                </AppDropdownFilter>
                <AppDropdownFilter
                    :label="t('paymentMethodsPage.actions.filter')"
                    :count="showInactive ? 0 : 1"
                    :reset-disabled="showInactive"
                    @reset="resetFilters"
                >
                    <div class="pa-3">
                        <AppSwitch v-model="showInactive" :label="t('paymentMethodsPage.filters.showInactive')" />
                    </div>
                </AppDropdownFilter>
            </template>
            <template #bar>
                <AppBoardSearch
                    :model-value="search.input.value"
                    :maxlength="PAYMENT_METHOD_SEARCH_MAX"
                    :placeholder="t('paymentMethodsPage.searchPlaceholder')"
                    :search-label="t('paymentMethodsPage.actions.search')"
                    :clear-label="t('paymentMethodsPage.actions.clearSearch')"
                    @update:model-value="search.onInput"
                    @clear="search.clear"
                />
                <span v-if="visibleCount" class="su-toolbar__count app-board__count">
                    {{ t('paymentMethodsPage.count', { count: visibleCount }, visibleCount) }}
                </span>
            </template>
            <template #actions>
                <button
                    type="button"
                    class="su-btn su-btn--ink"
                    :disabled="!visibleCount"
                    :aria-label="t('paymentMethodsPage.actions.export')"
                    @click="walletRef?.exportCsv()"
                >
                    <FileExportIcon :size="16" stroke-width="1.6" />
                    <span class="app-board__label">{{ t('paymentMethodsPage.actions.export') }}</span>
                </button>
                <button
                    type="button"
                    class="su-btn su-btn--ink app-board__primary"
                    :disabled="!canCreate || store.acting"
                    :aria-label="t('paymentMethodsPage.actions.create')"
                    @click="onCreate"
                >
                    <PlusIcon :size="16" stroke-width="1.6" />
                    <span class="app-board__label">{{ t('paymentMethodsPage.actions.create') }}</span>
                </button>
            </template>

            <PaymentMethodsWallet
                ref="walletRef"
                :show-inactive="showInactive"
                :type="filterType || null"
                :search="queryString('q') || null"
                :sort="listSort"
                @sort="listSort = $event"
            />
        </AppBoard>
    </AppPageShell>
</template>
