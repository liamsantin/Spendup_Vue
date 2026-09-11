<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { EyeIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { useFilesStore } from '@/features/files/stores/files-store';
import { isQuotaExceededMessage, wouldExceedQuota } from '@/features/files/format';
import { validatePdfFile } from '@/features/files/validate-upload';
import type { FileDto } from '@/features/files/types';
import RecurringDueConfirmModal from '@/features/recurring-payments/components/modals/RecurringDueConfirmModal.vue';
import {
    displayDueStatus,
    formatCalendarDate,
    formatPlannedAmount,
    isDueOpen,
    isDueSettled,
    isExpenseTemplate
} from '@/features/recurring-payments/format';
import { canConfirmRecurringOnAccount } from '@/features/recurring-payments/rights';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import type { RecurringDue, RecurringFile, RecurringKind } from '@/features/recurring-payments/types';
import TransactionAttachments from '@/features/transactions/components/forms/TransactionAttachments.vue';
import TransactionFilePreviewModal from '@/features/transactions/components/modals/TransactionFilePreviewModal.vue';
import { transactionsApi } from '@/features/transactions/api';
import type { Transaction } from '@/features/transactions/types';
import TransactionFormModal from '@/features/transactions/components/modals/TransactionFormModal.vue';

const props = defineProps<{
    modelValue: boolean;
    kind: RecurringKind;
    publicId: string | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    edit: [];
}>();

const { t, locale } = useI18n();
const router = useRouter();
const accountsStore = useAccountsStore();
const filesStore = useFilesStore();
const store = useRecurringPaymentsStore();

const localError = ref<string | null>(null);
const confirmDue = ref<RecurringDue | null>(null);
const skipDue = ref<RecurringDue | null>(null);
const previewFile = ref<RecurringFile | null>(null);
const uploading = ref(false);
const txTarget = ref<Transaction | null>(null);

const open = computed({
    get: () => props.modelValue && !!props.publicId,
    set: (value: boolean) => emit('update:modelValue', value)
});

const template = computed(() => (props.publicId ? store.getDetail(props.kind, props.publicId) : null));
const dues = computed(() => (props.publicId ? store.getDues(props.kind, props.publicId) : []));
const expense = computed(() => (template.value && isExpenseTemplate(template.value) ? template.value : null));

const account = computed(() =>
    template.value ? (accountsStore.accounts.find((item) => item.publicId === template.value!.accountPublicId) ?? null) : null
);
const canConfirm = computed(() => canConfirmRecurringOnAccount(account.value));

const confirmOpen = computed({
    get: () => !!confirmDue.value,
    set: (value: boolean) => {
        if (!value) confirmDue.value = null;
    }
});
const skipOpen = computed({
    get: () => !!skipDue.value,
    set: (value: boolean) => {
        if (!value) skipDue.value = null;
    }
});
const txOpen = computed({
    get: () => !!txTarget.value,
    set: (value: boolean) => {
        if (!value) txTarget.value = null;
    }
});

const previewOpen = computed({
    get: () => !!previewFile.value,
    set: (value: boolean) => {
        if (!value) previewFile.value = null;
    }
});

async function loadDetail() {
    if (!props.publicId) return;
    localError.value = null;
    try {
        if (props.kind === 'expense') await store.getExpense(props.publicId, true);
        else await store.getIncome(props.publicId, true);
        await store.loadDues(props.kind, props.publicId, { force: true });
        if (props.kind === 'expense') {
            await filesStore.loadList().catch(() => undefined);
            await filesStore.loadUsage().catch(() => undefined);
        }
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('recurrencesPage.errors.notFound') : getErrorMessage(e);
        if (err.status === 404) open.value = false;
    }
}

watch(
    () => [props.modelValue, props.publicId, props.kind] as const,
    ([value]) => {
        if (!value) return;
        void loadDetail();
    }
);

function statusLabel(due: RecurringDue) {
    return t(`recurrencesPage.dueStatuses.${displayDueStatus(due, props.kind)}`);
}

function dueAmount(due: RecurringDue) {
    const currency = template.value?.currency ?? 'CHF';
    const amount = due.actualAmount ?? due.plannedAmount;
    return formatPlannedAmount(amount, currency, locale.value);
}

async function onSkip() {
    if (!skipDue.value || !props.publicId) return;
    localError.value = null;
    try {
        await store.skipDue(props.kind, props.publicId, skipDue.value.publicId);
        skipDue.value = null;
        await store.loadDues(props.kind, props.publicId, { force: true });
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

async function openTransaction(due: RecurringDue) {
    if (!due.transactionPublicId) return;
    localError.value = null;
    try {
        txTarget.value = await transactionsApi.get(due.transactionPublicId);
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.value = t('recurrencesPage.errors.transactionGone');
            if (props.publicId) await store.loadDues(props.kind, props.publicId, { force: true });
            return;
        }
        localError.value = getErrorMessage(e);
    }
}

async function onUpload(file: File) {
    if (!expense.value) return;
    const valid = await validatePdfFile(file);
    if (!valid.ok) {
        localError.value = t(`filesPage.errors.${valid.code}`);
        return;
    }
    if (filesStore.usage && wouldExceedQuota(filesStore.usage, file.size)) {
        localError.value = t('filesPage.errors.quotaExceeded');
        return;
    }
    uploading.value = true;
    localError.value = null;
    try {
        const uploaded = await filesStore.uploadFile(file);
        await store.attachExpenseFile(expense.value.publicId, uploaded.publicId);
    } catch (e: unknown) {
        localError.value = isQuotaExceededMessage(getErrorMessage(e)) ? t('filesPage.errors.quotaExceeded') : getErrorMessage(e);
    } finally {
        uploading.value = false;
    }
}

async function onPick(file: FileDto) {
    if (!expense.value) return;
    localError.value = null;
    try {
        await store.attachExpenseFile(expense.value.publicId, file.publicId);
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

async function onDetach(file: RecurringFile) {
    if (!expense.value) return;
    localError.value = null;
    try {
        await store.detachExpenseFile(expense.value.publicId, file.publicId);
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

function seeRelatedTransactions() {
    if (!template.value) return;
    const query =
        props.kind === 'expense'
            ? { recurringExpensePublicId: template.value.publicId }
            : { recurringIncomePublicId: template.value.publicId };
    open.value = false;
    void router.push({ path: '/app/finances/transactions', query });
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="template?.name || t('recurrencesPage.detail.title')"
        :subtitle="t('recurrencesPage.detail.subtitle')"
        :max-width="760"
        :height="780"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert
            v-if="localError || store.error"
            type="error"
            class="mb-4"
            closable
            @dismiss="
                localError = null;
                store.clearError();
            "
        >
            {{ localError || store.error }}
        </AppAlert>

        <div v-if="store.loadingDetail && !template" class="su-loading"><span class="su-spin" /></div>
        <template v-else-if="template">
            <p class="text-medium-emphasis mb-4">
                {{ formatPlannedAmount(template.plannedAmount, template.currency, locale) }}
                ·
                {{
                    kind === 'expense'
                        ? t(`recurrencesPage.expenseFrequencies.${template.frequency}`)
                        : t(`recurrencesPage.incomeFrequencies.${template.frequency}`)
                }}
                · {{ account?.name || t('recurrencesPage.unknownAccount') }}
            </p>
            <p v-if="!template.isActive" class="text-caption text-warning mb-4">{{ t('recurrencesPage.form.pauseHint') }}</p>

            <h3 class="text-h6 mb-2">{{ t('recurrencesPage.detail.duesTitle') }}</h3>
            <div v-if="store.loadingDues && !dues.length" class="su-loading"><span class="su-spin" /></div>
            <p v-else-if="!dues.length" class="text-medium-emphasis">{{ t('recurrencesPage.detail.duesEmpty') }}</p>
            <v-list v-else class="py-0 mb-4">
                <div v-for="due in dues" :key="due.publicId" class="su-person">
                    <div class="su-person__meta">
                        <p class="su-person__name">{{ formatCalendarDate(due.scheduledAt, locale) }}</p>
                        <p class="su-person__sub">{{ statusLabel(due) }} · {{ dueAmount(due) }}</p>
                    </div>
                    <div class="su-person__actions">
                        <template v-if="isDueOpen(due, kind) && canConfirm">
                            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="confirmDue = due">
                                {{ t('recurrencesPage.actions.confirmDue') }}
                            </button>
                            <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="skipDue = due">
                                {{ t('recurrencesPage.actions.skipDue') }}
                            </button>
                        </template>
                        <button
                            v-else-if="isDueSettled(due, kind) && due.transactionPublicId"
                            type="button"
                            class="su-btn"
                            @click="openTransaction(due)"
                        >
                            {{ t('recurrencesPage.actions.openTransaction') }}
                        </button>
                    </div>
                </div>
            </v-list>

            <section v-if="expense" class="mt-6">
                <h3 class="text-h6 mb-2">{{ t('recurrencesPage.detail.filesTitle') }}</h3>
                <TransactionAttachments
                    :files="expense.files"
                    :library="filesStore.items"
                    :can-edit="canConfirm"
                    :uploading="uploading"
                    :acting="store.acting"
                    @upload="onUpload"
                    @pick="onPick"
                    @detach="onDetach"
                    @open="previewFile = $event"
                />
            </section>
        </template>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" @click="seeRelatedTransactions">
                <EyeIcon :size="16" stroke-width="1.6" />
                {{ t('recurrencesPage.detail.seeTransactions') }}
            </button>
            <button type="button" class="su-btn" @click="emit('edit')">{{ t('recurrencesPage.actions.edit') }}</button>
            <button type="button" class="su-btn su-btn--ink" @click="close">{{ t('common.close') }}</button>
        </template>
    </AppModalBase>

    <RecurringDueConfirmModal
        v-model="confirmOpen"
        :kind="kind"
        :template-public-id="publicId || ''"
        :account-public-id="template?.accountPublicId || ''"
        :due="confirmDue"
        :default-payment-method-public-id="template?.paymentMethodPublicId"
        @confirmed="loadDetail"
    />

    <AppConfirmationModal
        v-model="skipOpen"
        :title="t('recurrencesPage.skipModal.title')"
        :message="t('recurrencesPage.skipModal.body')"
        :confirm-label="t('recurrencesPage.actions.skipDue')"
        :loading="store.acting"
        @confirm="onSkip"
    />

    <TransactionFilePreviewModal v-model="previewOpen" :file="previewFile" />
    <TransactionFormModal v-model="txOpen" :transaction="txTarget" @saved="loadDetail" />
</template>
