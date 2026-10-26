<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { CalendarEventIcon, CheckIcon, ChevronDownIcon, EyeIcon, PaperclipIcon, PlusIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppModalPanelScroll from '@/components/shared/modal/AppModalPanelScroll.vue';
import AppModalTabs from '@/components/shared/modal/AppModalTabs.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { useFilesStore } from '@/features/files/stores/files-store';
import { fileSizeParts, isQuotaExceededMessage, wouldExceedQuota } from '@/features/files/format';
import { validatePdfFile } from '@/features/files/validate-upload';
import type { FileDto } from '@/features/files/types';
import RecurringDueConfirmModal from '@/features/recurring-payments/components/modals/RecurringDueConfirmModal.vue';
import RecurringLinkTransactionsModal from '@/features/recurring-payments/components/modals/RecurringLinkTransactionsModal.vue';
import {
    displayDueStatus,
    formatCalendarDate,
    formatPlannedAmount,
    isDueOpen,
    isDueLinkable,
    isDueSettled,
    groupDuesForDetail,
    isExpenseTemplate
} from '@/features/recurring-payments/format';
import {
    groupTransactionsWithFiles,
    listAllLinkedTransactions,
    uniqueAttachmentCount
} from '@/features/recurring-payments/linked-transaction-files';
import { canConfirmRecurringOnAccount } from '@/features/recurring-payments/rights';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import type { RecurringDue, RecurringFile, RecurringKind } from '@/features/recurring-payments/types';
import TransactionAttachments from '@/features/transactions/components/forms/TransactionAttachments.vue';
import TransactionFilePreviewModal from '@/features/transactions/components/modals/TransactionFilePreviewModal.vue';
import { transactionsApi } from '@/features/transactions/api';
import { formatOperationDate, formatSignedAmountDelta, recurrenceAmountVariance } from '@/features/transactions/format';
import type { Transaction, TransactionFile } from '@/features/transactions/types';
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
const linkedTransactions = ref<Transaction[]>([]);
const loadingLinkedTx = ref(false);
const linkOpen = ref(false);

const attachedFiles = computed(() => expense.value?.files ?? []);
const linkedTxFileGroups = computed(() => groupTransactionsWithFiles(linkedTransactions.value));
const attachmentCount = computed(() =>
    uniqueAttachmentCount(
        attachedFiles.value,
        linkedTxFileGroups.value.flatMap((group) => group.files)
    )
);

const detailTabs = computed(() => [
    { value: 'dues' as const, label: t('recurrencesPage.detail.tabs.dues'), icon: CalendarEventIcon },
    {
        value: 'attachments' as const,
        label: t('recurrencesPage.detail.tabs.attachments'),
        icon: PaperclipIcon,
        chip: attachmentCount.value || undefined
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
const linkableDues = computed(() => dues.value.filter((due) => isDueLinkable(due, props.kind)));
const canLinkTransactions = computed(() => canConfirm.value && linkableDues.value.length > 0);

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
        await loadLinkedTransactions();
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
        linkedTransactions.value = [];
        groupOpen.existing = true;
        groupOpen.upcoming = true;
        if (!value) return;
        activeTab.value = 'dues';
        void loadDetail();
    },
    { immediate: true }
);

async function loadLinkedTransactions() {
    if (!props.publicId) {
        linkedTransactions.value = [];
        return;
    }
    loadingLinkedTx.value = true;
    try {
        linkedTransactions.value = await listAllLinkedTransactions({
            kind: props.kind,
            publicId: props.publicId,
            list: (query) => transactionsApi.list(query),
            get: (publicId) => transactionsApi.get(publicId)
        });
    } catch (e: unknown) {
        linkedTransactions.value = [];
        localError.value = getErrorMessage(e);
    } finally {
        loadingLinkedTx.value = false;
    }
}

function fileSizeLabel(bytes: number) {
    const parts = fileSizeParts(bytes);
    return t(`filesPage.size.${parts.unit}`, { n: parts.n });
}

function openLinkedTransaction(transaction: Transaction) {
    txTarget.value = transaction;
}

function openLinkedFile(file: TransactionFile) {
    previewFile.value = file;
}

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
                    <p class="recurring-detail__lead">
                        {{ formatPlannedAmount(template.plannedAmount, template.currency, locale) }}
                        ·
                        {{
                            kind === 'expense'
                                ? t(`recurrencesPage.expenseFrequencies.${template.frequency}`)
                                : t(`recurrencesPage.incomeFrequencies.${template.frequency}`)
                        }}
                        · {{ account?.name || t('recurrencesPage.unknownAccount') }}
                    </p>
                    <p v-if="!template.isActive" class="recurring-detail__pause">{{ t('recurrencesPage.form.pauseHint') }}</p>

                    <div v-if="store.loadingDues && !dues.length" class="su-loading"><span class="su-spin" /></div>
                    <p v-else-if="!dues.length" class="recurring-detail__empty">{{ t('recurrencesPage.detail.duesEmpty') }}</p>
                    <div v-else class="recurring-detail-dues">
                        <section v-for="group in dueGroups" :key="group.key" class="recurring-dues-group">
                            <button
                                type="button"
                                class="recurring-dues-group__head"
                                :aria-expanded="groupOpen[group.key]"
                                @click="groupOpen[group.key] = !groupOpen[group.key]"
                            >
                                <span class="recurring-dues-group__title">{{ group.title }}</span>
                                <span class="recurring-dues-group__count">{{ group.items.length }}</span>
                                <ChevronDownIcon
                                    class="recurring-dues-group__chevron"
                                    :class="{ 'is-open': groupOpen[group.key] }"
                                    :size="16"
                                    stroke-width="1.8"
                                    aria-hidden="true"
                                />
                            </button>
                            <div v-show="groupOpen[group.key]" class="recurring-dues-group__list">
                                <div
                                    v-for="due in group.items"
                                    :key="due.publicId"
                                    class="recurring-due-row"
                                    :class="{ 'is-link': group.key === 'existing' && due.transactionPublicId }"
                                    @click="group.key === 'existing' ? openTransaction(due) : undefined"
                                >
                                    <span class="su-tile recurring-due-row__icon" :class="`is-${group.key}`" aria-hidden="true">
                                        <component
                                            :is="group.key === 'existing' ? CheckIcon : CalendarEventIcon"
                                            :size="18"
                                            stroke-width="1.7"
                                        />
                                    </span>
                                    <div class="recurring-due-row__meta">
                                        <p class="recurring-due-row__date">{{ formatCalendarDate(due.scheduledAt, locale) }}</p>
                                        <p class="recurring-due-row__sub">{{ statusLabel(due) }}</p>
                                    </div>
                                    <div class="recurring-due-row__actions" @click.stop>
                                        <span class="recurring-due-row__figures">
                                            <span class="recurring-due-row__amount" :class="kind === 'expense' ? 'su-neg' : 'su-pos'">
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
                                                class="su-btn su-btn--sm su-btn--ink"
                                                :disabled="store.acting"
                                                @click="confirmDue = due"
                                            >
                                                {{ t('recurrencesPage.actions.confirmDue') }}
                                            </button>
                                            <button
                                                type="button"
                                                class="su-btn su-btn--sm su-btn--danger"
                                                :disabled="store.acting"
                                                @click="skipDue = due"
                                            >
                                                {{ t('recurrencesPage.actions.skipDue') }}
                                            </button>
                                        </template>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </template>
            </AppModalPanelScroll>
        </template>

        <template #panel-attachments>
            <AppModalPanelScroll>
                <section v-if="expense" class="recurring-files-block">
                    <h3 class="recurring-files-block__title">{{ t('recurrencesPage.detail.filesOnTemplate') }}</h3>
                    <TransactionAttachments
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
                </section>
                <section class="recurring-files-block">
                    <h3 class="recurring-files-block__title">{{ t('recurrencesPage.detail.filesOnTransactions') }}</h3>
                    <div v-if="loadingLinkedTx" class="su-loading"><span class="su-spin" /></div>
                    <p v-else-if="!linkedTxFileGroups.length" class="recurring-detail__empty">
                        {{ t('recurrencesPage.detail.filesOnTransactionsEmpty') }}
                    </p>
                    <div v-else class="recurring-tx-files">
                        <article v-for="group in linkedTxFileGroups" :key="group.transaction.publicId" class="recurring-tx-files__group">
                            <button type="button" class="recurring-tx-files__tx" @click="openLinkedTransaction(group.transaction)">
                                <span class="recurring-tx-files__label">{{ group.transaction.label }}</span>
                                <span class="recurring-tx-files__date">{{
                                    formatOperationDate(group.transaction.operationDate, locale)
                                }}</span>
                            </button>
                            <ul class="recurring-tx-files__list">
                                <li v-for="file in group.files" :key="file.publicId" class="recurring-tx-files__chip">
                                    <button type="button" class="recurring-tx-files__open" @click="openLinkedFile(file)">
                                        <PaperclipIcon :size="16" stroke-width="1.6" />
                                        <span class="recurring-tx-files__name">{{ file.nameOriginal }}</span>
                                        <span class="recurring-tx-files__size">{{ fileSizeLabel(file.sizeBytes) }}</span>
                                    </button>
                                </li>
                            </ul>
                        </article>
                    </div>
                </section>
            </AppModalPanelScroll>
        </template>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" @click="seeRelatedTransactions">
                <EyeIcon :size="16" stroke-width="1.6" />
                {{ t('recurrencesPage.detail.seeTransactions') }}
            </button>
            <button v-if="canLinkTransactions" type="button" class="su-btn" :disabled="store.acting" @click="linkOpen = true">
                <PlusIcon :size="16" stroke-width="1.6" />
                {{ t('recurrencesPage.actions.addTransactions') }}
            </button>
            <button v-if="canConfirm" type="button" class="su-btn" @click="emit('edit')">{{ t('recurrencesPage.actions.edit') }}</button>
            <button type="button" class="su-btn su-btn--ink" @click="close">{{ t('common.close') }}</button>
        </template>
    </AppModalTabs>

    <RecurringLinkTransactionsModal v-model="linkOpen" :kind="kind" :template="template" :dues="dues" @linked="loadDetail" />

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
.recurring-detail__lead {
    margin: 0 0 16px;
    color: var(--gray);
    font-size: 14px;
}

.recurring-detail__pause {
    margin: -8px 0 16px;
    color: var(--violet-ink);
    font-size: 13px;
}

.recurring-detail__empty {
    margin: 0;
    color: var(--gray);
    font-size: 14px;
}

/* ── groupes d’échéances : titre 700 sur filet 2 px, repliable ── */
.recurring-detail-dues {
    display: flex;
    flex-direction: column;
    gap: 28px;
}

.recurring-dues-group__head {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 40px;
    margin: 0;
    padding: 0 0 8px;
    border: 0;
    border-bottom: 1px solid var(--line);
    background: transparent;
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.recurring-dues-group__head:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
}

.recurring-dues-group__title {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.025em;
}

.recurring-dues-group__count {
    color: var(--gray);
    font-size: 13px;
}

.recurring-dues-group__chevron {
    margin-left: auto;
    color: var(--gray);
    transition: transform 0.2s var(--ease);
}

.recurring-dues-group__chevron.is-open {
    transform: rotate(180deg);
}

/* ligne d’échéance : 36px | date 700 + statut | montant 700 | actions, filet fin */
.recurring-due-row {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-width: 0;
    padding: 12px 0;
    border-top: 1px solid var(--line);
    font-variant-numeric: tabular-nums;
    transition: background 0.15s var(--ease);
}

.recurring-dues-group__list > .recurring-due-row:first-child {
    border-top: 0;
}

.recurring-due-row.is-link {
    cursor: pointer;
}

.recurring-due-row.is-link:hover {
    background: var(--soft);
}

.recurring-due-row__icon.is-existing {
    background: var(--t-blue-bg);
    color: var(--t-blue-ink);
}

.recurring-due-row__icon.is-upcoming {
    background: var(--t-gray-bg);
    color: var(--t-gray-ink);
}

.recurring-due-row__meta {
    flex: 1 1 auto;
    min-width: 0;
}

.recurring-due-row__date {
    margin: 0;
    font-weight: 700;
    letter-spacing: -0.006em;
}

.recurring-due-row__sub {
    margin: 2px 0 0;
    color: var(--gray);
    font-size: 13px;
}

.recurring-due-row__actions {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
}

.recurring-due-row__figures {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    margin-right: 8px;
}

.recurring-due-row__amount {
    font-weight: 700;
    white-space: nowrap;
}

.recurring-due-row__delta {
    font-size: 12.5px;
    white-space: nowrap;
    color: var(--gray);
}

.recurring-due-row__delta.is-unfavorable {
    color: var(--violet-ink);
}

.recurring-due-row__delta.is-favorable {
    color: var(--blue-ink);
}

/* ── justificatifs ── */
.recurring-files-block + .recurring-files-block {
    margin-top: 32px;
}

.recurring-files-block__title {
    margin: 0 0 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--line);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.025em;
}

.recurring-tx-files {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.recurring-tx-files__group {
    min-width: 0;
}

.recurring-tx-files__tx {
    display: flex;
    align-items: baseline;
    gap: 8px;
    width: 100%;
    min-width: 0;
    margin: 0 0 4px;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.recurring-tx-files__tx:hover .recurring-tx-files__label {
    text-decoration: underline;
}

.recurring-tx-files__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 700;
}

.recurring-tx-files__date,
.recurring-tx-files__size {
    flex: none;
    color: var(--gray);
    font-size: 13px;
}

.recurring-tx-files__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
}

.recurring-tx-files__chip {
    display: flex;
    min-width: 0;
}

.recurring-tx-files__open {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;
    min-height: 40px;
    padding: 8px 0;
    border: 0;
    border-top: 1px solid var(--line);
    background: transparent;
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.recurring-tx-files__open:hover {
    background: var(--soft);
}

.recurring-tx-files__open > svg {
    flex: none;
    color: var(--gray);
}

.recurring-tx-files__name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.recurring-tx-files__size {
    margin: 0 0 0 auto;
}

@media (max-width: 600px) {
    .recurring-due-row {
        flex-wrap: wrap;
        gap: 8px 12px;
    }

    .recurring-due-row__actions {
        width: 100%;
        justify-content: flex-start;
        padding-left: 48px;
    }
}
</style>
