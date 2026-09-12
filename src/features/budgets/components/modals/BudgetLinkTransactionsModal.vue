<script setup lang="ts">
/**
 * Picker de dépenses de la fenêtre courante, pas encore comptées dans l’enveloppe.
 * Confirmer assigne la catégorie du budget (le consommé est recalculé à la lecture).
 */
defineOptions({ name: 'BudgetLinkTransactionsModal' });

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { SearchIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppCheckbox from '@/components/shared/checkbox/AppCheckbox.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import {
    budgetLinkedCategoryIds,
    isTransactionLinkableToBudget,
    transactionFormFieldsWithCategory
} from '@/features/budgets/link-transactions';
import { useBudgetsStore } from '@/features/budgets/stores/budgets-store';
import type { Budget } from '@/features/budgets/types';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';
import {
    formatOperationDate,
    matchesTransactionSearch,
    resolveTransactionAmountDisplay
} from '@/features/transactions/format';
import { useTransactionsStore } from '@/features/transactions/stores/transactions-store';
import { TRANSACTION_PAGE_SIZE_MAX, TRANSACTION_SEARCH_MAX, type Transaction } from '@/features/transactions/types';

const props = defineProps<{
    modelValue: boolean;
    budget: Budget | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    linked: [];
}>();

const { t, locale } = useI18n();
const accountsStore = useAccountsStore();
const budgetsStore = useBudgetsStore();
const categoriesStore = useCategoriesStore();
const transactionsStore = useTransactionsStore();

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const localError = ref<string | null>(null);
const search = ref('');
const selectedIds = ref<string[]>([]);
const linking = ref(false);

const linkedCategoryIds = computed(() =>
    props.budget ? budgetLinkedCategoryIds(props.budget, categoriesStore.items) : new Set<string>()
);

const candidates = computed(() => {
    const budget = props.budget;
    if (!budget) return [];
    const ids = linkedCategoryIds.value;
    return transactionsStore.items.filter((item) =>
        isTransactionLinkableToBudget(item, budget, ids, accountsStore.accounts)
    );
});

const visibleItems = computed(() => {
    const needle = search.value.trim();
    if (!needle) return candidates.value;
    return candidates.value.filter((item) =>
        matchesTransactionSearch(item, needle, {
            typeLabel: t(`transactionsPage.types.${item.type}`),
            accountNames: [],
            categoryName: item.categoryPublicId ? (categoriesStore.findByPublicId(item.categoryPublicId)?.name ?? null) : null,
            tierHaystack: null,
            paymentMethodLabel: null,
            amountText: resolveTransactionAmountDisplay(item.amount, item.currency, locale.value).text
        })
    );
});

const selectedCount = computed(() => selectedIds.value.length);
const allVisibleSelected = computed(
    () => visibleItems.value.length > 0 && visibleItems.value.every((item) => selectedIds.value.includes(item.publicId))
);

const categoryName = computed(() => {
    const id = props.budget?.categoryPublicId;
    if (!id) return '';
    return categoriesStore.findByPublicId(id)?.name ?? t('budgetsPage.scope.unknownCategory');
});

const confirmLabel = computed(() =>
    t('budgetsPage.linkTransactions.confirm', { count: selectedCount.value }, selectedCount.value)
);

function categoryLabel(transaction: Transaction): string {
    if (!transaction.categoryPublicId) return t('budgetsPage.linkTransactions.uncategorized');
    return categoriesStore.findByPublicId(transaction.categoryPublicId)?.name ?? t('budgetsPage.scope.unknownCategory');
}

function amountText(transaction: Transaction): string {
    return resolveTransactionAmountDisplay(transaction.amount, transaction.currency, locale.value).text;
}

function isSelected(publicId: string): boolean {
    return selectedIds.value.includes(publicId);
}

function toggle(publicId: string, value: boolean | null) {
    if (value) {
        if (!selectedIds.value.includes(publicId)) selectedIds.value = [...selectedIds.value, publicId];
        return;
    }
    selectedIds.value = selectedIds.value.filter((id) => id !== publicId);
}

function selectAllVisible() {
    const next = new Set(selectedIds.value);
    for (const item of visibleItems.value) next.add(item.publicId);
    selectedIds.value = [...next];
}

function selectNone() {
    selectedIds.value = [];
}

async function loadCandidates() {
    const budget = props.budget;
    if (!budget) return;
    localError.value = null;
    try {
        await Promise.all([
            accountsStore.loadAccounts(),
            categoriesStore.loadList().catch(() => undefined)
        ]);
        await transactionsStore.loadList({
            from: budget.periodStart,
            to: budget.periodEnd,
            pageSize: TRANSACTION_PAGE_SIZE_MAX,
            force: true
        });
        let guard = 0;
        while (transactionsStore.hasMore && guard++ < 30) {
            await transactionsStore.loadMore();
        }
        selectedIds.value = selectedIds.value.filter((id) => candidates.value.some((item) => item.publicId === id));
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        search.value = '';
        selectedIds.value = [];
        localError.value = null;
        void loadCandidates();
    }
);

async function onConfirm() {
    const budget = props.budget;
    const categoryPublicId = budget?.categoryPublicId?.trim();
    if (!budget || !categoryPublicId || !selectedCount.value) return;
    linking.value = true;
    localError.value = null;
    const chosen = candidates.value.filter((item) => selectedIds.value.includes(item.publicId));
    try {
        for (const item of chosen) {
            const fields = transactionFormFieldsWithCategory(item, categoryPublicId);
            if (!fields) continue;
            await transactionsStore.updateTransaction(item.publicId, fields);
        }
        await budgetsStore.fetchBudget(budget.publicId, true).catch(() => undefined);
        emit('linked');
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('transactionsPage.errors.notFound') : getErrorMessage(e);
        await loadCandidates();
    } finally {
        linking.value = false;
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t('budgetsPage.linkTransactions.title')"
        :subtitle="t('budgetsPage.linkTransactions.subtitle', { category: categoryName })"
        :max-width="640"
        :height="720"
        scrollable
        mobile-layout="fullscreen"
        :persistent="linking"
    >
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">
            {{ localError }}
        </AppAlert>

        <label class="su-search su-search--discover mb-3">
            <SearchIcon class="su-search__icon" :size="18" stroke-width="1.8" />
            <input
                v-model="search"
                class="su-search__input"
                type="search"
                :maxlength="TRANSACTION_SEARCH_MAX"
                :placeholder="t('budgetsPage.linkTransactions.searchPlaceholder')"
                :aria-label="t('budgetsPage.linkTransactions.searchPlaceholder')"
                autocomplete="off"
            />
        </label>

        <div class="budget-link-tx__toolbar">
            <span class="text-caption text-medium-emphasis">
                {{ t('budgetsPage.linkTransactions.selected', { count: selectedCount }, selectedCount) }}
            </span>
            <div class="d-flex ga-2">
                <button type="button" class="su-btn su-btn--ghost" :disabled="linking || allVisibleSelected" @click="selectAllVisible">
                    {{ t('budgetsPage.linkTransactions.selectAll') }}
                </button>
                <button type="button" class="su-btn su-btn--ghost" :disabled="linking || !selectedCount" @click="selectNone">
                    {{ t('budgetsPage.linkTransactions.selectNone') }}
                </button>
            </div>
        </div>

        <div v-if="transactionsStore.loading && !candidates.length" class="su-loading"><span class="su-spin" /></div>
        <p v-else-if="!visibleItems.length" class="text-medium-emphasis">
            {{ search.trim() ? t('budgetsPage.linkTransactions.emptyFiltered') : t('budgetsPage.linkTransactions.empty') }}
        </p>
        <div v-else class="budget-link-tx__list" role="list">
            <button
                v-for="item in visibleItems"
                :key="item.publicId"
                type="button"
                class="budget-link-tx__row"
                :class="{ 'is-selected': isSelected(item.publicId) }"
                role="listitem"
                :disabled="linking"
                @click="toggle(item.publicId, !isSelected(item.publicId))"
            >
                <AppCheckbox
                    :model-value="isSelected(item.publicId)"
                    density="compact"
                    :disabled="linking"
                    :aria-label="item.label"
                    @click.stop
                    @update:model-value="(value) => toggle(item.publicId, !!value)"
                />
                <span class="budget-link-tx__meta">
                    <span class="budget-link-tx__name">{{ item.label }}</span>
                    <span class="budget-link-tx__sub">
                        {{ formatOperationDate(item.operationDate, locale) }} · {{ categoryLabel(item) }}
                    </span>
                </span>
                <span class="budget-link-tx__amount">{{ amountText(item) }}</span>
            </button>
        </div>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="linking" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="linking || !selectedCount" @click="onConfirm">
                {{ confirmLabel }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.budget-link-tx__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
}

.budget-link-tx__list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.budget-link-tx__row {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid transparent;
    border-radius: 14px;
    background: var(--surface-raised);
    color: inherit;
    text-align: left;
    cursor: pointer;
}

.budget-link-tx__row:hover:not(:disabled) {
    border-color: var(--thread);
}

.budget-link-tx__row.is-selected {
    border-color: rgb(var(--v-theme-primary));
}

.budget-link-tx__meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1 1 auto;
    gap: 2px;
}

.budget-link-tx__name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.budget-link-tx__sub,
.budget-link-tx__amount {
    font-size: 0.8125rem;
    color: rgba(var(--v-theme-on-surface), 0.64);
}

.budget-link-tx__amount {
    flex: 0 0 auto;
    font-variant-numeric: tabular-nums;
}
</style>
