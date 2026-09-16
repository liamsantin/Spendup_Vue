<script setup lang="ts">
/**
 * Lie une TX manuelle (sans récurrence) à une échéance ouverte — 1 TX ↔ 1 due.
 */
defineOptions({ name: 'RecurringLinkTransactionsModal' });

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { SearchIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { displayDueStatus, formatCalendarDate, formatPlannedAmount, isDueLinkable } from '@/features/recurring-payments/format';
import { isTransactionLinkableToRecurrence } from '@/features/recurring-payments/link-transactions';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import type { RecurringDue, RecurringExpense, RecurringIncome, RecurringKind } from '@/features/recurring-payments/types';
import { formatOperationDate, matchesTransactionSearch, resolveTransactionAmountDisplay } from '@/features/transactions/format';
import { useTransactionsStore } from '@/features/transactions/stores/transactions-store';
import { TRANSACTION_PAGE_SIZE_MAX, TRANSACTION_SEARCH_MAX, type Transaction } from '@/features/transactions/types';

const props = defineProps<{
    modelValue: boolean;
    kind: RecurringKind;
    template: RecurringExpense | RecurringIncome | null;
    dues: RecurringDue[];
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    linked: [];
}>();

const { t, locale } = useI18n();
const accountsStore = useAccountsStore();
const recurringStore = useRecurringPaymentsStore();
const transactionsStore = useTransactionsStore();

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const localError = ref<string | null>(null);
const search = ref('');
const selectedTxId = ref<string | null>(null);
const selectedDueId = ref<string | null>(null);
const linking = ref(false);

const openDues = computed(() => props.dues.filter((due) => isDueLinkable(due, props.kind)));

const candidates = computed(() => {
    const template = props.template;
    if (!template) return [];
    return transactionsStore.items.filter((item) =>
        isTransactionLinkableToRecurrence(item, props.kind, template.accountPublicId, accountsStore.accounts)
    );
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

const selectedTx = computed(() => candidates.value.find((item) => item.publicId === selectedTxId.value) ?? null);
const selectedDue = computed(() => openDues.value.find((due) => due.publicId === selectedDueId.value) ?? null);
const canSubmit = computed(() => !!selectedTx.value && !!selectedDue.value && !linking.value);

function amountText(transaction: Transaction): string {
    return resolveTransactionAmountDisplay(transaction.amount, transaction.currency, locale.value).text;
}

function dueAmountText(due: RecurringDue): string {
    const currency = props.template?.currency ?? 'CHF';
    return formatPlannedAmount(due.plannedAmount, currency, locale.value);
}

function dueStatusLabel(due: RecurringDue): string {
    const status = displayDueStatus(due, props.kind);
    return t(`recurrencesPage.dueStatuses.${status}`);
}

function selectTx(publicId: string) {
    selectedTxId.value = publicId;
}

function selectDue(publicId: string) {
    selectedDueId.value = publicId;
}

async function loadCandidates() {
    const template = props.template;
    if (!template) return;
    localError.value = null;
    try {
        await accountsStore.loadAccounts();
        await transactionsStore.loadList({
            accountPublicId: template.accountPublicId,
            pageSize: TRANSACTION_PAGE_SIZE_MAX,
            force: true
        });
        let guard = 0;
        while (transactionsStore.hasMore && guard++ < 30) {
            await transactionsStore.loadMore();
        }
        if (selectedTxId.value && !candidates.value.some((item) => item.publicId === selectedTxId.value)) {
            selectedTxId.value = null;
        }
        if (selectedDueId.value && !openDues.value.some((due) => due.publicId === selectedDueId.value)) {
            selectedDueId.value = null;
        }
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        search.value = '';
        selectedTxId.value = null;
        selectedDueId.value = null;
        localError.value = null;
        void loadCandidates();
    }
);

async function onConfirm() {
    const template = props.template;
    const tx = selectedTx.value;
    const due = selectedDue.value;
    if (!template || !tx || !due) return;
    linking.value = true;
    localError.value = null;
    try {
        await recurringStore.linkDue(props.kind, template.publicId, due.publicId, tx.publicId);
        emit('linked');
        selectedTxId.value = null;
        selectedDueId.value = null;
        await loadCandidates();
        if (!openDues.value.length || !candidates.value.length) {
            open.value = false;
        }
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('recurrencesPage.errors.notFound') : getErrorMessage(e);
        await loadCandidates();
    } finally {
        linking.value = false;
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t('recurrencesPage.linkTransactions.title')"
        :subtitle="t('recurrencesPage.linkTransactions.subtitle')"
        :max-width="720"
        :height="780"
        scrollable
        mobile-layout="fullscreen"
        :persistent="linking"
    >
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">
            {{ localError }}
        </AppAlert>

        <section class="recurring-link-tx__section">
            <h3 class="recurring-link-tx__title">{{ t('recurrencesPage.linkTransactions.pickTransaction') }}</h3>
            <label class="su-search su-search--discover mb-3">
                <SearchIcon class="su-search__icon" :size="18" stroke-width="1.8" />
                <input
                    v-model="search"
                    class="su-search__input"
                    type="search"
                    :maxlength="TRANSACTION_SEARCH_MAX"
                    :placeholder="t('recurrencesPage.linkTransactions.searchPlaceholder')"
                    :aria-label="t('recurrencesPage.linkTransactions.searchPlaceholder')"
                    autocomplete="off"
                />
            </label>

            <div v-if="transactionsStore.loading && !candidates.length" class="su-loading"><span class="su-spin" /></div>
            <p v-else-if="!visibleItems.length" class="text-medium-emphasis">
                {{ search.trim() ? t('recurrencesPage.linkTransactions.emptyFiltered') : t('recurrencesPage.linkTransactions.empty') }}
            </p>
            <div v-else class="recurring-link-tx__list" role="listbox" :aria-label="t('recurrencesPage.linkTransactions.pickTransaction')">
                <button
                    v-for="item in visibleItems"
                    :key="item.publicId"
                    type="button"
                    class="recurring-link-tx__row"
                    :class="{ 'is-selected': selectedTxId === item.publicId }"
                    role="option"
                    :aria-selected="selectedTxId === item.publicId"
                    :disabled="linking"
                    @click="selectTx(item.publicId)"
                >
                    <span class="recurring-link-tx__meta">
                        <span class="recurring-link-tx__name">{{ item.label }}</span>
                        <span class="recurring-link-tx__sub">{{ formatOperationDate(item.operationDate, locale) }}</span>
                    </span>
                    <span class="recurring-link-tx__amount">{{ amountText(item) }}</span>
                </button>
            </div>
        </section>

        <section class="recurring-link-tx__section">
            <h3 class="recurring-link-tx__title">{{ t('recurrencesPage.linkTransactions.pickDue') }}</h3>
            <p v-if="!openDues.length" class="text-medium-emphasis">{{ t('recurrencesPage.linkTransactions.emptyDues') }}</p>
            <div v-else class="recurring-link-tx__list" role="listbox" :aria-label="t('recurrencesPage.linkTransactions.pickDue')">
                <button
                    v-for="due in openDues"
                    :key="due.publicId"
                    type="button"
                    class="recurring-link-tx__row"
                    :class="{ 'is-selected': selectedDueId === due.publicId }"
                    role="option"
                    :aria-selected="selectedDueId === due.publicId"
                    :disabled="linking || !selectedTxId"
                    @click="selectDue(due.publicId)"
                >
                    <span class="recurring-link-tx__meta">
                        <span class="recurring-link-tx__name">{{ formatCalendarDate(due.scheduledAt, locale) }}</span>
                        <span class="recurring-link-tx__sub">{{ dueStatusLabel(due) }}</span>
                    </span>
                    <span class="recurring-link-tx__amount">{{ dueAmountText(due) }}</span>
                </button>
            </div>
        </section>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="linking" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="!canSubmit" @click="onConfirm">
                {{ t('recurrencesPage.linkTransactions.confirm') }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.recurring-link-tx__section + .recurring-link-tx__section {
    margin-top: 22px;
}

.recurring-link-tx__title {
    margin: 0 0 10px;
    color: var(--ink-mute);
    font-size: 13px;
    font-weight: 560;
    letter-spacing: 0.01em;
}

.recurring-link-tx__list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.recurring-link-tx__row {
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

.recurring-link-tx__row:hover:not(:disabled) {
    border-color: var(--thread);
}

.recurring-link-tx__row.is-selected {
    border-color: rgb(var(--v-theme-primary));
}

.recurring-link-tx__row:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.recurring-link-tx__meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1 1 auto;
    gap: 2px;
}

.recurring-link-tx__name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.recurring-link-tx__sub,
.recurring-link-tx__amount {
    font-size: 0.8125rem;
    color: rgba(var(--v-theme-on-surface), 0.64);
}

.recurring-link-tx__amount {
    flex: 0 0 auto;
    font-variant-numeric: tabular-nums;
}
</style>
