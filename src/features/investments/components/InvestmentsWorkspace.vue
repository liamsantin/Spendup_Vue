<script setup lang="ts">
/**
 * Espace d'un compte de placement : positions (avec « mettre à jour le cours ») puis journal des opérations,
 * modales de saisie et confirmations. Écriture d'opérations réservée au propriétaire du compte.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts';
import { canWriteInvestments, formatCalendarDate, isInstrumentCurrency } from '@/features/investments/format';
import { useInvestmentsStore } from '@/features/investments/stores/investments-store';
import { EMPTY_OPERATIONS_FILTERS, type OperationsFilters } from '@/features/investments/stores/internal/investments-state';
import type { Instrument, InstrumentCurrency, InvestmentOperation } from '@/features/investments/types';
import PositionsTable from '@/features/investments/components/PositionsTable.vue';
import OperationsList from '@/features/investments/components/OperationsList.vue';
import InstrumentFormModal from '@/features/investments/components/modals/InstrumentFormModal.vue';
import InstrumentPriceModal from '@/features/investments/components/modals/InstrumentPriceModal.vue';
import OperationFormModal from '@/features/investments/components/modals/OperationFormModal.vue';

const props = defineProps<{
    accountPublicId: string;
}>();

const { t, locale } = useI18n();
const store = useInvestmentsStore();
const accountsStore = useAccountsStore();

const localError = ref<string | null>(null);
const filters = ref<OperationsFilters>({ ...EMPTY_OPERATIONS_FILTERS });

const operationOpen = ref(false);
const operationTarget = ref<InvestmentOperation | null>(null);
const instrumentOpen = ref(false);
const instrumentTarget = ref<Instrument | null>(null);
const priceTarget = ref<Instrument | null>(null);
const deleteTarget = ref<InvestmentOperation | null>(null);

const account = computed(() => accountsStore.accounts.find((item) => item.publicId === props.accountPublicId) ?? null);
const canWrite = computed(() => canWriteInvestments(account.value));
const accountRef = computed(() => ({ publicId: props.accountPublicId, currency: account.value?.currency ?? 'CHF' }));
const defaultCurrency = computed<InstrumentCurrency | null>(() => {
    const currency = account.value?.currency;
    return isInstrumentCurrency(currency) ? currency : null;
});

const positions = computed(() => store.positionsFor(props.accountPublicId));
const operations = computed(() => store.operationsFor(props.accountPublicId));
const includeClosed = computed(() => store.includeClosedFor(props.accountPublicId));

/** Instruments du filtre : positions + opérations chargées + instrument filtré. */
const filterInstruments = computed<Instrument[]>(() => {
    const byId = new Map<string, Instrument>();
    for (const position of positions.value?.items ?? []) byId.set(position.instrument.publicId, position.instrument);
    for (const operation of operations.value?.items ?? []) {
        if (!byId.has(operation.instrument.publicId)) byId.set(operation.instrument.publicId, operation.instrument);
    }
    return [...byId.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
});

const operationModalOpen = computed({
    get: () => operationOpen.value,
    set: (value: boolean) => {
        operationOpen.value = value;
        if (!value) operationTarget.value = null;
    }
});

const instrumentModalOpen = computed({
    get: () => instrumentOpen.value,
    set: (value: boolean) => {
        instrumentOpen.value = value;
        if (!value) instrumentTarget.value = null;
    }
});

const priceOpen = computed({
    get: () => !!priceTarget.value,
    set: (value: boolean) => {
        if (!value) priceTarget.value = null;
    }
});

const deleteOpen = computed({
    get: () => !!deleteTarget.value,
    set: (value: boolean) => {
        if (!value) deleteTarget.value = null;
    }
});

const deleteMessage = computed(() => {
    const op = deleteTarget.value;
    if (!op) return '';
    return t('investmentsPage.deleteModal.body', {
        type: t(`investmentsPage.operationTypes.${op.type}`),
        symbol: op.instrument.symbol,
        date: formatCalendarDate(op.operationDate, locale.value)
    });
});

async function load(force = false) {
    const id = props.accountPublicId;
    if (!id) return;
    localError.value = null;
    filters.value = { ...(store.operationsFor(id)?.filters ?? EMPTY_OPERATIONS_FILTERS) };
    try {
        if (force) {
            await Promise.all([store.refetchPositions(id), store.refetchOperations(id)]);
        } else {
            await store.bootstrap(id);
        }
    } catch {
        // `store.error` porte déjà le message (404 neutre ou message serveur).
    }
}

function onVisibilityChange() {
    if (document.visibilityState !== 'visible' || !store.isAccountLoaded(props.accountPublicId)) return;
    void load(true);
}

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void load();
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
});

watch(
    () => props.accountPublicId,
    () => {
        void load();
    }
);

function onIncludeClosed(value: boolean) {
    void store.loadPositions(props.accountPublicId, { includeClosed: value }).catch(() => undefined);
}

function onFilter(next: OperationsFilters) {
    filters.value = next;
    void store
        .loadOperations(props.accountPublicId, {
            instrumentPublicId: next.instrumentPublicId ?? undefined,
            type: next.type ?? undefined,
            from: next.from ?? undefined,
            to: next.to ?? undefined
        })
        .catch(() => undefined);
}

function onLoadMore() {
    void store.loadMoreOperations(props.accountPublicId).catch(() => undefined);
}

function openCreateOperation() {
    if (!canWrite.value || store.acting) return;
    operationTarget.value = null;
    operationOpen.value = true;
}

function openCreateInstrument() {
    instrumentTarget.value = null;
    instrumentOpen.value = true;
}

defineExpose({ openCreateOperation, openCreateInstrument });

function onEditOperation(operation: InvestmentOperation) {
    if (!canWrite.value) return;
    operationTarget.value = operation;
    operationOpen.value = true;
}

function onEditInstrument(instrument: Instrument) {
    instrumentTarget.value = instrument;
    instrumentOpen.value = true;
}

function onUpdatePrice(instrument: Instrument) {
    priceTarget.value = instrument;
}

/** Cours saisi : le temps réel suit, mais on rafraîchit tout de suite le compte affiché. */
function onPriceSaved() {
    void store.refetchPositions(props.accountPublicId);
}

/** Instrument renommé : il est embarqué dans les positions et le journal. */
function onInstrumentSaved() {
    void store.refetchPositions(props.accountPublicId);
    void store.refetchOperations(props.accountPublicId);
}

async function confirmDelete() {
    const target = deleteTarget.value;
    if (!target) return;
    localError.value = null;
    try {
        await store.deleteOperation(props.accountPublicId, target.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('investmentsPage.errors.operationNotFound') : getErrorMessage(e);
        deleteTarget.value = null;
        store.clearError();
    }
}

function dismissError() {
    localError.value = null;
    store.clearError();
}
</script>

<template>
    <div class="investments-workspace">
        <AppAlert v-if="localError || store.error" type="error" class="su-alert" closable @dismiss="dismissError">
            {{ localError || store.error }}
        </AppAlert>

        <p v-if="account && !canWrite" class="investments-workspace__readonly">{{ t('investmentsPage.readOnly') }}</p>

        <PositionsTable
            :result="positions"
            :account="accountRef"
            :acting="store.acting"
            :can-write="canWrite"
            :loading="store.loadingPositions"
            :include-closed="includeClosed"
            @update:include-closed="onIncludeClosed"
            @update-price="onUpdatePrice"
            @edit-instrument="onEditInstrument"
        />

        <OperationsList
            :page="operations"
            :filters="filters"
            :instruments="filterInstruments"
            :loading="store.loadingOperations"
            :acting="store.acting"
            :can-write="canWrite"
            @filter="onFilter"
            @load-more="onLoadMore"
            @edit="onEditOperation"
            @delete="deleteTarget = $event"
        />

        <OperationFormModal
            v-model="operationModalOpen"
            :account-public-id="accountPublicId"
            :operation="operationTarget"
            :default-instrument-public-id="filters.instrumentPublicId"
            :default-currency="defaultCurrency"
        />
        <InstrumentFormModal
            v-model="instrumentModalOpen"
            :instrument="instrumentTarget"
            :default-currency="defaultCurrency"
            @saved="onInstrumentSaved"
        />
        <InstrumentPriceModal v-model="priceOpen" :instrument="priceTarget" @saved="onPriceSaved" />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('investmentsPage.deleteModal.title')"
            :message="deleteMessage"
            :confirm-label="t('investmentsPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.investments-workspace {
    display: flex;
    flex-direction: column;
    gap: var(--section-gap);
    width: 100%;
    min-width: 0;
    padding: 8px 0 24px;
}

.investments-workspace > .su-alert {
    margin: 0;
}

.investments-workspace__readonly {
    margin: 0;
    color: var(--gray);
    font-size: 13px;
}

@media (max-width: 767px) {
    .investments-workspace {
        gap: 40px;
        padding: 0 0 16px;
    }
}
</style>
