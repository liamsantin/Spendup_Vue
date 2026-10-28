<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { amountInFilterRange, parseAmountFilter } from '@/components/shared/dropdown-filter/amount-range';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { useAssetsStore } from '@/features/assets/stores/assets-store';
import { useBudgetsStore } from '@/features/budgets/stores/budgets-store';
import { parseBudgetTransactionScope } from '@/features/budgets/paths';
import {
    budgetLinkedCategoryIds,
    isTransactionCountedInBudget,
    isTransactionLinkableToBudget,
    transactionFormFieldsWithCategory
} from '@/features/budgets/link-transactions';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';
import { useTagsStore } from '@/features/tags/stores/tags-store';
import { useTiersStore } from '@/features/tiers/stores/tiers-store';
import { canWriteTransaction, canWriteTransactions } from '@/features/transactions/rights';
import {
    formatOperationDate,
    involvedAccountPublicIds,
    matchesTransactionSearch,
    parseTransactionSort,
    resolveTransactionAmountDisplay,
    sortTransactions,
    sourceAccountPublicId,
    targetAccountPublicId,
    TRANSACTION_SORT_DEFAULT
} from '@/features/transactions/format';
import { downloadCsv } from '@/utils/helpers/csv';
import { amountSignOf, signedTransactionAmount } from '@/features/transactions/composables/useTransactionRowDisplay';
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
    /** Si défini, charge `GET /api/transactions?assetPublicId=` (fiche d’actif) et ignore la query. */
    lockedAssetPublicId?: string | null;
}>();

/** Agrégats calculés sur la liste chargée (le store n'expose pas de totaux). */
export type TransactionsSummary = {
    count: number;
    currency: string;
    inflow: number;
    inflowCount: number;
    outflow: number;
    outflowCount: number;
    net: number;
    /** « Octobre 2026 » si toutes les opérations visibles sont du même mois, sinon `null`. */
    monthLabel: string | null;
};

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const accountsStore = useAccountsStore();
const assetsStore = useAssetsStore();
const budgetsStore = useBudgetsStore();
const categoriesStore = useCategoriesStore();
const tagsStore = useTagsStore();
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

/** Fiche compte ou fiche d’actif : la query de la page (onglet, recherche d’annuaire) ne filtre pas les transactions. */
const isolateFilters = computed(() => !!(props.lockedAccountPublicId?.trim() || props.lockedAssetPublicId?.trim()));
const filterAccountId = computed(() => props.lockedAccountPublicId?.trim() || (isolateFilters.value ? null : queryString('account')));
const filterAssetId = computed(() => props.lockedAssetPublicId?.trim() || null);
const filterFrom = computed(() => (isolateFilters.value ? null : queryString('from')));
const filterTo = computed(() => (isolateFilters.value ? null : queryString('to')));
const filterCategoryId = computed(() => (isolateFilters.value ? null : queryString('category')));
const filterTagId = computed(() => (isolateFilters.value ? null : queryString('tag')));
const filterTierId = computed(() => (isolateFilters.value ? null : queryString('tier')));
const filterPaymentMethodId = computed(() => (isolateFilters.value ? null : queryString('paymentMethod')));
const filterRecurringExpenseId = computed(() => (isolateFilters.value ? null : queryString('recurringExpensePublicId')));
const filterRecurringIncomeId = computed(() => (isolateFilters.value ? null : queryString('recurringIncomePublicId')));
const filterSearch = computed(() => {
    if (isolateFilters.value) return null;
    return queryString('q')?.slice(0, TRANSACTION_SEARCH_MAX) ?? null;
});
const filterType = computed<TransactionType | null>(() => {
    if (isolateFilters.value) return null;
    const raw = queryString('type');
    return raw && TRANSACTION_TYPES.includes(raw as TransactionType) ? (raw as TransactionType) : null;
});
const listSort = computed(() => (isolateFilters.value ? TRANSACTION_SORT_DEFAULT : parseTransactionSort(queryString('sort'))));
const filterMinAmount = computed(() => (isolateFilters.value ? null : parseAmountFilter(queryString('minAmount'))));
const filterMaxAmount = computed(() => (isolateFilters.value ? null : parseAmountFilter(queryString('maxAmount'))));
const filterBudgetId = computed(() => (isolateFilters.value ? null : queryString('budget')));
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
    () => filterMinAmount.value != null || filterMaxAmount.value != null || !!filterPaymentMethodId.value || !!filterBudgetId.value
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
            tagNames: (item.tagPublicIds ?? []).map((id) => tagsStore.findByPublicId(id)?.name).filter((name): name is string => !!name),
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
    if (filterAssetId.value) return t('transactionsPage.empty.asset');
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

function capitalize(value: string): string {
    return value ? value.charAt(0).toLocaleUpperCase(locale.value) + value.slice(1) : value;
}

/** Date calendaire `YYYY-MM-DD` → midi UTC (pas de décalage de fuseau à l'affichage). */
function calendarDate(ymd: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd.trim());
    if (!match) return null;
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
}

function formatSignedTotal(value: number, currency: string): string {
    return `${amountSignOf(value)}${resolveTransactionAmountDisplay(Math.abs(value), currency, locale.value).text}`;
}

/** Total d'un jour : somme des montants signés connus ; `null` si aucun montant n'est lisible. */
function sumSigned(items: readonly Transaction[]): number | null {
    let total: number | null = null;
    for (const item of items) {
        const signed = signedTransactionAmount(item, filterAccountId.value);
        if (signed == null) continue;
        total = (total ?? 0) + signed;
    }
    return total;
}

const dateGroups = computed(() => {
    if (!groupByDate.value) {
        return [{ date: '_', label: '', day: '', weekday: '', total: null as string | null, totalTone: '', items: visibleItems.value }];
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
    const dayFormat = new Intl.DateTimeFormat(locale.value, { day: 'numeric', timeZone: 'UTC' });
    const weekdayFormat = new Intl.DateTimeFormat(locale.value, { weekday: 'long', timeZone: 'UTC' });
    return order.map((date) => {
        const items = map.get(date)!;
        const parsed = calendarDate(date);
        const total = sumSigned(items);
        const currency = items[0]?.currency ?? 'CHF';
        return {
            date,
            label: formatOperationDate(date, locale.value),
            day: parsed ? dayFormat.format(parsed) : date,
            weekday: parsed ? capitalize(weekdayFormat.format(parsed)) : '',
            total: total == null ? null : formatSignedTotal(total, currency),
            totalTone: total != null && total > 0 ? 'is-credit' : '',
            items
        };
    });
});

/** Entrées / sorties / solde net sur la liste visible (une seule devise, sinon `null`). */
const summary = computed<TransactionsSummary | null>(() => {
    const items = visibleItems.value;
    if (!items.length) return null;
    const currency = items[0]!.currency;
    if (items.some((item) => item.currency !== currency)) return null;
    let inflow = 0;
    let inflowCount = 0;
    let outflow = 0;
    let outflowCount = 0;
    for (const item of items) {
        const signed = signedTransactionAmount(item, filterAccountId.value);
        if (signed == null) continue;
        if (signed > 0) {
            inflow += signed;
            inflowCount += 1;
        } else if (signed < 0) {
            outflow += -signed;
            outflowCount += 1;
        }
    }
    const months = new Set(items.map((item) => item.operationDate.slice(0, 7)));
    let monthLabel: string | null = null;
    if (months.size === 1) {
        const parsed = calendarDate(`${items[0]!.operationDate.slice(0, 7)}-01`);
        if (parsed) {
            monthLabel = capitalize(
                new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(parsed)
            );
        }
    }
    return { count: items.length, currency, inflow, inflowCount, outflow, outflowCount, net: inflow - outflow, monthLabel };
});

const loadedLabel = computed(() => t('transactionsPage.shownOf', { shown: store.items.length, total: store.totalCount }));

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

const showUnlinkInForm = computed(() => {
    const tx = editTarget.value;
    if (!tx || !envelopeBudget.value?.categoryPublicId) return false;
    if (envelopeScope.value !== 'in') return false;
    return canWriteItem(tx);
});

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
    if (ok) {
        unlinkTarget.value = null;
        editTarget.value = null;
    }
}

function onUnlinkFromForm() {
    if (editTarget.value) unlinkTarget.value = editTarget.value;
}

async function loadTimeline(force = false) {
    localError.value = null;
    try {
        await accountsStore.loadAccounts(force);
        await Promise.all([
            store.loadList({
                accountPublicId: filterAccountId.value ?? undefined,
                categoryPublicId: filterBudgetId.value ? undefined : (filterCategoryId.value ?? undefined),
                tagPublicId: filterTagId.value ?? undefined,
                tierPublicId: filterTierId.value ?? undefined,
                recurringExpensePublicId: filterRecurringExpenseId.value ?? undefined,
                recurringIncomePublicId: filterRecurringIncomeId.value ?? undefined,
                assetPublicId: filterAssetId.value ?? undefined,
                from: filterFrom.value ?? undefined,
                to: filterTo.value ?? undefined,
                search: filterSearch.value ?? undefined,
                pageSize: needsClientFullScan.value ? TRANSACTION_PAGE_SIZE_MAX : TRANSACTION_PAGE_SIZE_DEFAULT,
                force
            }),
            categoriesStore.loadList({ force }).catch(() => undefined),
            tagsStore.loadList({ force }).catch(() => undefined),
            tiersStore.loadList({ pageSize: TIER_PAGE_SIZE_MAX, force }).catch(() => undefined),
            paymentMethodsStore.loadList({ force }).catch(() => undefined),
            assetsStore.loadList().catch(() => undefined)
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
            // 404 : compte inconnu, tag/tier/récurrence filtrés qui n’appartiennent pas (plus) à l’utilisateur → on retire le filtre fautif.
            if (
                !isolateFilters.value &&
                (filterAccountId.value ||
                    filterTagId.value ||
                    filterTierId.value ||
                    filterRecurringExpenseId.value ||
                    filterRecurringIncomeId.value)
            ) {
                const dropTier = !!filterTierId.value;
                const dropTag = !!filterTagId.value;
                const dropRecurring = !!(filterRecurringExpenseId.value || filterRecurringIncomeId.value);
                await store
                    .loadList({
                        accountPublicId: dropTier || dropTag || dropRecurring ? (filterAccountId.value ?? undefined) : undefined,
                        from: filterFrom.value ?? undefined,
                        to: filterTo.value ?? undefined,
                        categoryPublicId: filterCategoryId.value ?? undefined,
                        force: true
                    })
                    .catch(() => undefined);
                await router.replace({
                    path: '/app/finances/transactions',
                    query: {
                        ...(dropTier || dropTag || dropRecurring ? (filterAccountId.value ? { account: filterAccountId.value } : {}) : {}),
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

function accountNameOf(publicId: string | null): string {
    if (!publicId) return '';
    return accountsStore.accounts.find((account) => account.publicId === publicId)?.name ?? t('transactionsPage.unknownAccount');
}

function exportCsv() {
    const header = (['date', 'label', 'type', 'account', 'category', 'tier', 'amount', 'currency'] as const).map((key) =>
        t(`transactionsPage.columns.${key}`)
    );
    const rows = visibleItems.value.map((item) => {
        const account =
            item.type === 'transfert'
                ? t('transactionsPage.list.transferLine', {
                      from: accountNameOf(sourceAccountPublicId(item)),
                      to: accountNameOf(targetAccountPublicId(item))
                  })
                : accountNameOf(sourceAccountPublicId(item));
        return [
            item.operationDate,
            item.label,
            t(`transactionsPage.types.${item.type}`),
            account,
            item.categoryPublicId ? (categoriesStore.findByPublicId(item.categoryPublicId)?.name ?? '') : '',
            item.tierPublicId ? (tiersStore.findByPublicId(item.tierPublicId)?.name ?? '') : '',
            item.amount,
            item.currency
        ];
    });
    downloadCsv('transactions', header, rows);
}

const visibleCount = computed(() => visibleItems.value.length);

defineExpose({ openCreate, exportCsv, visibleCount, summary });

watch(
    () =>
        [
            filterAccountId.value,
            filterAssetId.value,
            filterFrom.value,
            filterTo.value,
            filterCategoryId.value,
            filterTagId.value,
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

// La query `q` est déjà écrite après un délai (`useBoardSearch`) : chaque valeur recharge la liste côté serveur.
watch(filterSearch, (query, previous) => {
    if (query) hasSearched.value = true;
    if (query || previous) searchRevealKey.value += 1;
    if ((query ?? '') !== (previous ?? '')) void loadTimeline().catch(() => undefined);
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
    <div class="timeline-panel">
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
            <p>{{ emptyCopy }}</p>
        </div>
        <div v-else class="tx-days" :class="{ 'tx-days--flat': !groupByDate }">
            <section v-for="group in dateGroups" :key="group.date" class="tx-day">
                <header v-if="groupByDate" class="tx-day__head">
                    <p class="tx-day__num">{{ group.day }}</p>
                    <p class="tx-day__weekday">{{ group.weekday }}</p>
                    <p class="tx-day__count">{{ t('transactionsPage.operations', { count: group.items.length }, group.items.length) }}</p>
                    <p v-if="group.total" class="tx-day__total" :class="group.totalTone">{{ group.total }}</p>
                </header>
                <div :key="searchRevealKey" class="tx-day__rows" :class="{ 'is-search-reveal': searchReveals }">
                    <TransactionListItem
                        v-for="transaction in group.items"
                        :key="transaction.publicId"
                        :transaction="transaction"
                        :can-write="canWriteItem(transaction)"
                        :acting="store.acting"
                        :statement-account-public-id="filterAccountId"
                        :envelope-action="envelopeActionFor(transaction)"
                        :show-date="!groupByDate"
                        :style="{ '--i': searchAppearIndex.get(transaction.publicId) ?? 0 }"
                        @edit="editTarget = $event"
                        @delete="deleteTarget = $event"
                        @envelope="onEnvelopeAction"
                    />
                </div>
            </section>
        </div>

        <footer v-if="store.hasMore && visibleItems.length" class="tx-more">
            <p class="tx-more__count">{{ loadedLabel }}</p>
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.loadingMore" @click="store.loadMore()">
                {{ t('transactionsPage.loadMore') }}
            </button>
        </footer>

        <TransactionFormModal
            v-model="createOpen"
            :default-account-public-id="filterAccountId"
            :default-type="filterType"
            :default-asset-public-id="filterAssetId"
        />
        <TransactionFormModal
            v-model="editOpen"
            :transaction="editTarget"
            :show-unlink-from-budget="showUnlinkInForm"
            @unlink="onUnlinkFromForm"
        />

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
                <button type="button" class="su-btn su-btn--sm budget-add-toast__undo" :disabled="store.acting" @click="undoAddToBudget">
                    {{ t('common.cancel') }}
                </button>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
.timeline-panel {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.tx-days {
    display: flex;
    flex-direction: column;
}

/* ── journée façon horaire CFF : filet 2 px, colonne jour 132 px | lignes ── */
.tx-day {
    display: grid;
    grid-template-columns: 132px minmax(0, 1fr);
    gap: 24px;
    padding: 16px 0 12px;
    border-top: 1px solid var(--line);
}

.tx-days--flat .tx-day {
    display: block;
    padding: 0;
}

.tx-day__head {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
    padding-top: 2px;
}

.tx-day__head p {
    margin: 0;
}

/* numéro du jour 48 px 700, lettrage −0.06em */
.tx-day__num {
    font-size: 36px;
    font-weight: 700;
    letter-spacing: -0.06em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
}

.tx-day__weekday {
    margin-top: 6px !important;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.3;
}

.tx-day__count {
    margin-top: 2px !important;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.3;
}

/* total du jour 700 : bleu avec « + » si positif, noir avec « − » sinon */
.tx-day__total {
    margin-top: 6px !important;
    color: var(--ink);
    font-size: 14px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.tx-day__total.is-credit {
    color: var(--blue-ink);
}

.tx-day__rows > :deep(:first-child) {
    border-top: 0;
}

.tx-day__rows {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

/* ── bas de liste : « N affichées sur M » à gauche, « Charger plus » à droite ── */
.tx-more {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 16px;
    padding: 16px 0 0;
    border-top: 1px solid var(--line);
}

.tx-more__count {
    margin: 0;
    color: var(--gray);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}

/* ── toast « ajoutée au budget » : carré, bordure noire, ombre décalée ── */
.budget-add-toast {
    position: fixed;
    top: calc(var(--header-h, 72px) + 12px);
    right: 24px;
    z-index: 40;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    max-width: min(400px, calc(100vw - 24px));
    padding: 8px 8px 8px 16px;
    border: 1px solid var(--ink);
    border-radius: 0;
    background: var(--raise);
    box-shadow: var(--shadow-offset);
    color: var(--ink);
    font-family: var(--font-ui);
    animation: su-in 0.25s var(--ease) both;
}

.budget-add-toast__text {
    margin: 0;
    min-width: 0;
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    line-height: 1.3;
}

.budget-add-toast__undo {
    flex: none;
}

@media (max-width: 959.98px) {
    .budget-add-toast {
        top: calc(var(--header-h-mobile, 56px) + 10px);
        right: 12px;
    }
}

@media (max-width: 767px) {
    /* mobile : la colonne jour devient une ligne d'en-tête (numéro 32 px + jour + total) */
    .tx-day {
        display: block;
        padding: 14px 0 4px;
    }

    .tx-day__head {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        grid-template-areas:
            'num weekday total'
            'num count total';
        align-items: center;
        column-gap: 12px;
        padding: 0 0 8px;
    }

    .tx-day__num {
        grid-area: num;
        font-size: 32px;
    }

    .tx-day__weekday {
        grid-area: weekday;
        margin-top: 0 !important;
        align-self: end;
    }

    .tx-day__count {
        grid-area: count;
        margin-top: 0 !important;
        align-self: start;
    }

    .tx-day__total {
        grid-area: total;
        margin-top: 0 !important;
        text-align: right;
    }

    .tx-day__rows {
        border-top: 1px solid var(--line);
    }

    .tx-days--flat .tx-day__rows {
        border-top: 0;
    }

    .tx-more {
        flex-direction: column;
        align-items: stretch;
    }

    .tx-more .su-btn {
        width: 100%;
    }
}
</style>
