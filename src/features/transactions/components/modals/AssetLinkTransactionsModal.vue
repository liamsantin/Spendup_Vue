<script setup lang="ts">
/**
 * Rattache des transactions existantes à un actif (`PUT` avec `assetPublicId`).
 * La liste est chargée à part : elle ne remplace pas la liste de la fiche.
 */
defineOptions({ name: 'AssetLinkTransactionsModal' });

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { SearchIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppCheckbox from '@/components/shared/checkbox/AppCheckbox.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { ASSET_NOT_FOUND_MESSAGE } from '@/features/assets/types';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { transactionsApi } from '@/features/transactions/api';
import {
    formatOperationDate,
    matchesTransactionSearch,
    normalizeTransaction,
    resolveTransactionAmountDisplay,
    sourceAccountPublicId
} from '@/features/transactions/format';
import { isTransactionLinkableToAsset, transactionFormFieldsWithAsset } from '@/features/transactions/link-asset';
import { useTransactionsStore } from '@/features/transactions/stores/transactions-store';
import {
    TRANSACTION_ASSET_ALREADY_LINKED_MESSAGE,
    TRANSACTION_PAGE_SIZE_MAX,
    TRANSACTION_SEARCH_MAX,
    type Transaction
} from '@/features/transactions/types';

const props = defineProps<{
    modelValue: boolean;
    assetPublicId: string;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    linked: [];
}>();

const { t, locale } = useI18n();
const accountsStore = useAccountsStore();
const transactionsStore = useTransactionsStore();

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const localError = ref<string | null>(null);
const search = ref('');
const selectedIds = ref<string[]>([]);
const linking = ref(false);
const loading = ref(false);
const loaded = ref<Transaction[]>([]);

const i18nPrefix = 'transactionsPage.linkTransactions';

const candidates = computed(() => loaded.value.filter((item) => isTransactionLinkableToAsset(item, accountsStore.accounts)));

const visibleItems = computed(() => {
    const needle = search.value.trim();
    if (!needle) return candidates.value;
    return candidates.value.filter((item) =>
        matchesTransactionSearch(item, needle, {
            typeLabel: t(`transactionsPage.types.${item.type}`),
            accountNames: [accountName(item)],
            categoryName: null,
            tierHaystack: null,
            paymentMethodLabel: null,
            amountText: amountText(item)
        })
    );
});

const selectedCount = computed(() => selectedIds.value.length);
const allVisibleSelected = computed(
    () => visibleItems.value.length > 0 && visibleItems.value.every((item) => selectedIds.value.includes(item.publicId))
);
const confirmLabel = computed(() => t(`${i18nPrefix}.confirm`, { count: selectedCount.value }, selectedCount.value));

function amountText(transaction: Transaction): string {
    return resolveTransactionAmountDisplay(transaction.amount, transaction.currency, locale.value).text;
}

function accountName(transaction: Transaction): string {
    const id = sourceAccountPublicId(transaction);
    if (!id) return '';
    return accountsStore.accounts.find((account) => account.publicId === id)?.name ?? '';
}

function subLine(transaction: Transaction): string {
    const parts = [formatOperationDate(transaction.operationDate, locale.value), t(`transactionsPage.types.${transaction.type}`)];
    const account = accountName(transaction);
    if (account) parts.push(account);
    return parts.join(' · ');
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
    const assetPublicId = props.assetPublicId.trim();
    if (!assetPublicId) return;
    loading.value = true;
    localError.value = null;
    try {
        await accountsStore.loadAccounts();
        const collected: Transaction[] = [];
        let page = 1;
        let total = Number.POSITIVE_INFINITY;
        while (collected.length < total && page <= 30) {
            const result = await transactionsApi.list({ page, pageSize: TRANSACTION_PAGE_SIZE_MAX });
            const items = Array.isArray(result?.items) ? result.items : [];
            collected.push(...items.map((item) => normalizeTransaction(item)));
            total = result?.totalCount ?? collected.length;
            if (!items.length) break;
            page += 1;
        }
        loaded.value = collected;
        selectedIds.value = selectedIds.value.filter((id) => candidates.value.some((item) => item.publicId === id));
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    } finally {
        loading.value = false;
    }
}

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        search.value = '';
        selectedIds.value = [];
        loaded.value = [];
        localError.value = null;
        void loadCandidates();
    }
);

function linkErrorMessage(err: AppError): string {
    if (err.message === ASSET_NOT_FOUND_MESSAGE) return t('assetsPage.errors.notFound');
    if (err.message === TRANSACTION_ASSET_ALREADY_LINKED_MESSAGE) return t('transactionsPage.form.errors.assetAlreadyLinked');
    if (err.status === 404) return t('transactionsPage.errors.notFound');
    return getErrorMessage(err);
}

async function onConfirm() {
    const assetPublicId = props.assetPublicId.trim();
    if (!assetPublicId || !selectedCount.value) return;
    linking.value = true;
    localError.value = null;
    const chosen = candidates.value.filter((item) => selectedIds.value.includes(item.publicId));
    try {
        for (const item of chosen) {
            const fields = transactionFormFieldsWithAsset(item, assetPublicId);
            if (!fields) continue;
            await transactionsStore.updateTransaction(item.publicId, fields);
        }
        emit('linked');
        open.value = false;
    } catch (e: unknown) {
        localError.value = linkErrorMessage(AppError.fromUnknown(e));
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

        <div class="asset-link-tx__toolbar">
            <span>{{ t(`${i18nPrefix}.selected`, { count: selectedCount }, selectedCount) }}</span>
            <div class="d-flex ga-2">
                <button type="button" class="su-btn su-btn--ghost" :disabled="linking || allVisibleSelected" @click="selectAllVisible">
                    {{ t(`${i18nPrefix}.selectAll`) }}
                </button>
                <button type="button" class="su-btn su-btn--ghost" :disabled="linking || !selectedCount" @click="selectNone">
                    {{ t(`${i18nPrefix}.selectNone`) }}
                </button>
            </div>
        </div>

        <div v-if="loading && !candidates.length" class="su-loading"><span class="su-spin" /></div>
        <p v-else-if="!visibleItems.length" class="asset-link-tx__empty">
            {{ search.trim() ? t(`${i18nPrefix}.emptyFiltered`) : t(`${i18nPrefix}.empty`) }}
        </p>
        <div v-else class="asset-link-tx__list" role="list">
            <button
                v-for="item in visibleItems"
                :key="item.publicId"
                type="button"
                class="asset-link-tx__row"
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
                <span class="asset-link-tx__meta">
                    <span class="asset-link-tx__name">{{ item.label }}</span>
                    <span class="asset-link-tx__sub">{{ subLine(item) }}</span>
                </span>
                <span class="asset-link-tx__amount">{{ amountText(item) }}</span>
            </button>
        </div>

        <template #footer="{ close }">
            <button type="button" class="su-btn" :disabled="linking" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="linking || !selectedCount" @click="onConfirm">
                {{ confirmLabel }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.asset-link-tx__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
    color: var(--gray);
    font-size: 13px;
}

.asset-link-tx__toolbar .su-btn--ghost {
    height: 32px;
    min-height: 32px;
    padding: 0 10px;
    font-size: 13px;
}

.asset-link-tx__empty {
    margin: 0;
    color: var(--gray);
    font-size: 14px;
}

.asset-link-tx__list {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--line);
}

.asset-link-tx__row {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 52px;
    padding: 8px 8px 8px 4px;
    border: 0;
    border-top: 1px solid var(--line);
    box-shadow: inset 2px 0 0 transparent;
    background: transparent;
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition:
        background 0.15s var(--ease),
        box-shadow 0.15s var(--ease);
}

.asset-link-tx__list > .asset-link-tx__row:first-child {
    border-top: 0;
}

.asset-link-tx__row:hover:not(:disabled) {
    background: var(--soft);
}

.asset-link-tx__row.is-selected {
    background: var(--blue-soft);
    box-shadow: inset 2px 0 0 var(--blue-btn);
}

.asset-link-tx__row:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: -2px;
}

.asset-link-tx__row:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.asset-link-tx__meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1 1 auto;
    gap: 2px;
}

.asset-link-tx__name {
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.asset-link-tx__sub {
    font-size: 13px;
    color: var(--gray);
}

.asset-link-tx__amount {
    flex: 0 0 auto;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}
</style>
