<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { FileDescriptionIcon, PaperclipIcon, TagsIcon, UnlinkIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalPanelScroll from '@/components/shared/modal/AppModalPanelScroll.vue';
import AppModalTabs from '@/components/shared/modal/AppModalTabs.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { usePaymentMethodsStore } from '@/features/payment-methods/stores/payment-methods-store';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';
import { categorySelectItems } from '@/features/categories/payload';
import { RECURRING_PAGE_SIZE_MAX, useRecurringPaymentsStore } from '@/features/recurring-payments';
import { useTiersStore } from '@/features/tiers/stores/tiers-store';
import { sanitizeTagPublicIds } from '@/features/tags/format';
import { useTagsStore } from '@/features/tags/stores/tags-store';
import { isSavingsGoalCompatibleWithTransactionForm } from '@/features/savings-goals/link-transactions';
import { useSavingsGoalsStore } from '@/features/savings-goals/stores/savings-goals-store';
import { useAssetsStore } from '@/features/assets/stores/assets-store';
import { ASSET_NOT_FOUND_MESSAGE } from '@/features/assets/types';
import { canWriteTransaction, canWriteTransactions } from '@/features/transactions/rights';
import { sourceAccountPublicId, targetAccountPublicId, todayUtcYmd } from '@/features/transactions/format';
import { plannedAmountForRecurrenceTransaction } from '@/features/transactions/recurrence-planned';
import { useTransactionsStore } from '@/features/transactions/stores/transactions-store';
import {
    buildCreateTransactionPayload,
    buildUpdateTransactionPayload,
    isTransactionFormDirty,
    recurrencePublicIdFromTransaction,
    type TransactionFormFields,
    type TransactionPayloadErrorCode
} from '@/features/transactions/payload';
import {
    FILE_ALREADY_LINKED_MESSAGE,
    TRANSACTION_ASSET_ALREADY_LINKED_MESSAGE,
    TRANSACTION_FILES_MAX,
    TRANSACTION_MAX_FILES_MESSAGE,
    TRANSACTION_TYPES,
    type Transaction,
    type TransactionFile,
    type TransactionType
} from '@/features/transactions/types';
import TransactionForm, { type TransactionFormFieldErrors } from '@/features/transactions/components/forms/TransactionForm.vue';
import TransactionAttachments from '@/features/transactions/components/forms/TransactionAttachments.vue';
import TransactionFilePreviewModal from '@/features/transactions/components/modals/TransactionFilePreviewModal.vue';
import { useFilesStore } from '@/features/files/stores/files-store';
import { isQuotaExceededMessage, wouldExceedQuota } from '@/features/files/format';
import type { FileDto } from '@/features/files/types';
import { validatePdfFile } from '@/features/files/validate-upload';

const props = defineProps<{
    modelValue: boolean;
    transaction?: Transaction | null;
    defaultAccountPublicId?: string | null;
    defaultType?: TransactionType | null;
    /** Préremplit l’actif (fiche patrimoine). */
    defaultAssetPublicId?: string | null;
    /** Liste budget : afficher « Délier la transaction ». */
    showUnlinkFromBudget?: boolean;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [transaction: Transaction];
    unlink: [];
}>();

const { t, locale } = useI18n();
const accountsStore = useAccountsStore();
const paymentMethodsStore = usePaymentMethodsStore();
const categoriesStore = useCategoriesStore();
const tiersStore = useTiersStore();
const tagsStore = useTagsStore();
const recurringStore = useRecurringPaymentsStore();
const store = useTransactionsStore();
const filesStore = useFilesStore();
const savingsGoalsStore = useSavingsGoalsStore();
const assetsStore = useAssetsStore();

const isEdit = ref(false);
const editTransaction = ref<Transaction | null>(null);
const recurrencePlannedAmount = computed(() =>
    editTransaction.value ? plannedAmountForRecurrenceTransaction(editTransaction.value) : null
);
const tierDeletedHint = ref(false);

/** `tierDeleted` (realtime ou local) : vider le sélecteur si ce tier était choisi. */
const unsubscribeTierDeleted = tiersStore.subscribeToDeleted((publicId) => {
    if (!props.modelValue || form.tierPublicId !== publicId) return;
    form.tierPublicId = '';
    tierDeletedHint.value = true;
});

/** Même hors onglet Classification : `v-window` ne monte pas le TagPicker tant qu’il est inactif. */
const unsubscribeTagDeleted = tagsStore.subscribeToDeleted((publicId) => {
    if (!form.tagPublicIds.includes(publicId)) return;
    form.tagPublicIds = form.tagPublicIds.filter((id) => id !== publicId);
});

const unsubscribeAssetDeleted = assetsStore.subscribeToDeleted((publicId) => {
    if (form.assetPublicId !== publicId) return;
    form.assetPublicId = '';
});

onUnmounted(() => {
    unsubscribeTierDeleted();
    unsubscribeTagDeleted();
    unsubscribeAssetDeleted();
});

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

const categoryItems = computed(() => {
    const items = categorySelectItems(categoriesStore.items, { noneTitle: t('transactionsPage.form.noCategory') });
    const selected = form.categoryPublicId;
    if (selected && !items.some((item) => item.value === selected)) {
        const known = categoriesStore.findByPublicId(selected);
        items.push({ title: known?.name ?? selected, value: selected });
    }
    return items;
});

const recurrenceItems = computed(() => {
    const none = [{ title: t('transactionsPage.form.noRecurrence'), value: '' }];
    if (form.type === 'transfert') return none;
    const accountId = form.accountPublicId;
    const templates =
        form.type === 'revenu'
            ? recurringStore.incomes.filter((item) => !accountId || item.accountPublicId === accountId)
            : recurringStore.expenses.filter((item) => !accountId || item.accountPublicId === accountId);
    const selected = form.recurrencePublicId;
    const options = templates
        .filter((item) => item.isActive || item.publicId === selected)
        .map((item) => ({ title: item.name, value: item.publicId }));
    if (selected && !options.some((item) => item.value === selected)) {
        const known =
            form.type === 'revenu'
                ? (recurringStore.incomes.find((item) => item.publicId === selected) ?? recurringStore.getDetail('income', selected))
                : (recurringStore.expenses.find((item) => item.publicId === selected) ?? recurringStore.getDetail('expense', selected));
        options.push({ title: known?.name ?? selected, value: selected });
    }
    return [...none, ...options];
});

const savingsGoalItems = computed(() => {
    const none = [{ title: t('transactionsPage.form.noSavingsGoal'), value: '' }];
    const compatible = savingsGoalsStore
        .allKnownItems()
        .filter((goal) => isSavingsGoalCompatibleWithTransactionForm(goal, form, accountsStore.accounts));
    const selected = form.savingsGoalPublicId.trim();
    if (selected && !compatible.some((goal) => goal.publicId === selected)) {
        const extra = savingsGoalsStore.findByPublicId(selected);
        if (extra) compatible.unshift(extra);
    }
    return [...none, ...compatible.map((goal) => ({ title: goal.name, value: goal.publicId }))];
});

const savingsGoalHint = computed(() => {
    if (!form.accountPublicId) return t('transactionsPage.form.savingsGoalAccountHint');
    if (savingsGoalItems.value.length <= 1) return t('transactionsPage.form.savingsGoalEmptyHint');
    return t('transactionsPage.form.savingsGoalHint');
});

const assetItems = computed(() => {
    const none = [{ title: t('transactionsPage.form.noAsset'), value: '' }];
    const assets = assetsStore
        .allKnownItems()
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, locale.value));
    const selected = form.assetPublicId.trim();
    if (selected && !assets.some((asset) => asset.publicId === selected)) {
        const extra = assetsStore.findByPublicId(selected);
        if (extra) assets.unshift(extra);
    }
    return [
        ...none,
        ...assets.map((asset) => ({
            title: `${asset.name} · ${t(`assetsPage.types.${asset.type}`)}`,
            value: asset.publicId
        }))
    ];
});

const assetHint = computed(() => t('transactionsPage.form.assetHint'));

const isSharedAccount = computed(() => {
    const account = sourceAccount.value;
    return !!account && !account.isOwned;
});

const tierHint = computed(() => {
    if (tierDeletedHint.value) return t('transactionsPage.form.tierDeletedHint');
    return isSharedAccount.value ? t('transactionsPage.form.tierPersonalHint') : null;
});

const archivedHint = computed(() => {
    if (isEdit.value && sourceAccount.value && !sourceAccount.value.isActive) {
        return t('transactionsPage.form.archivedHint');
    }
    return null;
});

const counterpartyHint = computed(() => {
    if (isEdit.value || form.type !== 'transfert') return null;
    if (counterpartyItems.value.length) return null;
    const source = sourceAccount.value;
    const others = writableAccounts.value.filter((a) => a.publicId !== source?.publicId);
    if (!others.length) {
        return t('transactionsPage.form.noCounterpartyHint');
    }
    return t('transactionsPage.form.noCounterpartySameCurrencyHint', { currency: source?.currency ?? '' });
});

const localError = reactive({ message: null as string | null });
const fieldErrors = reactive<TransactionFormFieldErrors>({});
const pendingFiles = ref<TransactionFile[]>([]);
const uploadingFile = ref(false);
const previewFile = ref<TransactionFile | null>(null);
const previewOpen = ref(false);
const activeTab = ref<'operation' | 'classification' | 'attachments'>('operation');

const CLASSIFICATION_FIELDS = new Set([
    'paymentMethodPublicId',
    'categoryPublicId',
    'tierPublicId',
    'recurrencePublicId',
    'savingsGoalPublicId',
    'assetPublicId'
]);

const form = reactive<TransactionFormFields>({
    type: 'depense',
    accountPublicId: '',
    counterpartyAccountPublicId: '',
    label: '',
    amount: '',
    operationDate: todayUtcYmd(),
    valueDate: null,
    paymentMethodPublicId: '',
    categoryPublicId: '',
    tierPublicId: '',
    recurrencePublicId: '',
    savingsGoalPublicId: '',
    assetPublicId: '',
    tagPublicIds: []
});

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const canSave = computed(() => {
    if (archivedHint.value || counterpartyHint.value) return false;
    if (!isEdit.value || !editTransaction.value) return true;
    return isTransactionFormDirty(editTransaction.value, form);
});

const canEditFiles = computed(() => {
    if (archivedHint.value) return false;
    if (!isEdit.value) return writableAccounts.value.some((a) => a.publicId === form.accountPublicId);
    if (!editTransaction.value) return false;
    return canWriteTransaction(editTransaction.value, accountsStore.accounts);
});

const attachedFiles = computed((): TransactionFile[] => {
    if (isEdit.value && editTransaction.value) {
        const live = store.allKnownItems().find((item) => item.publicId === editTransaction.value?.publicId);
        return live?.files ?? editTransaction.value.files ?? [];
    }
    return pendingFiles.value;
});

const formTabs = computed(() => [
    { value: 'operation' as const, label: t('transactionsPage.form.tabs.operation'), icon: FileDescriptionIcon },
    { value: 'classification' as const, label: t('transactionsPage.form.tabs.classification'), icon: TagsIcon },
    {
        value: 'attachments' as const,
        label: t('transactionsPage.form.tabs.attachments'),
        icon: PaperclipIcon,
        chip: attachedFiles.value.length || undefined
    }
]);

function tabForField(field?: string): 'operation' | 'classification' | 'attachments' {
    if (field && CLASSIFICATION_FIELDS.has(field)) return 'classification';
    return 'operation';
}

function toTxFile(file: Pick<FileDto, 'publicId' | 'nameOriginal' | 'sizeBytes' | 'mimeType'>): TransactionFile {
    return {
        publicId: file.publicId,
        nameOriginal: file.nameOriginal,
        sizeBytes: file.sizeBytes,
        mimeType: file.mimeType
    };
}

function attachmentError(message: string): string {
    if (message === FILE_ALREADY_LINKED_MESSAGE) return t('transactionsPage.form.attachments.alreadyLinked');
    if (message === TRANSACTION_MAX_FILES_MESSAGE) return t('transactionsPage.form.attachments.maxReached', { max: TRANSACTION_FILES_MAX });
    if (isQuotaExceededMessage(message)) return t('filesPage.errors.quotaExceeded');
    return message;
}

function clearFieldErrors() {
    fieldErrors.type = null;
    fieldErrors.accountPublicId = null;
    fieldErrors.counterpartyAccountPublicId = null;
    fieldErrors.label = null;
    fieldErrors.amount = null;
    fieldErrors.operationDate = null;
    fieldErrors.valueDate = null;
    fieldErrors.paymentMethodPublicId = null;
    fieldErrors.categoryPublicId = null;
    fieldErrors.tierPublicId = null;
    fieldErrors.recurrencePublicId = null;
    fieldErrors.savingsGoalPublicId = null;
    fieldErrors.assetPublicId = null;
}

function payloadErrorText(code: TransactionPayloadErrorCode): string {
    return t(`transactionsPage.form.errors.${code}`);
}

function applyPayloadErrors(code: TransactionPayloadErrorCode, field?: string) {
    const message = payloadErrorText(code);
    if (field) activeTab.value = tabForField(field);
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
    tierDeletedHint.value = false;
    pendingFiles.value = [];
    previewFile.value = null;
    previewOpen.value = false;
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
        form.categoryPublicId = transaction.categoryPublicId ?? '';
        form.tierPublicId = transaction.tierPublicId ?? '';
        form.recurrencePublicId = recurrencePublicIdFromTransaction(transaction);
        form.savingsGoalPublicId = transaction.savingsGoalPublicId ?? '';
        form.assetPublicId = transaction.assetPublicId ?? '';
        form.tagPublicIds = sanitizeTagPublicIds(transaction.tagPublicIds);
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
    form.categoryPublicId = '';
    form.tierPublicId = '';
    form.recurrencePublicId = '';
    form.savingsGoalPublicId = '';
    form.assetPublicId = props.defaultAssetPublicId?.trim() || '';
    form.tagPublicIds = [];
}

async function loadPaymentMethodsForAccount(accountPublicId: string | null) {
    const id = accountPublicId?.trim();
    if (!id) return;
    await paymentMethodsStore.loadList({ accountPublicId: id }).catch(() => undefined);
}

async function loadCategoriesForType(type: TransactionType) {
    await categoriesStore.loadList({ type }).catch(() => undefined);
}

async function loadRecurrences() {
    await Promise.all([
        recurringStore.loadExpenses({ pageSize: RECURRING_PAGE_SIZE_MAX }).catch(() => undefined),
        recurringStore.loadIncomes({ pageSize: RECURRING_PAGE_SIZE_MAX }).catch(() => undefined)
    ]);
}

function syncRecurrenceSelection() {
    if (form.type === 'transfert') {
        form.recurrencePublicId = '';
        return;
    }
    if (!form.recurrencePublicId) return;
    if (!recurrenceItems.value.some((item) => item.value === form.recurrencePublicId)) {
        form.recurrencePublicId = '';
    }
}

function syncSavingsGoalSelection() {
    if (!form.savingsGoalPublicId) return;
    const goal = savingsGoalsStore.findByPublicId(form.savingsGoalPublicId);
    if (!goal) return;
    if (!isSavingsGoalCompatibleWithTransactionForm(goal, form, accountsStore.accounts)) {
        form.savingsGoalPublicId = '';
    }
}

watch(
    () => props.modelValue,
    async (value) => {
        if (!value) return;
        isEdit.value = !!props.transaction;
        editTransaction.value = props.transaction ?? null;
        activeTab.value = 'operation';
        resetForm();
        await Promise.all([
            loadPaymentMethodsForAccount(form.accountPublicId),
            loadCategoriesForType(form.type),
            loadRecurrences(),
            filesStore.loadList().catch(() => undefined),
            filesStore.loadUsage(),
            savingsGoalsStore.loadList().catch(() => undefined),
            assetsStore.loadList().catch(() => undefined),
            tagsStore.loadList().catch(() => undefined)
        ]);
    }
);

watch(
    () => form.type,
    async (type) => {
        if (isEdit.value) return;
        if (type !== 'transfert') {
            form.counterpartyAccountPublicId = '';
        } else if (form.counterpartyAccountPublicId === form.accountPublicId) {
            form.counterpartyAccountPublicId = '';
        }
        form.categoryPublicId = '';
        form.recurrencePublicId = '';
        form.savingsGoalPublicId = '';
        await loadCategoriesForType(type);
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
        syncRecurrenceSelection();
        syncSavingsGoalSelection();
    }
);

watch(
    () => form.counterpartyAccountPublicId,
    () => {
        syncSavingsGoalSelection();
    }
);

async function onSave() {
    if (isEdit.value && !canSave.value) return;
    localError.message = null;
    clearFieldErrors();
    const context = {
        accounts: accountsStore.accounts,
        savingsGoals: savingsGoalsStore.allKnownItems()
    };
    const built = isEdit.value ? buildUpdateTransactionPayload(form, context) : buildCreateTransactionPayload(form, context);
    if (!built.ok) {
        applyPayloadErrors(built.code, built.field);
        return;
    }
    const previousGoalId = editTransaction.value?.savingsGoalPublicId ?? null;
    try {
        const saved =
            isEdit.value && editTransaction.value
                ? await store.updateTransaction(editTransaction.value.publicId, form)
                : await store.createTransaction(form, { filePublicIds: pendingFiles.value.map((file) => file.publicId) });
        const goalIds = new Set([previousGoalId, saved.savingsGoalPublicId].filter((id): id is string => !!id?.trim()));
        for (const id of goalIds) {
            void savingsGoalsStore.fetchSavingsGoal(id, true).catch(() => undefined);
        }
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404 && err.message === ASSET_NOT_FOUND_MESSAGE) {
            fieldErrors.assetPublicId = t('assetsPage.errors.notFound');
            activeTab.value = 'classification';
            localError.message = t('assetsPage.errors.notFound');
            return;
        }
        if (err.message === TRANSACTION_ASSET_ALREADY_LINKED_MESSAGE) {
            fieldErrors.assetPublicId = t('transactionsPage.form.errors.assetAlreadyLinked');
            activeTab.value = 'classification';
            localError.message = t('transactionsPage.form.errors.assetAlreadyLinked');
            return;
        }
        if (err.status === 404) {
            localError.message = t('transactionsPage.errors.notFound');
            return;
        }
        localError.message = getErrorMessage(e);
    }
}

async function ensureCanAddFile(): Promise<boolean> {
    activeTab.value = 'attachments';
    if (attachedFiles.value.length >= TRANSACTION_FILES_MAX) {
        localError.message = t('transactionsPage.form.attachments.maxReached', { max: TRANSACTION_FILES_MAX });
        return false;
    }
    if (!canEditFiles.value) return false;
    return true;
}

async function onUploadAttachment(file: File) {
    localError.message = null;
    if (!(await ensureCanAddFile())) return;
    const check = await validatePdfFile(file);
    if (!check.ok) {
        localError.message = t(`filesPage.errors.${check.code}`);
        return;
    }
    if (filesStore.usage && wouldExceedQuota(filesStore.usage, file.size)) {
        localError.message = t('filesPage.errors.quotaExceeded');
        return;
    }
    uploadingFile.value = true;
    try {
        const uploaded = await filesStore.uploadFile(file);
        if (isEdit.value && editTransaction.value) {
            const updated = await store.attachTransactionFile(editTransaction.value.publicId, uploaded.publicId);
            editTransaction.value = updated;
        } else {
            if (pendingFiles.value.some((item) => item.publicId === uploaded.publicId)) return;
            pendingFiles.value = [...pendingFiles.value, toTxFile(uploaded)];
        }
    } catch (e: unknown) {
        localError.message = attachmentError(getErrorMessage(e));
    } finally {
        uploadingFile.value = false;
    }
}

async function onPickAttachment(file: FileDto) {
    localError.message = null;
    if (!(await ensureCanAddFile())) return;
    if (attachedFiles.value.some((item) => item.publicId === file.publicId)) {
        localError.message = t('transactionsPage.form.attachments.alreadyLinked');
        return;
    }
    try {
        if (isEdit.value && editTransaction.value) {
            const updated = await store.attachTransactionFile(editTransaction.value.publicId, file.publicId);
            editTransaction.value = updated;
        } else {
            pendingFiles.value = [...pendingFiles.value, toTxFile(file)];
        }
    } catch (e: unknown) {
        localError.message = attachmentError(getErrorMessage(e));
    }
}

async function onDetachAttachment(file: TransactionFile) {
    localError.message = null;
    if (!canEditFiles.value) return;
    if (!isEdit.value) {
        pendingFiles.value = pendingFiles.value.filter((item) => item.publicId !== file.publicId);
        return;
    }
    if (!editTransaction.value) return;
    try {
        await store.detachTransactionFile(editTransaction.value.publicId, file.publicId);
        editTransaction.value = {
            ...editTransaction.value,
            files: attachedFiles.value.filter((item) => item.publicId !== file.publicId)
        };
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.message = err.status === 404 ? t('transactionsPage.errors.notFound') : attachmentError(err.message);
    }
}

function onOpenAttachment(file: TransactionFile) {
    previewFile.value = file;
    previewOpen.value = true;
}
</script>

<template>
    <AppModalTabs
        v-model="open"
        v-model:tab="activeTab"
        class="tx-form-modal"
        :title="isEdit ? t('transactionsPage.form.editTitle') : t('transactionsPage.form.createTitle')"
        :subtitle="t('transactionsPage.form.subtitle')"
        :tabs="formTabs"
        :height="720"
        :max-width="640"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <template #panel-operation>
            <AppModalPanelScroll>
                <TransactionForm
                    section="operation"
                    :form="form"
                    :is-edit="isEdit"
                    :account-items="accountItems"
                    :counterparty-items="counterpartyItems"
                    :type-items="typeItems"
                    :payment-method-items="paymentMethodItems"
                    :category-items="categoryItems"
                    :recurrence-items="recurrenceItems"
                    :savings-goal-items="savingsGoalItems"
                    :asset-items="assetItems"
                    :field-errors="fieldErrors"
                    :archived-hint="archivedHint"
                    :counterparty-hint="counterpartyHint"
                    :recurrence-planned-amount="recurrencePlannedAmount"
                    :savings-goal-hint="savingsGoalHint"
                />
                <button
                    v-if="showUnlinkFromBudget"
                    type="button"
                    class="su-btn su-btn--danger su-btn--sm tx-form-modal__unlink"
                    :disabled="store.acting"
                    @click="emit('unlink')"
                >
                    <UnlinkIcon :size="16" stroke-width="1.6" />
                    {{ t('transactionsPage.envelope.unlinkLink') }}
                </button>
            </AppModalPanelScroll>
        </template>

        <template #panel-classification>
            <AppModalPanelScroll>
                <TransactionForm
                    section="classification"
                    :form="form"
                    :is-edit="isEdit"
                    :account-items="accountItems"
                    :counterparty-items="counterpartyItems"
                    :type-items="typeItems"
                    :payment-method-items="paymentMethodItems"
                    :category-items="categoryItems"
                    :recurrence-items="recurrenceItems"
                    :savings-goal-items="savingsGoalItems"
                    :asset-items="assetItems"
                    :field-errors="fieldErrors"
                    :category-hint="isSharedAccount ? t('transactionsPage.form.categoryPersonalHint') : null"
                    :tags-hint="isSharedAccount ? t('transactionsPage.form.tagsPersonalHint') : null"
                    :tier-hint="tierHint"
                    :savings-goal-hint="savingsGoalHint"
                    :asset-hint="assetHint"
                />
                <button
                    v-if="showUnlinkFromBudget"
                    type="button"
                    class="su-btn su-btn--danger su-btn--sm tx-form-modal__unlink"
                    :disabled="store.acting"
                    @click="emit('unlink')"
                >
                    <UnlinkIcon :size="16" stroke-width="1.6" />
                    {{ t('transactionsPage.envelope.unlinkLink') }}
                </button>
            </AppModalPanelScroll>
        </template>

        <template #panel-attachments>
            <AppModalPanelScroll>
                <TransactionAttachments
                    :files="attachedFiles"
                    :library="filesStore.items"
                    :can-edit="canEditFiles"
                    :uploading="uploadingFile"
                    :acting="store.acting"
                    @upload="onUploadAttachment"
                    @pick="onPickAttachment"
                    @detach="onDetachAttachment"
                    @open="onOpenAttachment"
                />
            </AppModalPanelScroll>
        </template>

        <template #footer="{ close }">
            <button type="button" class="su-btn" :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting || !canSave" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalTabs>

    <TransactionFilePreviewModal v-model="previewOpen" :file="previewFile" />
</template>

<style scoped>
/* « Délier la transaction » : bouton danger discret, aligné à gauche sous les champs */
.tx-form-modal__unlink {
    margin: 24px 0 4px;
}
</style>

<!-- Non scopé : la fenêtre est téléportée ; onglets de la modale en texte souligné (kit Swiss). -->
<style>
.tx-form-modal .app-modal-tabs__toolbar {
    padding: 0 24px 0;
    border-bottom: 1px solid var(--line);
}

.tx-form-modal .app-modal-tabs__nav {
    gap: 22px;
}

.tx-form-modal .app-modal-tabs__tab {
    height: 40px;
    padding: 0;
    border-radius: 0;
    background: transparent;
    color: var(--gray);
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 0;
}

.tx-form-modal .app-modal-tabs__tab:hover:not(:disabled):not(.is-active) {
    background: transparent;
    color: var(--ink);
}

.tx-form-modal .app-modal-tabs__tab.is-active {
    background: transparent;
    color: var(--ink);
    font-weight: 700;
    box-shadow: inset 0 -2px 0 var(--ink);
}

.tx-form-modal .app-modal-tabs__tab svg {
    display: none;
}

.tx-form-modal .app-modal-tabs__chip,
.tx-form-modal .app-modal-tabs__tab.is-active .app-modal-tabs__chip {
    border-radius: 0;
    background: var(--blue);
    color: #fff;
    font-weight: 700;
}

/* la toolbar porte déjà le filet 2 px : pas de second filet sous l'en-tête */
.tx-form-modal .app-modal-base__header + .v-divider {
    display: none;
}
</style>
