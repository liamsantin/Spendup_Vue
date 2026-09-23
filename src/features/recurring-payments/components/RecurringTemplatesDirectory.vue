<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { useTagsStore } from '@/features/tags/stores/tags-store';
import RecurringTemplateListItem from '@/features/recurring-payments/components/list/RecurringTemplateListItem.vue';
import RecurringTemplateDetailModal from '@/features/recurring-payments/components/modals/RecurringTemplateDetailModal.vue';
import RecurringTemplateFormModal from '@/features/recurring-payments/components/modals/RecurringTemplateFormModal.vue';
import { recurrencesPathForTab } from '@/features/recurring-payments/paths';
import { canWriteRecurringOnAccount } from '@/features/recurring-payments/rights';
import RecurringTemplateTable from '@/features/recurring-payments/components/list/RecurringTemplateTable.vue';
import {
    TEMPLATE_SORT_DEFAULT,
    isExpenseTemplate,
    matchesRecurringSearch,
    sortTemplatesBy,
    type TemplateSort
} from '@/features/recurring-payments/format';
import { downloadCsv } from '@/utils/helpers/csv';
import {
    pageSizeForClientAmountFilter,
    parseAmountFilter,
    amountInFilterRange,
    isAmountRangeFilterActive
} from '@/components/shared/dropdown-filter/amount-range';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import type {
    RecurringExpense,
    RecurringExpenseType,
    RecurringIncome,
    RecurringIncomeType,
    RecurringKind
} from '@/features/recurring-payments/types';
import { RECURRING_PAGE_SIZE_DEFAULT, RECURRING_PAGE_SIZE_MAX } from '@/features/recurring-payments/types';

const props = withDefaults(
    defineProps<{
        kind?: RecurringKind | null;
        showInactive?: boolean;
        typeChoiceFirst?: RecurringKind | null;
        accountPublicId?: string | null;
        minAmount?: string | null;
        maxAmount?: string | null;
        search?: string | null;
        sort?: TemplateSort;
    }>(),
    {
        kind: null,
        showInactive: true,
        typeChoiceFirst: null,
        accountPublicId: null,
        minAmount: null,
        maxAmount: null,
        search: null,
        sort: TEMPLATE_SORT_DEFAULT
    }
);

const emit = defineEmits<{
    sort: [value: TemplateSort];
}>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const accountsStore = useAccountsStore();
const tagsStore = useTagsStore();
const store = useRecurringPaymentsStore();

const createOpen = ref(false);
const createKind = ref<RecurringKind | null>(null);
const createType = ref<RecurringExpenseType | RecurringIncomeType | null>(null);
const editTarget = ref<RecurringExpense | RecurringIncome | null>(null);
const deleteTarget = ref<RecurringExpense | RecurringIncome | null>(null);
const detailId = ref<string | null>(null);
const detailKind = ref<RecurringKind | null>(null);
const localError = ref<string | null>(null);

const editOpen = computed({
    get: () => !!editTarget.value,
    set: (value: boolean) => {
        if (!value) editTarget.value = null;
    }
});
const deleteOpen = computed({
    get: () => !!deleteTarget.value,
    set: (value: boolean) => {
        if (!value) deleteTarget.value = null;
    }
});
const detailOpen = computed({
    get: () => !!detailId.value,
    set: (value: boolean) => {
        if (!value) detailId.value = null;
    }
});

function accountFromQuery(): string | null {
    const raw = route.query.account;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

const filterAccountId = computed(() => props.accountPublicId?.trim() || accountFromQuery());
const canCreate = computed(() => accountsStore.accounts.some((item) => canWriteRecurringOnAccount(item)));
const listingKind = computed(() => props.kind ?? null);

function templateKind(item: RecurringExpense | RecurringIncome): RecurringKind {
    return isExpenseTemplate(item) ? 'expense' : 'income';
}

function visibleOf(list: readonly (RecurringExpense | RecurringIncome)[]) {
    const filtered = props.showInactive ? list : list.filter((item) => item.isActive);
    const accountId = filterAccountId.value;
    const minAmount = parseAmountFilter(props.minAmount);
    const maxAmount = parseAmountFilter(props.maxAmount);
    return filtered.filter((item) => {
        if (accountId && item.accountPublicId !== accountId) return false;
        return amountInFilterRange(item.plannedAmount, minAmount, maxAmount);
    });
}

function accountName(accountPublicId: string): string {
    return accountsStore.accounts.find((item) => item.publicId === accountPublicId)?.name ?? t('recurrencesPage.unknownAccount');
}

const items = computed(() => {
    const scoped =
        listingKind.value === 'expense'
            ? visibleOf(store.expenses)
            : listingKind.value === 'income'
              ? visibleOf(store.incomes)
              : [...visibleOf(store.expenses), ...visibleOf(store.incomes)];
    const needle = props.search?.trim();
    const found = needle ? scoped.filter((item) => matchesRecurringSearch(needle, item.name, accountName(item.accountPublicId))) : scoped;
    return sortTemplatesBy(found, props.sort);
});
const hasFilters = computed(
    () => !!(props.search?.trim() || filterAccountId.value || props.minAmount || props.maxAmount || !props.showInactive)
);

const loading = computed(() => {
    if (listingKind.value === 'expense') return store.loadingExpenses;
    if (listingKind.value === 'income') return store.loadingIncomes;
    return store.loadingExpenses || store.loadingIncomes;
});
const hasMore = computed(() => {
    if (listingKind.value === 'expense') return store.hasMoreExpenses;
    if (listingKind.value === 'income') return store.hasMoreIncomes;
    return store.hasMoreExpenses || store.hasMoreIncomes;
});
const loadingMore = computed(() => {
    if (listingKind.value === 'expense') return store.loadingMoreExpenses;
    if (listingKind.value === 'income') return store.loadingMoreIncomes;
    return store.loadingMoreExpenses || store.loadingMoreIncomes;
});
const emptyCopy = computed(() => {
    if (hasFilters.value) return t('recurrencesPage.empty.filtered');
    if (listingKind.value === 'expense') return t('recurrencesPage.empty.expenses');
    if (listingKind.value === 'income') return t('recurrencesPage.empty.incomes');
    return t('recurrencesPage.empty.all');
});
const editKind = computed(() => (editTarget.value ? templateKind(editTarget.value) : listingKind.value));
const deleteKind = computed(() => (deleteTarget.value ? templateKind(deleteTarget.value) : listingKind.value));

async function loadList(force = false) {
    localError.value = null;
    try {
        await accountsStore.loadAccounts(force);
        if (listingKind.value !== 'income') {
            void tagsStore.loadList({ force }).catch(() => undefined);
        }
        const query = {
            accountPublicId: filterAccountId.value ?? undefined,
            force,
            pageSize: pageSizeForClientAmountFilter(props.minAmount, props.maxAmount, RECURRING_PAGE_SIZE_DEFAULT, RECURRING_PAGE_SIZE_MAX)
        };
        if (listingKind.value === 'expense') {
            await store.loadExpenses(query);
        } else if (listingKind.value === 'income') {
            await store.loadIncomes(query);
        } else {
            await Promise.all([store.loadExpenses(query), store.loadIncomes(query)]);
        }
        await drainPagesForAmountFilter();
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.value = t('recurrencesPage.errors.notFound');
            if (filterAccountId.value) await router.replace({ path: recurrencesPathForTab('all') });
            return;
        }
        localError.value = getErrorMessage(e);
    }
}

async function drainPagesForAmountFilter() {
    if (!isAmountRangeFilterActive(props.minAmount, props.maxAmount)) return;
    let guard = 0;
    while (guard++ < 30) {
        const moreExpenses = (listingKind.value === 'expense' || listingKind.value == null) && store.hasMoreExpenses;
        const moreIncomes = (listingKind.value === 'income' || listingKind.value == null) && store.hasMoreIncomes;
        if (!moreExpenses && !moreIncomes) return;
        if (moreExpenses) await store.loadMoreExpenses();
        if (moreIncomes) await store.loadMoreIncomes();
    }
}

function onVisibilityChange() {
    if (document.visibilityState !== 'visible') return;
    void loadList(true).catch(() => undefined);
}

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void loadList().catch(() => undefined);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
});

watch(
    () => [route.query.account, props.accountPublicId, listingKind.value, props.minAmount, props.maxAmount] as const,
    () => {
        void loadList().catch(() => undefined);
    }
);

function openCreate(kind: RecurringKind | null = listingKind.value, type: RecurringExpenseType | RecurringIncomeType | null = null) {
    if (!canCreate.value) return;
    createKind.value = kind;
    createType.value = type;
    createOpen.value = true;
}

watch(createOpen, (value) => {
    if (!value) {
        createKind.value = null;
        createType.value = null;
    }
});

function frequencyLabel(item: RecurringExpense | RecurringIncome): string {
    return isExpenseTemplate(item)
        ? t(`recurrencesPage.expenseFrequencies.${item.frequency}`)
        : t(`recurrencesPage.incomeFrequencies.${item.frequency}`);
}

function exportCsv() {
    const header = (['name', 'kind', 'type', 'frequency', 'account', 'nextDue', 'amount', 'status'] as const).map((key) =>
        t(`recurrencesPage.columns.${key}`)
    );
    const rows = items.value.map((item) => [
        item.name,
        t(`recurrencesPage.kinds.${templateKind(item)}`),
        isExpenseTemplate(item)
            ? t(`recurrencesPage.expenseTypes.${item.expenseType}`)
            : t(`recurrencesPage.incomeTypes.${item.incomeType}`),
        frequencyLabel(item),
        accountName(item.accountPublicId),
        item.nextDueDate ?? '',
        item.plannedAmount,
        item.isActive ? t('recurrencesPage.badges.active') : t('recurrencesPage.badges.paused')
    ]);
    downloadCsv('recurrences', header, rows);
}

const visibleCount = computed(() => items.value.length);

defineExpose({ openCreate, exportCsv, visibleCount });

function canWrite(accountPublicId: string) {
    const account = accountsStore.accounts.find((item) => item.publicId === accountPublicId);
    return account ? canWriteRecurringOnAccount(account) : false;
}

async function confirmDelete() {
    if (!deleteTarget.value) return;
    localError.value = null;
    try {
        if (templateKind(deleteTarget.value) === 'expense') await store.deleteExpense(deleteTarget.value.publicId);
        else await store.deleteIncome(deleteTarget.value.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

function onSaved(template: RecurringExpense | RecurringIncome) {
    detailKind.value = templateKind(template);
    detailId.value = template.publicId;
}

function openDetail(item: RecurringExpense | RecurringIncome) {
    detailKind.value = templateKind(item);
    detailId.value = item.publicId;
}

function loadMore() {
    if (listingKind.value === 'expense') {
        void store.loadMoreExpenses();
        return;
    }
    if (listingKind.value === 'income') {
        void store.loadMoreIncomes();
        return;
    }
    if (store.hasMoreExpenses) void store.loadMoreExpenses();
    if (store.hasMoreIncomes) void store.loadMoreIncomes();
}
</script>

<template>
    <div class="recurring-panel">
        <AppAlert
            v-if="localError || store.error"
            type="error"
            class="su-alert"
            closable
            @dismiss="
                localError = null;
                store.clearError();
            "
        >
            {{ localError || store.error }}
        </AppAlert>

        <div class="recurring-panel__scroll">
            <div v-if="loading && !items.length" class="su-loading"><span class="su-spin" /></div>
            <div v-else-if="!items.length" class="su-empty">
                <p>{{ emptyCopy }}</p>
            </div>
            <div v-else class="recurring-directory">
                <div class="recurring-directory__list">
                    <RecurringTemplateListItem
                        v-for="(item, index) in items"
                        :key="`${templateKind(item)}-${item.publicId}`"
                        :template="item"
                        :kind="templateKind(item)"
                        :show-kind="!listingKind"
                        :can-write="canWrite(item.accountPublicId)"
                        :acting="store.acting"
                        :style="{ '--i': index }"
                        @open="openDetail"
                        @edit="editTarget = $event"
                        @delete="deleteTarget = $event"
                    />
                </div>
                <RecurringTemplateTable
                    class="recurring-directory__table"
                    :items="items"
                    :sort="sort"
                    :show-kind="!listingKind"
                    :acting="store.acting"
                    :can-write="canWrite"
                    @open="openDetail"
                    @edit="editTarget = $event"
                    @delete="deleteTarget = $event"
                    @sort="emit('sort', $event)"
                />
            </div>

            <div v-if="hasMore" class="su-more">
                <button type="button" class="su-btn su-btn--ghost" :disabled="loadingMore" @click="loadMore">
                    {{ t('recurrencesPage.loadMore') }}
                </button>
            </div>
        </div>

        <RecurringTemplateFormModal
            v-model="createOpen"
            :kind="createKind"
            :type-choice-first="typeChoiceFirst"
            :default-type="createType"
            :default-account-public-id="filterAccountId"
            @saved="onSaved"
        />
        <RecurringTemplateFormModal v-model="editOpen" :kind="editKind" :template="editTarget" />
        <RecurringTemplateDetailModal
            v-model="detailOpen"
            :kind="detailKind ?? 'expense'"
            :public-id="detailId"
            @edit="
                editTarget = (
                    detailKind === 'income' ? store.getDetail('income', detailId || '') : store.getDetail('expense', detailId || '')
                ) as RecurringExpense | RecurringIncome | null
            "
        />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="deleteKind === 'income' ? t('recurrencesPage.deleteModal.incomeTitle') : t('recurrencesPage.deleteModal.expenseTitle')"
            :message="t('recurrencesPage.deleteModal.body')"
            :confirm-label="t('recurrencesPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.recurring-panel {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.recurring-panel__scroll {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.recurring-directory {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 4px 16px 10px;
}

.recurring-directory__list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: visible;
}

.recurring-directory__table {
    display: none;
}

@media (min-width: 768px) {
    .recurring-directory__list {
        display: none;
    }

    .recurring-directory__table {
        display: flex;
        flex: 1 1 auto;
        min-height: 0;
        flex-direction: column;
    }
}

@media (max-width: 767px) {
    .recurring-panel__scroll {
        display: block;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
    }

    .recurring-directory {
        display: block;
        padding: 0 4px 4px;
    }
}
</style>
