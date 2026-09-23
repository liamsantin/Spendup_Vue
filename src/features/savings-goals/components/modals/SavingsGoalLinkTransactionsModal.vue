<script setup lang="ts">
/**
 * Picker de transactions qui touchent le compte de l’objectif.
 * `link` : pas encore rattachées — confirmer envoie `savingsGoalPublicId`.
 * `unlink` : déjà rattachées — confirmer envoie `null`.
 */
defineOptions({ name: 'SavingsGoalLinkTransactionsModal' });

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { SearchIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppCheckbox from '@/components/shared/checkbox/AppCheckbox.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import {
    isTransactionLinkableToSavingsGoal,
    isTransactionUnlinkableFromSavingsGoal,
    transactionFormFieldsWithSavingsGoal
} from '@/features/savings-goals/link-transactions';
import { useSavingsGoalsStore } from '@/features/savings-goals/stores/savings-goals-store';
import type { SavingsGoal } from '@/features/savings-goals/types';
import { formatOperationDate, matchesTransactionSearch, resolveTransactionAmountDisplay } from '@/features/transactions/format';
import { useTransactionsStore } from '@/features/transactions/stores/transactions-store';
import { TRANSACTION_PAGE_SIZE_MAX, TRANSACTION_SEARCH_MAX, type Transaction } from '@/features/transactions/types';

const props = withDefaults(
    defineProps<{
        modelValue: boolean;
        savingsGoal: SavingsGoal | null;
        mode?: 'link' | 'unlink';
    }>(),
    { mode: 'link' }
);

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    linked: [];
}>();

const { t, locale } = useI18n();
const accountsStore = useAccountsStore();
const savingsGoalsStore = useSavingsGoalsStore();
const transactionsStore = useTransactionsStore();

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const localError = ref<string | null>(null);
const search = ref('');
const selectedIds = ref<string[]>([]);
const linking = ref(false);

const isUnlink = computed(() => props.mode === 'unlink');
const i18nPrefix = computed(() => (isUnlink.value ? 'savingsGoalsPage.unlinkTransactions' : 'savingsGoalsPage.linkTransactions'));

const candidates = computed(() => {
    const goal = props.savingsGoal;
    if (!goal) return [];
    const predicate = isUnlink.value ? isTransactionUnlinkableFromSavingsGoal : isTransactionLinkableToSavingsGoal;
    return transactionsStore.items.filter((item) => predicate(item, goal, accountsStore.accounts));
});

const visibleItems = computed(() => {
    const needle = search.value.trim();
    if (!needle) return candidates.value;
    return candidates.value.filter((item) =>
        matchesTransactionSearch(item, needle, {
            typeLabel: t(`transactionsPage.types.${item.type}`),
            accountNames: [],
            categoryName: null,
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

const confirmLabel = computed(() => t(`${i18nPrefix.value}.confirm`, { count: selectedCount.value }, selectedCount.value));

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
    const goal = props.savingsGoal;
    const accountPublicId = goal?.accountPublicId?.trim();
    if (!goal || !accountPublicId) return;
    localError.value = null;
    try {
        await accountsStore.loadAccounts();
        await transactionsStore.loadList({
            accountPublicId,
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
    const goal = props.savingsGoal;
    if (!goal?.accountPublicId || !selectedCount.value) return;
    linking.value = true;
    localError.value = null;
    const chosen = candidates.value.filter((item) => selectedIds.value.includes(item.publicId));
    try {
        const nextGoalId = isUnlink.value ? '' : goal.publicId;
        for (const item of chosen) {
            const fields = transactionFormFieldsWithSavingsGoal(item, nextGoalId);
            if (!fields) continue;
            await transactionsStore.updateTransaction(item.publicId, fields);
        }
        await savingsGoalsStore.fetchSavingsGoal(goal.publicId, true).catch(() => undefined);
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
        :title="t(`${i18nPrefix}.title`)"
        :subtitle="t(`${i18nPrefix}.subtitle`)"
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
                :placeholder="t(`${i18nPrefix}.searchPlaceholder`)"
                :aria-label="t(`${i18nPrefix}.searchPlaceholder`)"
                autocomplete="off"
            />
        </label>

        <div class="goal-link-tx__toolbar">
            <span class="text-caption text-medium-emphasis">
                {{ t(`${i18nPrefix}.selected`, { count: selectedCount }, selectedCount) }}
            </span>
            <div class="d-flex ga-2">
                <button type="button" class="su-btn su-btn--ghost" :disabled="linking || allVisibleSelected" @click="selectAllVisible">
                    {{ t(`${i18nPrefix}.selectAll`) }}
                </button>
                <button type="button" class="su-btn su-btn--ghost" :disabled="linking || !selectedCount" @click="selectNone">
                    {{ t(`${i18nPrefix}.selectNone`) }}
                </button>
            </div>
        </div>

        <div v-if="transactionsStore.loading && !candidates.length" class="su-loading"><span class="su-spin" /></div>
        <p v-else-if="!visibleItems.length" class="text-medium-emphasis">
            {{ search.trim() ? t(`${i18nPrefix}.emptyFiltered`) : t(`${i18nPrefix}.empty`) }}
        </p>
        <div v-else class="goal-link-tx__list" role="list">
            <button
                v-for="item in visibleItems"
                :key="item.publicId"
                type="button"
                class="goal-link-tx__row"
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
                <span class="goal-link-tx__meta">
                    <span class="goal-link-tx__name">{{ item.label }}</span>
                    <span class="goal-link-tx__sub">
                        {{ formatOperationDate(item.operationDate, locale) }} · {{ t(`transactionsPage.types.${item.type}`) }}
                    </span>
                </span>
                <span class="goal-link-tx__amount">{{ amountText(item) }}</span>
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
.goal-link-tx__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
}

.goal-link-tx__list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.goal-link-tx__row {
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

.goal-link-tx__row:hover:not(:disabled) {
    border-color: var(--thread);
}

.goal-link-tx__row.is-selected {
    border-color: rgb(var(--v-theme-primary));
}

.goal-link-tx__meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1 1 auto;
    gap: 2px;
}

.goal-link-tx__name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.goal-link-tx__sub,
.goal-link-tx__amount {
    font-size: 0.8125rem;
    color: rgba(var(--v-theme-on-surface), 0.64);
}

.goal-link-tx__amount {
    flex: 0 0 auto;
    font-variant-numeric: tabular-nums;
}
</style>
