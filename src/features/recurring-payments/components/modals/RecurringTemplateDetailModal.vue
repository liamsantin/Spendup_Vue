<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { CalendarEventIcon, CheckIcon, EyeIcon, PaperclipIcon } from 'vue-tabler-icons';
import AppAccordion from '@/components/shared/accordion/AppAccordion.vue';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppModalPanelScroll from '@/components/shared/modal/AppModalPanelScroll.vue';
import AppModalTabs from '@/components/shared/modal/AppModalTabs.vue';
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
    groupDuesForDetail,
    isExpenseTemplate
} from '@/features/recurring-payments/format';
import { canConfirmRecurringOnAccount } from '@/features/recurring-payments/rights';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import type { RecurringDue, RecurringFile, RecurringKind } from '@/features/recurring-payments/types';
import TransactionAttachments from '@/features/transactions/components/forms/TransactionAttachments.vue';
import TransactionFilePreviewModal from '@/features/transactions/components/modals/TransactionFilePreviewModal.vue';
import { transactionsApi } from '@/features/transactions/api';
import { formatSignedAmountDelta, recurrenceAmountVariance } from '@/features/transactions/format';
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
const activeTab = ref<'dues' | 'attachments'>('dues');

const attachedFiles = computed(() => expense.value?.files ?? []);

const detailTabs = computed(() => [
    { value: 'dues' as const, label: t('recurrencesPage.detail.tabs.dues'), icon: CalendarEventIcon },
    {
        value: 'attachments' as const,
        label: t('recurrencesPage.detail.tabs.attachments'),
        icon: PaperclipIcon,
        chip: attachedFiles.value.length || undefined
    }
]);

const open = computed({
    get: () => props.modelValue && !!props.publicId,
    set: (value: boolean) => emit('update:modelValue', value)
});

const visibleDues = ref<RecurringDue[]>([]);
const groupOpen = reactive({ existing: true, upcoming: true });

const template = computed(() => {
    void store.detailsEpoch;
    return props.publicId ? store.getDetail(props.kind, props.publicId) : null;
});
const dues = computed(() => {
    void store.duesEpoch;
    if (!props.publicId) return visibleDues.value;
    const loaded = store.getDues(props.kind, props.publicId);
    if (loaded.length) return loaded;
    if (visibleDues.value.length) return visibleDues.value;
    return template.value?.upcomingDues ?? [];
});
const dueGroups = computed(() => {
    const grouped = groupDuesForDetail(dues.value);
    return [
        { key: 'existing' as const, title: t('recurrencesPage.detail.duesExisting'), items: grouped.existing },
        { key: 'upcoming' as const, title: t('recurrencesPage.detail.duesUpcoming'), items: grouped.upcoming }
    ].filter((group) => group.items.length);
});
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
        const detail =
            props.kind === 'expense' ? await store.getExpense(props.publicId, true) : await store.getIncome(props.publicId, true);
        visibleDues.value = detail.upcomingDues ?? store.getDues(props.kind, props.publicId);
        const items = await store.loadDues(props.kind, props.publicId, { force: true });
        visibleDues.value = items.length ? items : (store.getDues(props.kind, props.publicId) ?? []);
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
        visibleDues.value = [];
        groupOpen.existing = true;
        groupOpen.upcoming = true;
        if (!value) return;
        activeTab.value = 'dues';
        void loadDetail();
    },
    { immediate: true }
);

function statusLabel(due: RecurringDue) {
    return t(`recurrencesPage.dueStatuses.${displayDueStatus(due, props.kind)}`);
}

function dueAmount(due: RecurringDue) {
    const currency = template.value?.currency ?? 'CHF';
    const amount = due.actualAmount ?? due.plannedAmount;
    return formatPlannedAmount(amount, currency, locale.value);
}

function dueVariance(due: RecurringDue) {
    if (due.actualAmount == null) return null;
    return recurrenceAmountVariance(due.actualAmount, due.plannedAmount, props.kind);
}

function dueDeltaLabel(due: RecurringDue) {
    const variance = dueVariance(due);
    const currency = template.value?.currency ?? 'CHF';
    if (!variance) return '';
    return formatSignedAmountDelta(variance.delta, currency, locale.value);
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
        const fetched = await transactionsApi.get(due.transactionPublicId);
        txTarget.value = {
            ...fetched,
            duePlannedAmount: fetched.duePlannedAmount ?? due.plannedAmount
        };
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
    <AppModalTabs
        v-model="open"
        v-model:tab="activeTab"
        :title="template?.name || t('recurrencesPage.detail.title')"
        :subtitle="t('recurrencesPage.detail.subtitle')"
        :tabs="detailTabs"
        :max-width="760"
        :height="780"
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

        <template #panel-dues>
            <AppModalPanelScroll>
                <template v-if="template">
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

                    <div v-if="store.loadingDues && !dues.length" class="su-loading"><span class="su-spin" /></div>
                    <p v-else-if="!dues.length" class="text-medium-emphasis">{{ t('recurrencesPage.detail.duesEmpty') }}</p>
                    <div v-else class="su-stack recurring-detail-dues">
                        <AppAccordion
                            v-for="group in dueGroups"
                            :key="group.key"
                            v-model="groupOpen[group.key]"
                            :title="group.title"
                        >
                            <template #extra>
                                <span class="recurring-detail-dues__count">{{ group.items.length }}</span>
                            </template>
                            <div class="recurring-detail-dues__list">
                                <div
                                    v-for="due in group.items"
                                    :key="due.publicId"
                                    class="recurring-due-row"
                                    :class="{ 'is-link': group.key === 'existing' && due.transactionPublicId }"
                                    @click="group.key === 'existing' ? openTransaction(due) : undefined"
                                >
                                    <span class="recurring-due-row__icon" :class="`is-${group.key}`">
                                        <component
                                            :is="group.key === 'existing' ? CheckIcon : CalendarEventIcon"
                                            size="18"
                                            stroke-width="1.8"
                                        />
                                    </span>
                                    <div class="recurring-due-row__meta">
                                        <p class="recurring-due-row__date">{{ formatCalendarDate(due.scheduledAt, locale) }}</p>
                                        <p class="recurring-due-row__sub">{{ statusLabel(due) }}</p>
                                    </div>
                                    <div class="recurring-due-row__actions" @click.stop>
                                        <span class="recurring-due-row__figures">
                                            <span class="recurring-due-row__amount" :class="kind === 'expense' ? 'is-debit' : 'is-credit'">
                                                {{ dueAmount(due) }}
                                            </span>
                                            <span
                                                v-if="dueVariance(due)"
                                                class="recurring-due-row__delta"
                                                :class="`is-${dueVariance(due)?.tone}`"
                                            >
                                                {{ dueDeltaLabel(due) }}
                                            </span>
                                        </span>
                                        <button
                                            v-if="group.key === 'existing' && isDueSettled(due, kind) && due.transactionPublicId"
                                            type="button"
                                            class="su-orb"
                                            :aria-label="t('recurrencesPage.actions.openTransaction')"
                                            @click="openTransaction(due)"
                                        >
                                            <EyeIcon :size="16" stroke-width="1.6" />
                                        </button>
                                        <template v-else-if="group.key === 'upcoming' && isDueOpen(due, kind) && canConfirm">
                                            <button
                                                type="button"
                                                class="su-btn su-btn--ink"
                                                :disabled="store.acting"
                                                @click="confirmDue = due"
                                            >
                                                {{ t('recurrencesPage.actions.confirmDue') }}
                                            </button>
                                            <button
                                                type="button"
                                                class="su-btn su-btn--danger"
                                                :disabled="store.acting"
                                                @click="skipDue = due"
                                            >
                                                {{ t('recurrencesPage.actions.skipDue') }}
                                            </button>
                                        </template>
                                    </div>
                                </div>
                            </div>
                        </AppAccordion>
                    </div>
                </template>
            </AppModalPanelScroll>
        </template>

        <template #panel-attachments>
            <AppModalPanelScroll>
                <TransactionAttachments
                    v-if="expense"
                    :files="attachedFiles"
                    :library="filesStore.items"
                    :can-edit="canConfirm"
                    :uploading="uploading"
                    :acting="store.acting"
                    @upload="onUpload"
                    @pick="onPick"
                    @detach="onDetach"
                    @open="previewFile = $event"
                />
                <p v-else class="text-medium-emphasis">{{ t('recurrencesPage.detail.filesIncomeEmpty') }}</p>
            </AppModalPanelScroll>
        </template>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" @click="seeRelatedTransactions">
                <EyeIcon :size="16" stroke-width="1.6" />
                {{ t('recurrencesPage.detail.seeTransactions') }}
            </button>
            <button v-if="canConfirm" type="button" class="su-btn" @click="emit('edit')">{{ t('recurrencesPage.actions.edit') }}</button>
            <button type="button" class="su-btn su-btn--ink" @click="close">{{ t('common.close') }}</button>
        </template>
    </AppModalTabs>

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
        confirm-color="error"
        :loading="store.acting"
        @confirm="onSkip"
    />

    <TransactionFilePreviewModal v-model="previewOpen" :file="previewFile" />
    <TransactionFormModal v-model="txOpen" :transaction="txTarget" @saved="loadDetail" />
</template>

<style scoped>
.recurring-detail-dues {
    gap: 12px;
}

.recurring-detail-dues :deep(.app-accordion.is-open) {
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset;
}

.recurring-detail-dues__count {
    color: var(--ink-muted);
    font-size: 12.5px;
    font-weight: 650;
}

.recurring-detail-dues__list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: visible;
    margin: 0 -6px;
}

.recurring-due-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    min-width: 0;
    padding: 10px;
    box-sizing: border-box;
    border-radius: 12px;
    color: inherit;
    position: relative;
    z-index: 0;
    transition:
        transform 0.5s var(--spring),
        box-shadow 0.45s var(--ease),
        background 0.3s var(--ease);
}

.recurring-due-row.is-link {
    cursor: pointer;
}

.recurring-due-row:hover {
    background: var(--surface-hover-soft);
}

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
    .recurring-due-row:hover {
        z-index: 1;
        transform: scale(1.012);
        box-shadow:
            0 1px 2px rgba(16, 16, 20, 0.04),
            0 12px 28px -16px rgba(16, 16, 20, 0.18);
    }
}

.recurring-due-row__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 38px;
    height: 38px;
    margin-top: 1px;
    border-radius: 12px;
    background: var(--hair);
    color: var(--ink-muted);
}

.recurring-due-row__icon.is-existing {
    background: rgba(var(--v-theme-success), 0.12);
    color: rgb(var(--v-theme-success));
}

.recurring-due-row__icon.is-upcoming {
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
}

.recurring-due-row__meta {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.recurring-due-row__date {
    margin: 0;
    min-width: 0;
    font-size: 14.5px;
    font-weight: 620;
    letter-spacing: -0.01em;
}

.recurring-due-row__sub {
    margin: 0;
    font-size: 0.8rem;
    color: var(--ink-muted);
}

.recurring-due-row__actions {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    padding: 2px;
    margin: -2px;
}

.recurring-due-row__amount {
    margin-right: 6px;
    font-size: 0.92rem;
    font-weight: 680;
    letter-spacing: -0.02em;
    white-space: nowrap;
}

.recurring-due-row__amount.is-debit {
    color: rgb(var(--v-theme-error));
}

.recurring-due-row__amount.is-credit {
    color: rgb(var(--v-theme-success));
}

.recurring-due-row__figures {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    margin-right: 6px;
}

.recurring-due-row__delta {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    white-space: nowrap;
}

.recurring-due-row__delta.is-unfavorable {
    color: rgb(var(--v-theme-error));
}

.recurring-due-row__delta.is-favorable {
    color: rgb(var(--v-theme-success));
}

@media (max-width: 600px) {
    .recurring-due-row {
        flex-wrap: wrap;
        gap: 8px;
    }

    .recurring-due-row__actions {
        width: 100%;
        justify-content: flex-start;
        padding-left: 50px;
    }
}
</style>
