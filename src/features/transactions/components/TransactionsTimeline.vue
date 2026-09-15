<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { amountInFilterRange, parseAmountFilter } from '@/components/shared/dropdown-filter/amount-range';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { useBudgetsStore } from '@/features/budgets/stores/budgets-store';
import { parseBudgetTransactionScope } from '@/features/budgets/paths';
import {
    budgetLinkedCategoryIds,
    isTransactionCountedInBudget,
    isTransactionLinkableToBudget,
    transactionFormFieldsWithCategory
} from '@/features/budgets/link-transactions';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';
import { useTiersStore } from '@/features/tiers/stores/tiers-store';
import { canWriteTransaction, canWriteTransactions } from '@/features/transactions/rights';
import {
    formatOperationDate,
    involvedAccountPublicIds,
    matchesTransactionSearch,
    parseTransactionSort,
    resolveTransactionAmountDisplay,
    sortTransactions,
    TRANSACTION_SORT_DEFAULT
} from '@/features/transactions/format';
import { useTransactionsStore } from '@/features/transactions/stores/transactions-store';
import {
    TRANSACTION_PAGE_SIZE_DEFAULT,
    TRANSACTION_PAGE_SIZE_MAX,
    TRANSACTION_SEARCH_MAX,
    TRANSACTION_TYPES,
    type Transaction,
    type TransactionType
} from '@/features/transactions/types';
import { TIER_PAGE_SIZE_MAX } from '@/features/tiers/types';
import { tierSearchHaystack } from '@/features/tiers/format';
import { usePaymentMethodsStore } from '@/features/payment-methods';
import TransactionListItem from '@/features/transactions/components/list/TransactionListItem.vue';
import TransactionFormModal from '@/features/transactions/components/modals/TransactionFormModal.vue';

const props = defineProps<{
    /** Si défini, force le filtre compte (fiche compte) et ignore la query. */
    lockedAccountPublicId?: string | null;
}>();

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const accountsStore = useAccountsStore();
const budgetsStore = useBudgetsStore();
const categoriesStore = useCategoriesStore();
const tiersStore = useTiersStore();
const paymentMethodsStore = usePaymentMethodsStore();
const store = useTransactionsStore();

const createOpen = ref(false);
const editTarget = ref<Transaction | null>(null);
const deleteTarget = ref<Transaction | null>(null);
const unlinkTarget = ref<Transaction | null>(null);
const addUndo = ref<{ publicId: string; previousCategoryPublicId: string; label: string } | null>(null);
const localError = ref<string | null>(null);
const ADD_UNDO_MS = 8000;
let addUndoTimer: ReturnType<typeof setTimeout> | null = null;

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

const unlinkOpen = computed({
    get: () => !!unlinkTarget.value,
    set: (value: boolean) => {
        if (!value) unlinkTarget.value = null;
    }
});

function queryString(name: string): string | null {
    const raw = route.query[name];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

const filterAccountId = computed(() => props.lockedAccountPublicId?.trim() || queryString('account'));
const filterFrom = computed(() => (props.lockedAccountPublicId ? null : queryString('from')));
const filterTo = computed(() => (props.lockedAccountPublicId ? null : queryString('to')));
const filterCategoryId = computed(() => (props.lockedAccountPublicId ? null : queryString('category')));
const filterTierId = computed(() => (props.lockedAccountPublicId ? null : queryString('tier')));
const filterPaymentMethodId = computed(() => (props.lockedAccountPublicId ? null : queryString('paymentMethod')));
const filterRecurringExpenseId = computed(() => (props.lockedAccountPublicId ? null : queryString('recurringExpensePublicId')));
const filterRecurringIncomeId = computed(() => (props.lockedAccountPublicId ? null : queryString('recurringIncomePublicId')));
const filterSearch = computed(() => {
    if (props.lockedAccountPublicId) return null;
    return queryString('q')?.slice(0, TRANSACTION_SEARCH_MAX) ?? null;
});
const filterType = computed<TransactionType | null>(() => {
    if (props.lockedAccountPublicId) return null;
    const raw = queryString('type');
    return raw && TRANSACTION_TYPES.includes(raw as TransactionType) ? (raw as TransactionType) : null;
});
const listSort = computed(() => parseTransactionSort(queryString('sort')));
const filterMinAmount = computed(() => (props.lockedAccountPublicId ? null : parseAmountFilter(queryString('minAmount'))));
const filterMaxAmount = computed(() => (props.lockedAccountPublicId ? null : parseAmountFilter(queryString('maxAmount'))));
const filterBudgetId = computed(() => (props.lockedAccountPublicId ? null : queryString('budget')));
const envelopeBudget = computed(() => {
    const id = filterBudgetId.value;
    if (!id) return null;
    return budgetsStore.findByPublicId(id);
});
const envelopeScope = computed(() => {
    if (!envelopeBudget.value?.categoryPublicId) return 'in' as const;
    return parseBudgetTransactionScope(queryString('budgetScope'));
});
const envelopeLinkedCategoryIds = computed(() =>
    envelopeBudget.value ? budgetLinkedCategoryIds(envelopeBudget.value, categoriesStore.items) : null
);
const needsClientFullScan = computed(
    () =>
        filterMinAmount.value != null ||
        filterMaxAmount.value != null ||
        !!filterPaymentMethodId.value ||
        !!filterBudgetId.value
);
const groupByDate = computed(() => listSort.value === 'dateDesc' || listSort.value === 'dateAsc');

const visibleItems = computed(() => {
    const type = filterType.value;
    const paymentMethodId = filterPaymentMethodId.value;
    const needle = filterSearch.value?.trim() ?? '';
    const filtered = store.items.filter((item) => {
        if (type && item.type !== type) return false;
        if (paymentMethodId && item.paymentMethodPublicId !== paymentMethodId) return false;
        if (!amountInFilterRange(item.amount, filterMinAmount.value, filterMaxAmount.value)) return false;
        const budget = envelopeBudget.value;
        if (budget) {
            const ids = envelopeLinkedCategoryIds.value;
            if (envelopeScope.value === 'out') {
                if (!isTransactionLinkableToBudget(item, budget, ids, accountsStore.accounts)) return false;
            } else if (!isTransactionCountedInBudget(item, budget, ids)) {
                return false;
            }
        }
        if (!needle) return true;
        const tier = item.tierPublicId ? tiersStore.findByPublicId(item.tierPublicId) : null;
        return matchesTransactionSearch(item, needle, {
            typeLabel: t(`transactionsPage.types.${item.type}`),
            accountNames: involvedAccountPublicIds(item).map(
                (id) => accountsStore.accounts.find((account) => account.publicId === id)?.name ?? ''
            ),
            categoryName: item.categoryPublicId ? (categoriesStore.findByPublicId(item.categoryPublicId)?.name ?? null) : null,
            tierHaystack: tier ? tierSearchHaystack(tier) : null,
            paymentMethodLabel: item.paymentMethodPublicId
                ? (paymentMethodsStore.allKnownItems().find((method) => method.publicId === item.paymentMethodPublicId)?.label ?? null)
                : null,
            amountText: resolveTransactionAmountDisplay(item.amount, item.currency, locale.value).text
        });
    });
    return sortTransactions(filtered, listSort.value);
});

const emptyCopy = computed(() => {
    if (filterSearch.value) return t('transactionsPage.empty.filtered');
    if (filterMinAmount.value != null || filterMaxAmount.value != null || filterPaymentMethodId.value) {
        return t('transactionsPage.empty.filtered');
    }
    if (filterType.value) return t('transactionsPage.empty.byType', { type: t(`transactionsPage.types.${filterType.value}`) });
    if (filterRecurringExpenseId.value || filterRecurringIncomeId.value) return t('transactionsPage.empty.recurrence');
    if (queryString('budget')) {
        return envelopeScope.value === 'out' ? t('transactionsPage.empty.budgetOut') : t('transactionsPage.empty.budget');
    }
    if (filterAccountId.value) return t('transactionsPage.empty.account');
    return t('transactionsPage.empty.timeline');
});

const hasSearched = ref(!!filterSearch.value);
const searchRevealKey = ref(0);
const searchReveals = computed(() => hasSearched.value || !!filterSearch.value);

const canCreate = computed(() => {
    if (filterAccountId.value) {
        const account = accountsStore.accounts.find((a) => a.publicId === filterAccountId.value);
        return !!account && canWriteTransactions(account);
    }
    return accountsStore.accounts.some((a) => canWriteTransactions(a));
});

const dateGroups = computed(() => {
    if (!groupByDate.value) {
        return [{ date: '_', label: '', items: visibleItems.value }];
    }
    const order: string[] = [];
    const map = new Map<string, Transaction[]>();
    for (const item of visibleItems.value) {
        const key = item.operationDate;
        if (!map.has(key)) {
            map.set(key, []);
            order.push(key);
        }
        map.get(key)!.push(item);
    }
    return order.map((date) => ({
        date,
        label: formatOperationDate(date, locale.value),
        items: map.get(date)!
    }));
});

const searchAppearIndex = computed(() => {
    const map = new Map<string, number>();
    visibleItems.value.forEach((item, index) => map.set(item.publicId, index));
    return map;
});

function canWriteItem(transaction: Transaction): boolean {
    return canWriteTransaction(transaction, accountsStore.accounts);
}

function envelopeActionFor(transaction: Transaction): 'add' | 'remove' | null {
    const budget = envelopeBudget.value;
    if (!budget?.categoryPublicId) return null;
    if (!canWriteItem(transaction)) return null;
    return envelopeScope.value === 'out' ? 'add' : 'remove';
}

async function applyEnvelopeCategory(transaction: Transaction, categoryPublicId: string): Promise<boolean> {
    const budget = envelopeBudget.value;
    if (!budget) return false;
    localError.value = null;
    const fields = transactionFormFieldsWithCategory(transaction, categoryPublicId);
    if (!fields) return false;
    try {
        await store.updateTransaction(transaction.publicId, fields);
        await budgetsStore.fetchBudget(budget.publicId, true).catch(() => undefined);
        return true;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('transactionsPage.errors.notFound') : getErrorMessage(e);
        return false;
    }
}

function clearAddUndo() {
    if (addUndoTimer) {
        clearTimeout(addUndoTimer);
        addUndoTimer = null;
    }
    addUndo.value = null;
}

function showAddUndo(publicId: string, previousCategoryPublicId: string, label: string) {
    clearAddUndo();
    addUndo.value = { publicId, previousCategoryPublicId, label };
    addUndoTimer = setTimeout(() => {
        addUndoTimer = null;
        addUndo.value = null;
    }, ADD_UNDO_MS);
}

async function onEnvelopeAction(transaction: Transaction) {
    const budget = envelopeBudget.value;
    const categoryPublicId = budget?.categoryPublicId?.trim();
    if (!budget || !categoryPublicId) return;
    if (envelopeScope.value === 'in') {
        unlinkTarget.value = transaction;
        return;
    }
    const previousCategoryPublicId = transaction.categoryPublicId ?? '';
    const ok = await applyEnvelopeCategory(transaction, categoryPublicId);
    if (ok) showAddUndo(transaction.publicId, previousCategoryPublicId, transaction.label);
}

async function undoAddToBudget() {
    const pending = addUndo.value;
    if (!pending) return;
    const current = store.allKnownItems().find((item) => item.publicId === pending.publicId);
    if (!current) {
        clearAddUndo();
        return;
    }
    const ok = await applyEnvelopeCategory(current, pending.previousCategoryPublicId);
    if (ok) clearAddUndo();
}

async function confirmUnlink() {
    if (!unlinkTarget.value) return;
    const ok = await applyEnvelopeCategory(unlinkTarget.value, '');
    if (ok) unlinkTarget.value = null;
}

async function loadTimeline(force = false) {
    localError.value = null;
    try {
        await accountsStore.loadAccounts(force);
        await Promise.all([
            store.loadList({
                accountPublicId: filterAccountId.value ?? undefined,
                categoryPublicId: filterBudgetId.value ? undefined : (filterCategoryId.value ?? undefined),
                tierPublicId: filterTierId.value ?? undefined,
                recurringExpensePublicId: filterRecurringExpenseId.value ?? undefined,
                recurringIncomePublicId: filterRecurringIncomeId.value ?? undefined,
                from: filterFrom.value ?? undefined,
                to: filterTo.value ?? undefined,
                pageSize: needsClientFullScan.value ? TRANSACTION_PAGE_SIZE_MAX : TRANSACTION_PAGE_SIZE_DEFAULT,
                force
            }),
            categoriesStore.loadList({ force }).catch(() => undefined),
            tiersStore.loadList({ pageSize: TIER_PAGE_SIZE_MAX, force }).catch(() => undefined),
            paymentMethodsStore.loadList({ force }).catch(() => undefined)
        ]);
        if (needsClientFullScan.value) {
            let guard = 0;
            while (store.hasMore && guard++ < 30) {
                await store.loadMore();
            }
        }
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.value = t('transactionsPage.errors.notFound');
            // 404 : compte inconnu, ou tier filtré qui n’appartient pas (plus) à l’utilisateur → on retire le filtre fautif.
            if (
                !props.lockedAccountPublicId &&
                (filterAccountId.value || filterTierId.value || filterRecurringExpenseId.value || filterRecurringIncomeId.value)
            ) {
                const dropTier = !!filterTierId.value;
                const dropRecurring = !!(filterRecurringExpenseId.value || filterRecurringIncomeId.value);
                await store
                    .loadList({
                        accountPublicId: dropTier || dropRecurring ? (filterAccountId.value ?? undefined) : undefined,
                        from: filterFrom.value ?? undefined,
                        to: filterTo.value ?? undefined,
                        categoryPublicId: filterCategoryId.value ?? undefined,
                        force: true
                    })
                    .catch(() => undefined);
                await router.replace({
                    path: '/app/finances/transactions',
                    query: {
                        ...(dropTier || dropRecurring ? (filterAccountId.value ? { account: filterAccountId.value } : {}) : {}),
                        ...(filterType.value ? { type: filterType.value } : {}),
                        ...(filterFrom.value ? { from: filterFrom.value } : {}),
                        ...(filterTo.value ? { to: filterTo.value } : {}),
                        ...(filterCategoryId.value ? { category: filterCategoryId.value } : {}),
                        ...(filterPaymentMethodId.value ? { paymentMethod: filterPaymentMethodId.value } : {}),
                        ...(queryString('budget') ? { budget: queryString('budget') } : {}),
                        ...(filterSearch.value ? { q: filterSearch.value } : {}),
                        ...(listSort.value !== TRANSACTION_SORT_DEFAULT ? { sort: listSort.value } : {})
                    }
                });
            }
            return;
        }
        localError.value = getErrorMessage(e);
    }
}

function onVisibilityChange() {
    if (document.visibilityState !== 'visible' || !store.initialized) return;
    void loadTimeline(true).catch(() => undefined);
}

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void loadTimeline().catch(() => undefined);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    clearAddUndo();
});

function openCreate() {
    if (!canCreate.value) return;
    createOpen.value = true;
}

defineExpose({ openCreate });

watch(
    () =>
        [
            filterAccountId.value,
            filterFrom.value,
            filterTo.value,
            filterCategoryId.value,
            filterTierId.value,
            filterPaymentMethodId.value,
            filterRecurringExpenseId.value,
            filterRecurringIncomeId.value,
            filterMinAmount.value,
            filterMaxAmount.value,
            filterBudgetId.value,
            envelopeBudget.value?.publicId
        ] as const,
    () => {
        void loadTimeline().catch(() => undefined);
    }
);

watch(filterSearch, (query, previous) => {
    if (query) hasSearched.value = true;
    if (query || previous) searchRevealKey.value += 1;
});

async function confirmDelete() {
    if (!deleteTarget.value) return;
    localError.value = null;
    try {
        await store.deleteTransaction(deleteTarget.value.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('transactionsPage.errors.notFound') : getErrorMessage(e);
        if (err.status === 404) {
            deleteTarget.value = null;
            void loadTimeline(true).catch(() => undefined);
        }
    }
}
</script>

<template>
    <div>
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

        <div v-if="store.loading && !store.items.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <div
            v-else-if="!visibleItems.length"
            :key="`empty-${searchRevealKey}`"
            class="su-empty"
            :class="{ 'is-search-reveal': searchReveals }"
        >
            {{ emptyCopy }}
        </div>
        <div v-else class="su-stack">
            <section v-for="group in dateGroups" :key="group.date" class="su-surface transaction-timeline__group">
                <header v-if="group.label" class="su-panel__head">
                    <div>
                        <h2>{{ group.label }}</h2>
                    </div>
                </header>
                <v-list :key="searchRevealKey" class="py-0 transaction-timeline__list" :class="{ 'is-search-reveal': searchReveals }">
                    <TransactionListItem
                        v-for="transaction in group.items"
                        :key="transaction.publicId"
                        :transaction="transaction"
                        :can-write="canWriteItem(transaction)"
                        :acting="store.acting"
                        :statement-account-public-id="filterAccountId"
                        :envelope-action="envelopeActionFor(transaction)"
                        :style="{ '--i': searchAppearIndex.get(transaction.publicId) ?? 0 }"
                        @edit="editTarget = $event"
                        @delete="deleteTarget = $event"
                        @envelope="onEnvelopeAction"
                    />
                </v-list>
            </section>
        </div>

        <div v-if="store.hasMore" class="su-more">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.loadingMore" @click="store.loadMore()">
                {{ t('transactionsPage.loadMore') }}
            </button>
        </div>

        <TransactionFormModal v-model="createOpen" :default-account-public-id="filterAccountId" :default-type="filterType" />
        <TransactionFormModal v-model="editOpen" :transaction="editTarget" />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('transactionsPage.deleteModal.title')"
            :message="t('transactionsPage.deleteModal.body')"
            :confirm-label="t('transactionsPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />

        <AppConfirmationModal
            v-model="unlinkOpen"
            :title="t('transactionsPage.envelope.unlinkModal.title')"
            :message="t('transactionsPage.envelope.unlinkModal.body')"
            :confirm-label="t('transactionsPage.envelope.remove')"
            :loading="store.acting"
            @confirm="confirmUnlink"
        />

        <Teleport to="body">
            <div v-if="addUndo" class="budget-add-toast" role="status">
                <p class="budget-add-toast__text">{{ t('transactionsPage.envelope.addedToast', { name: addUndo.label }) }}</p>
                <button type="button" class="budget-add-toast__undo" :disabled="store.acting" @click="undoAddToBudget">
                    {{ t('common.cancel') }}
                </button>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
.transaction-timeline__group {
    padding: 8px;
    overflow: visible;
}

.transaction-timeline__group :deep(.su-panel__head) {
    padding: 8px 8px 4px;
}

.transaction-timeline__list {
    overflow: visible !important;
    background: transparent;
    /* Gutter for scale(1.012) so the 8px of the surface stays visible after hover. */
    padding: 8px;
}

.budget-add-toast {
    position: fixed;
    top: calc(var(--header-h, 68px) + 10px);
    right: 16px;
    z-index: 40;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-width: min(360px, calc(100vw - 24px));
    padding: 4px 4px 4px 12px;
    border-radius: 999px;
    border: 1px solid var(--stroke);
    background: var(--surface);
    box-shadow: 0 10px 28px -20px rgba(16, 16, 20, 0.4);
    backdrop-filter: var(--blur);
    color: var(--ink-mute);
    animation: su-in 0.45s var(--ease) both;
}

.budget-add-toast__text {
    margin: 0;
    min-width: 0;
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12.5px;
    font-weight: 520;
    letter-spacing: -0.01em;
    line-height: 1.3;
}

.budget-add-toast__undo {
    appearance: none;
    flex: none;
    height: 28px;
    padding: 0 10px;
    border: 0;
    border-radius: 14px;
    background: transparent;
    color: var(--ink-soft);
    font: inherit;
    font-size: 12.5px;
    font-weight: 620;
    cursor: pointer;
}

.budget-add-toast__undo:hover:not(:disabled) {
    background: var(--surface-hover);
    color: var(--ink);
}

.budget-add-toast__undo:disabled {
    opacity: 0.45;
    cursor: default;
}

@media (max-width: 959.98px) {
    .budget-add-toast {
        top: calc(var(--header-h-mobile, 58px) + 10px);
        right: 10px;
    }
}
</style>
