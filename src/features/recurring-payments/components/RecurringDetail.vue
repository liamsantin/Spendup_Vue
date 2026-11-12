<script setup lang="ts">
/**
 * Fiche d’une récurrence (page, plus de modale). Onglets portés par `?tab=` :
 * Informations (chiffres clés et caractéristiques), Échéances (passées et à venir), Transactions (liées), Justificatifs
 * (PDF de la récurrence, puis ceux des transactions liées).
 */
defineOptions({ name: 'RecurringDetail' });

import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { CalendarEventIcon, CheckIcon, ChevronDownIcon, EyeIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { ENTITY_FILES_MAX, entityAttachmentSource, type AttachmentSource } from '@/features/attachments/api';
import EntityAttachmentsPanel from '@/features/attachments/components/EntityAttachmentsPanel.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import RecurringDueConfirmModal from '@/features/recurring-payments/components/modals/RecurringDueConfirmModal.vue';
import RecurringLinkTransactionsModal from '@/features/recurring-payments/components/modals/RecurringLinkTransactionsModal.vue';
import RecurringTemplateFormModal from '@/features/recurring-payments/components/modals/RecurringTemplateFormModal.vue';
import {
    displayDueStatus,
    formatCalendarDate,
    formatPlannedAmount,
    groupDuesForDetail,
    isDueLinkable,
    isDueOpen,
    isDueSettled,
    isExpenseTemplate
} from '@/features/recurring-payments/format';
import { groupTransactionsWithFiles, listAllLinkedTransactions } from '@/features/recurring-payments/linked-transaction-files';
import type { RecurringDetailTab } from '@/features/recurring-payments/paths';
import { canConfirmRecurringOnAccount } from '@/features/recurring-payments/rights';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import type { RecurringDue, RecurringKind } from '@/features/recurring-payments/types';
import LinkedTransactionFiles from '@/features/transactions/components/LinkedTransactionFiles.vue';
import LinkedTransactionsPanel from '@/features/transactions/components/LinkedTransactionsPanel.vue';
import type { TransactionsCreateDefaults, TransactionsLockedFilters } from '@/features/transactions/components/TransactionsTimeline.vue';
import { transactionFormFieldsWithoutRecurrence } from '@/features/transactions/link-asset';
import TransactionFormModal from '@/features/transactions/components/modals/TransactionFormModal.vue';
import { transactionsApi } from '@/features/transactions/api';
import { formatSignedAmountDelta, recurrenceAmountVariance } from '@/features/transactions/format';
import { TRANSACTION_FILES_MAX, type Transaction } from '@/features/transactions/types';

const props = defineProps<{
    kind: RecurringKind;
    publicId: string;
    tab: RecurringDetailTab;
}>();

const emit = defineEmits<{
    'not-found': [];
}>();

const { t, locale } = useI18n();
const accountsStore = useAccountsStore();
const store = useRecurringPaymentsStore();

const localError = ref<string | null>(null);
const loading = ref(false);
const confirmDue = ref<RecurringDue | null>(null);
const skipDue = ref<RecurringDue | null>(null);
const txTarget = ref<Transaction | null>(null);
const linkedTransactions = ref<Transaction[]>([]);
const loadingLinkedTx = ref(false);
const linkOpen = ref(false);
const editOpen = ref(false);
const visibleDues = ref<RecurringDue[]>([]);
const groupOpen = reactive({ existing: true, upcoming: true });

const template = computed(() => {
    void store.detailsEpoch;
    return store.getDetail(props.kind, props.publicId);
});
const expense = computed(() => (template.value && isExpenseTemplate(template.value) ? template.value : null));
const income = computed(() => (template.value && !isExpenseTemplate(template.value) ? template.value : null));

const dues = computed(() => {
    void store.duesEpoch;
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

const account = computed(() =>
    template.value ? (accountsStore.accounts.find((item) => item.publicId === template.value!.accountPublicId) ?? null) : null
);
const canConfirm = computed(() => canConfirmRecurringOnAccount(account.value));
const linkableDues = computed(() => dues.value.filter((due) => isDueLinkable(due, props.kind)));
const canLinkTransactions = computed(() => canConfirm.value && linkableDues.value.length > 0);

/**
 * Justificatifs posés sur la récurrence : une charge les porte dans sa réponse (store), un revenu passe par les
 * routes génériques. Le panneau ne voit qu’une source.
 */
const attachmentSource = computed<AttachmentSource>(() => {
    const id = props.publicId;
    if (props.kind === 'income') return entityAttachmentSource('recurringIncome', id);
    const current = () => {
        const detail = store.getDetail('expense', id);
        const files = detail && isExpenseTemplate(detail) ? detail.files : [];
        return { items: files, totalCount: files.length };
    };
    return {
        key: `recurringExpense:${id}`,
        max: Math.min(TRANSACTION_FILES_MAX, ENTITY_FILES_MAX),
        list: async () => current(),
        attach: async (filePublicId) => {
            await store.attachExpenseFile(id, filePublicId);
            return current();
        },
        detach: (filePublicId) => store.detachExpenseFile(id, filePublicId)
    };
});
const linkedTxFileGroups = computed(() => groupTransactionsWithFiles(linkedTransactions.value));

/** « Ajouter » : écriture du bon type, sur le compte de la récurrence, déjà rattachée à elle. */
const createDefaults = computed<TransactionsCreateDefaults>(() => ({
    accountPublicId: template.value?.accountPublicId,
    type: props.kind === 'expense' ? 'depense' : 'revenu',
    recurrencePublicId: props.publicId
}));

/** Onglet Transactions : la liste est filtrée sur cette récurrence, comme l’onglet d’un actif. */
const transactionFilters = computed<TransactionsLockedFilters>(() =>
    props.kind === 'expense' ? { recurringExpensePublicId: props.publicId } : { recurringIncomePublicId: props.publicId }
);

const frequencyLabel = computed(() => {
    const current = template.value;
    if (!current) return '';
    return props.kind === 'expense'
        ? t(`recurrencesPage.expenseFrequencies.${current.frequency}`)
        : t(`recurrencesPage.incomeFrequencies.${current.frequency}`);
});

/** Rangée de chiffres : montant prévu, prochaine échéance, fréquence. */
const figures = computed(() => {
    const current = template.value;
    if (!current) return [];
    return [
        {
            id: 'amount',
            label: t('recurrencesPage.form.fields.plannedAmount'),
            value: formatPlannedAmount(current.plannedAmount, current.currency, locale.value),
            tone: props.kind === 'expense' ? 'su-neg' : 'su-pos'
        },
        {
            id: 'next',
            label: t('recurrencesPage.detail.nextDue'),
            value: current.nextDueDate ? formatCalendarDate(current.nextDueDate, locale.value) : '—',
            tone: ''
        },
        { id: 'frequency', label: t('recurrencesPage.form.fields.frequency'), value: frequencyLabel.value, tone: '' }
    ];
});

/** Caractéristiques : type, compte, période, jour de paiement (revenu), état. */
const facts = computed(() => {
    const current = template.value;
    if (!current) return [];
    const field = (key: string) => t(`recurrencesPage.form.fields.${key}`);
    const list: { id: string; label: string; value: string }[] = [];
    if (expense.value) {
        list.push({ id: 'type', label: field('expenseType'), value: t(`recurrencesPage.expenseTypes.${expense.value.expenseType}`) });
    }
    if (income.value) {
        list.push({ id: 'type', label: field('incomeType'), value: t(`recurrencesPage.incomeTypes.${income.value.incomeType}`) });
    }
    list.push({ id: 'account', label: field('account'), value: account.value?.name ?? t('recurrencesPage.unknownAccount') });
    list.push({ id: 'start', label: field('startDate'), value: formatCalendarDate(current.startDate, locale.value) });
    if (current.endDate) list.push({ id: 'end', label: field('endDate'), value: formatCalendarDate(current.endDate, locale.value) });
    if (income.value?.paymentDay != null) list.push({ id: 'day', label: field('paymentDay'), value: String(income.value.paymentDay) });
    list.push({ id: 'active', label: field('isActive'), value: current.isActive ? t('common.yes') : t('common.no') });
    return list;
});

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
async function loadDetail() {
    const id = props.publicId.trim();
    if (!id) return;
    loading.value = true;
    localError.value = null;
    try {
        const detail = props.kind === 'expense' ? await store.getExpense(id, true) : await store.getIncome(id, true);
        visibleDues.value = detail.upcomingDues ?? store.getDues(props.kind, id);
        if (!accountsStore.initialized) void accountsStore.loadAccounts().catch(() => undefined);
        const items = await store.loadDues(props.kind, id, { force: true });
        visibleDues.value = items.length ? items : (store.getDues(props.kind, id) ?? []);
        await loadLinkedTransactions();
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        store.clearError();
        if (err.status === 404) {
            emit('not-found');
            return;
        }
        localError.value = getErrorMessage(e);
    } finally {
        loading.value = false;
    }
}

async function loadLinkedTransactions() {
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

watch(
    () => [props.publicId, props.kind] as const,
    () => {
        visibleDues.value = [];
        linkedTransactions.value = [];
        groupOpen.existing = true;
        groupOpen.upcoming = true;
        editOpen.value = false;
        void loadDetail();
    },
    { immediate: true }
);

function statusLabel(due: RecurringDue) {
    return t(`recurrencesPage.dueStatuses.${displayDueStatus(due, props.kind)}`);
}

function dueAmount(due: RecurringDue) {
    const currency = template.value?.currency ?? 'CHF';
    return formatPlannedAmount(due.actualAmount ?? due.plannedAmount, currency, locale.value);
}

function dueVariance(due: RecurringDue) {
    if (due.actualAmount == null) return null;
    return recurrenceAmountVariance(due.actualAmount, due.plannedAmount, props.kind);
}

function dueDeltaLabel(due: RecurringDue) {
    const variance = dueVariance(due);
    if (!variance) return '';
    return formatSignedAmountDelta(variance.delta, template.value?.currency ?? 'CHF', locale.value);
}

async function onSkip() {
    if (!skipDue.value) return;
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
        txTarget.value = { ...fetched, duePlannedAmount: fetched.duePlannedAmount ?? due.plannedAmount };
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.value = t('recurrencesPage.errors.transactionGone');
            await store.loadDues(props.kind, props.publicId, { force: true });
            return;
        }
        localError.value = getErrorMessage(e);
    }
}

function openEdit() {
    if (template.value && canConfirm.value) editOpen.value = true;
}

function openLink() {
    if (canLinkTransactions.value) linkOpen.value = true;
}

defineExpose({ openEdit, openLink, reload: loadDetail, canEdit: canConfirm, canLink: canLinkTransactions });
</script>

<template>
    <div class="recurring-detail" :class="{ 'su-fill': tab === 'transactions' }">
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

        <div v-if="!template && loading" class="su-loading"><span class="su-spin" /></div>

        <template v-else-if="template">
            <!-- ── Informations ── -->
            <div v-if="tab === 'informations'" class="recurring-detail__info">
                <p v-if="!template.isActive" class="recurring-detail__pause">
                    <span class="su-sq" aria-hidden="true" />
                    {{ t('recurrencesPage.form.pauseHint') }}
                </p>

                <div class="su-figs recurring-detail__figs">
                    <div v-for="fig in figures" :key="fig.id" class="su-fig">
                        <p class="su-fig__label">{{ fig.label }}</p>
                        <p class="su-fig__num" :class="[fig.tone, { 'is-loading': loading }]">{{ fig.value }}</p>
                    </div>
                </div>

                <div class="recurring-detail__sheet">
                    <div v-for="fact in facts" :key="fact.id" class="su-kv">
                        <span>{{ fact.label }}</span>
                        <span>{{ fact.value }}</span>
                    </div>
                </div>

                <p v-if="template.notes" class="recurring-detail__notes">{{ template.notes }}</p>
            </div>

            <!-- ── Échéances ── -->
            <div v-else-if="tab === 'dues'" class="recurring-detail__panel">
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
            </div>

            <!-- ── Justificatifs ── -->
            <!-- ── Transactions liées à la récurrence ── -->
            <LinkedTransactionsPanel
                v-else-if="tab === 'transactions'"
                :locked-filters="transactionFilters"
                :create-defaults="createDefaults"
                :unlink-fields="transactionFormFieldsWithoutRecurrence"
                :can-link="canLinkTransactions && !store.acting"
                :can-unlink="canConfirm"
                :can-create="canConfirm"
                @link="openLink"
                @changed="loadDetail"
            />

            <EntityAttachmentsPanel
                v-else-if="tab === 'attachments'"
                :source="attachmentSource"
                :title="t('recurrencesPage.detail.filesOnTemplate')"
                :can-edit="canConfirm"
            >
                <template #default="{ openFile }">
                    <section class="entity-attachments__block">
                        <h2 class="entity-attachments__title">{{ t('recurrencesPage.detail.filesOnTransactions') }}</h2>
                        <LinkedTransactionFiles
                            :groups="linkedTxFileGroups"
                            :loading="loadingLinkedTx"
                            :empty-text="t('recurrencesPage.detail.filesOnTransactionsEmpty')"
                            @open-transaction="txTarget = $event"
                            @open-file="openFile"
                        />
                    </section>
                </template>
            </EntityAttachmentsPanel>
        </template>

        <RecurringTemplateFormModal v-model="editOpen" :kind="kind" :template="template" @saved="loadDetail" />
        <RecurringLinkTransactionsModal v-model="linkOpen" :kind="kind" :template="template" :dues="dues" @linked="loadDetail" />
        <RecurringDueConfirmModal
            v-model="confirmOpen"
            :kind="kind"
            :template-public-id="publicId"
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
        <TransactionFormModal v-model="txOpen" :transaction="txTarget" @saved="loadDetail" />
    </div>
</template>

<style scoped>
.recurring-detail {
    display: flex;
    flex-direction: column;
    gap: 32px;
    min-width: 0;
    padding: 8px 0 24px;
}

.recurring-detail__info {
    display: flex;
    flex-direction: column;
    gap: 32px;
    min-width: 0;
}

/* une seule rangée de chiffres, comme la fiche d’un actif */
.recurring-detail__figs {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.recurring-detail__figs .su-fig__num {
    font-size: 26px;
    white-space: normal;
    overflow-wrap: anywhere;
}

.recurring-detail__figs .su-fig__num.is-loading {
    opacity: 0.35;
}

.recurring-detail__sheet {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 64px;
}

.recurring-detail__sheet .su-kv:nth-child(-n + 2) {
    border-top: 0;
    padding-top: 0;
}

.recurring-detail__notes {
    margin: 8px 0 0;
    color: var(--ink);
    font-size: 14px;
    white-space: pre-wrap;
}

.recurring-detail__pause {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 4px;
    color: var(--violet-ink);
    font-size: 13px;
    font-weight: 700;
    --sq-color: var(--violet);
}

.recurring-detail__panel {
    min-width: 0;
}

.recurring-detail__empty {
    margin: 0;
    color: var(--gray);
    font-size: 14px;
}

/* ── groupes d’échéances : titre 700 sur filet, repliable ── */
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
    border-bottom: 2px solid var(--ink);
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
    color: var(--gray);
    font-size: 12.5px;
    white-space: nowrap;
}

.recurring-due-row__delta.is-unfavorable {
    color: var(--violet-ink);
}

.recurring-due-row__delta.is-favorable {
    color: var(--blue-ink);
}

@media (max-width: 767px) {
    .recurring-detail {
        gap: 24px;
        padding: 0 0 16px;
    }

    .recurring-detail__figs,
    .recurring-detail__sheet {
        grid-template-columns: minmax(0, 1fr);
    }

    .recurring-detail__sheet .su-kv:nth-child(2) {
        border-top: 1px solid var(--line);
        padding-top: 12px;
    }

    .recurring-detail__figs .su-fig__num {
        font-size: 22px;
    }

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
