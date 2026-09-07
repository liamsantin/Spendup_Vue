<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { usePaymentMethodsStore } from '@/features/payment-methods/stores/payment-methods-store';
import { canWriteTransactions } from '@/features/transactions/rights';
import { sourceAccountPublicId, targetAccountPublicId, todayUtcYmd } from '@/features/transactions/format';
import { useTransactionsStore } from '@/features/transactions/stores/transactions-store';
import {
    buildCreateTransactionPayload,
    buildUpdateTransactionPayload,
    isTransactionFormDirty,
    type TransactionFormFields,
    type TransactionPayloadErrorCode
} from '@/features/transactions/payload';
import { TRANSACTION_TYPES, type Transaction, type TransactionType } from '@/features/transactions/types';
import TransactionForm, { type TransactionFormFieldErrors } from '@/features/transactions/components/forms/TransactionForm.vue';

const props = defineProps<{
    modelValue: boolean;
    transaction?: Transaction | null;
    defaultAccountPublicId?: string | null;
    defaultType?: TransactionType | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [transaction: Transaction];
}>();

const { t } = useI18n();
const accountsStore = useAccountsStore();
const paymentMethodsStore = usePaymentMethodsStore();
const store = useTransactionsStore();

const isEdit = ref(false);
const editTransaction = ref<Transaction | null>(null);

const writableAccounts = computed(() => accountsStore.accounts.filter((a) => canWriteTransactions(a)));

const accountItems = computed(() => {
    if (isEdit.value && editTransaction.value) {
        const id = sourceAccountPublicId(editTransaction.value);
        const account = accountsStore.accounts.find((a) => a.publicId === id);
        return [{ title: account?.name ?? t('transactionsPage.unknownAccount'), value: id ?? '' }];
    }
    return writableAccounts.value.map((a) => ({ title: a.name, value: a.publicId }));
});

const typeItems = computed(() => TRANSACTION_TYPES.map((value) => ({ title: t(`transactionsPage.types.${value}`), value })));

const sourceAccount = computed(() => accountsStore.accounts.find((a) => a.publicId === form.accountPublicId) ?? null);

const counterpartyItems = computed(() => {
    if (isEdit.value && editTransaction.value) {
        const id = targetAccountPublicId(editTransaction.value);
        if (!id) return [];
        const account = accountsStore.accounts.find((a) => a.publicId === id);
        return [{ title: account?.name ?? t('transactionsPage.unknownAccount'), value: id }];
    }
    const source = sourceAccount.value;
    if (!source) return [];
    return writableAccounts.value
        .filter((a) => a.publicId !== source.publicId && a.currency === source.currency)
        .map((a) => ({ title: a.name, value: a.publicId }));
});

const paymentMethodItems = computed(() => {
    const none = [{ title: t('transactionsPage.form.noPaymentMethod'), value: '' }];
    const accountId = form.accountPublicId;
    if (!accountId) return none;
    const methods = paymentMethodsStore.allKnownItems().filter((item) => item.accountPublicId === accountId);
    const selected = form.paymentMethodPublicId;
    const options = methods
        .filter((item) => item.isActive || item.publicId === selected)
        .map((item) => ({ title: item.label, value: item.publicId }));
    return [...none, ...options];
});

const archivedHint = computed(() => {
    if (isEdit.value && sourceAccount.value && !sourceAccount.value.isActive) {
        return t('transactionsPage.form.archivedHint');
    }
    return null;
});

const localError = reactive({ message: null as string | null });
const fieldErrors = reactive<TransactionFormFieldErrors>({});

const form = reactive<TransactionFormFields>({
    type: 'depense',
    accountPublicId: '',
    counterpartyAccountPublicId: '',
    label: '',
    amount: '',
    operationDate: todayUtcYmd(),
    valueDate: null,
    paymentMethodPublicId: ''
});

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const canSave = computed(() => {
    if (archivedHint.value) return false;
    if (!isEdit.value || !editTransaction.value) return true;
    return isTransactionFormDirty(editTransaction.value, form);
});

function clearFieldErrors() {
    fieldErrors.type = null;
    fieldErrors.accountPublicId = null;
    fieldErrors.counterpartyAccountPublicId = null;
    fieldErrors.label = null;
    fieldErrors.amount = null;
    fieldErrors.operationDate = null;
    fieldErrors.valueDate = null;
    fieldErrors.paymentMethodPublicId = null;
}

function payloadErrorText(code: TransactionPayloadErrorCode): string {
    return t(`transactionsPage.form.errors.${code}`);
}

function applyPayloadErrors(code: TransactionPayloadErrorCode, field?: string) {
    const message = payloadErrorText(code);
    if (field && field in fieldErrors) {
        (fieldErrors as Record<string, string | null>)[field] = message;
        return;
    }
    localError.message = message;
}

function formatAmountInput(value: number | null | undefined): string {
    if (value == null) return '';
    return value.toFixed(2);
}

function resetForm() {
    localError.message = null;
    clearFieldErrors();
    const transaction = editTransaction.value;
    if (transaction) {
        form.type = transaction.type;
        form.accountPublicId = sourceAccountPublicId(transaction) ?? '';
        form.counterpartyAccountPublicId = targetAccountPublicId(transaction) ?? '';
        form.label = transaction.label;
        form.amount = formatAmountInput(transaction.amount);
        form.operationDate = transaction.operationDate;
        form.valueDate = transaction.valueDate;
        form.paymentMethodPublicId = transaction.paymentMethodPublicId ?? '';
        return;
    }
    form.type = props.defaultType || 'depense';
    form.accountPublicId = props.defaultAccountPublicId?.trim() || writableAccounts.value[0]?.publicId || '';
    form.counterpartyAccountPublicId = '';
    form.label = '';
    form.amount = '';
    form.operationDate = todayUtcYmd();
    form.valueDate = null;
    form.paymentMethodPublicId = '';
}

async function loadPaymentMethodsForAccount(accountPublicId: string | null) {
    const id = accountPublicId?.trim();
    if (!id) return;
    await paymentMethodsStore.loadList({ accountPublicId: id }).catch(() => undefined);
}

watch(
    () => props.modelValue,
    async (value) => {
        if (!value) return;
        isEdit.value = !!props.transaction;
        editTransaction.value = props.transaction ?? null;
        resetForm();
        await loadPaymentMethodsForAccount(form.accountPublicId);
    }
);

watch(
    () => form.type,
    (type) => {
        if (isEdit.value) return;
        if (type !== 'transfert') {
            form.counterpartyAccountPublicId = '';
        } else if (form.counterpartyAccountPublicId === form.accountPublicId) {
            form.counterpartyAccountPublicId = '';
        }
    }
);

watch(
    () => form.accountPublicId,
    async (accountId, previous) => {
        if (!accountId || accountId === previous) return;
        if (form.counterpartyAccountPublicId === accountId) {
            form.counterpartyAccountPublicId = '';
        }
        const allowed = new Set(counterpartyItems.value.map((item) => item.value));
        if (form.counterpartyAccountPublicId && !allowed.has(form.counterpartyAccountPublicId)) {
            form.counterpartyAccountPublicId = '';
        }
        await loadPaymentMethodsForAccount(accountId);
        const stillValid = paymentMethodItems.value.some((item) => item.value === form.paymentMethodPublicId);
        if (!stillValid) form.paymentMethodPublicId = '';
    }
);

async function onSave() {
    if (isEdit.value && !canSave.value) return;
    localError.message = null;
    clearFieldErrors();
    const context = { accounts: accountsStore.accounts };
    const built = isEdit.value ? buildUpdateTransactionPayload(form, context) : buildCreateTransactionPayload(form, context);
    if (!built.ok) {
        applyPayloadErrors(built.code, built.field);
        return;
    }
    try {
        const saved =
            isEdit.value && editTransaction.value
                ? await store.updateTransaction(editTransaction.value.publicId, form)
                : await store.createTransaction(form);
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.message = t('transactionsPage.errors.notFound');
            return;
        }
        localError.message = getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="isEdit ? t('transactionsPage.form.editTitle') : t('transactionsPage.form.createTitle')"
        :subtitle="t('transactionsPage.form.subtitle')"
        :max-width="640"
        :height="720"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <TransactionForm
            :form="form"
            :is-edit="isEdit"
            :account-items="accountItems"
            :counterparty-items="counterpartyItems"
            :type-items="typeItems"
            :payment-method-items="paymentMethodItems"
            :field-errors="fieldErrors"
            :archived-hint="archivedHint"
        />

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting || !canSave" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalBase>
</template>
