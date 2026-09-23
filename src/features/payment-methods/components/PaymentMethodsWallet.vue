<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { canWritePaymentMethods } from '@/features/payment-methods/rights';
import { usePaymentMethodsStore } from '@/features/payment-methods/stores/payment-methods-store';
import {
    PAYMENT_METHOD_SORT_DEFAULT,
    matchesPaymentMethodSearch,
    sortPaymentMethodsBy,
    type PaymentMethodLabels,
    type PaymentMethodSort
} from '@/features/payment-methods/format';
import type { PaymentMethod, PaymentMethodType } from '@/features/payment-methods/types';
import { downloadCsv } from '@/utils/helpers/csv';
import PaymentMethodListItem from '@/features/payment-methods/components/list/PaymentMethodListItem.vue';
import PaymentMethodTable from '@/features/payment-methods/components/list/PaymentMethodTable.vue';
import PaymentMethodFormModal from '@/features/payment-methods/components/modals/PaymentMethodFormModal.vue';

const props = withDefaults(
    defineProps<{
        showInactive?: boolean;
        type?: PaymentMethodType | null;
        search?: string | null;
        sort?: PaymentMethodSort;
    }>(),
    { showInactive: true, type: null, search: null, sort: PAYMENT_METHOD_SORT_DEFAULT }
);

const emit = defineEmits<{
    sort: [value: PaymentMethodSort];
}>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const accountsStore = useAccountsStore();
const store = usePaymentMethodsStore();

const createOpen = ref(false);
const editTarget = ref<PaymentMethod | null>(null);
const deleteTarget = ref<PaymentMethod | null>(null);
const localError = ref<string | null>(null);

const editOpen = computed({
    get: () => !!editTarget.value,
    set: (value: boolean) => {
        if (!value) editTarget.value = null;
    }
});

const deleteOpen = computed({
    get: () => !!deleteTarget.value,
    set: (value: boolean) => {
        if (!value) deleteTarget.value = null;
    }
});

function accountFromQuery(): string | null {
    const raw = route.query.account;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

const filterAccountId = computed(() => accountFromQuery());

const canCreate = computed(() => accountsStore.accounts.some((a) => canWritePaymentMethods(a)));

function accountName(accountPublicId: string): string {
    return accountsStore.accounts.find((a) => a.publicId === accountPublicId)?.name ?? t('paymentMethodsPage.unknownAccount');
}

function canWrite(accountPublicId: string): boolean {
    const account = accountsStore.accounts.find((a) => a.publicId === accountPublicId);
    return account ? canWritePaymentMethods(account) : false;
}

const labels: PaymentMethodLabels = {
    accountName,
    typeLabel: (type) => t(`paymentMethodsPage.types.${type}`)
};

const visibleItems = computed(() => {
    const accountId = filterAccountId.value;
    const needle = props.search?.trim() ?? '';
    const list = store.items.filter((item) => {
        if (!props.showInactive && !item.isActive) return false;
        if (accountId && item.accountPublicId !== accountId) return false;
        if (props.type && item.type !== props.type) return false;
        return !needle || matchesPaymentMethodSearch(item, needle, labels);
    });
    return sortPaymentMethodsBy(list, props.sort, labels);
});

const hasFilters = computed(() => !!(props.search?.trim() || props.type || !props.showInactive));
const emptyCopy = computed(() => {
    if (hasFilters.value) return t('paymentMethodsPage.empty.filtered');
    if (filterAccountId.value) return t('paymentMethodsPage.empty.account');
    return t('paymentMethodsPage.empty.wallet');
});

function exportCsv() {
    const header = (['label', 'type', 'account', 'reference', 'number', 'expiration', 'status'] as const).map((key) =>
        t(`paymentMethodsPage.columns.${key}`)
    );
    const rows = visibleItems.value.map((item) => [
        item.label,
        labels.typeLabel(item.type),
        accountName(item.accountPublicId),
        item.reference,
        item.lastFourDigits,
        item.expirationDate,
        item.isActive ? t('paymentMethodsPage.badges.active') : t('paymentMethodsPage.badges.inactive')
    ]);
    downloadCsv('moyens-de-paiement', header, rows);
}

const visibleCount = computed(() => visibleItems.value.length);

async function loadWallet(force = false) {
    localError.value = null;
    try {
        await accountsStore.loadAccounts(force);
        await store.loadList({ accountPublicId: filterAccountId.value ?? undefined, force });
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.value = t('paymentMethodsPage.errors.notFound');
            await store.loadList({ force: true }).catch(() => undefined);
            if (filterAccountId.value) {
                await router.replace({ path: '/app/finances/moyens-de-paiement' });
            }
            return;
        }
        localError.value = getErrorMessage(e);
    }
}

function onVisibilityChange() {
    if (document.visibilityState !== 'visible' || !store.initialized) return;
    void loadWallet(true).catch(() => undefined);
}

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void loadWallet().catch(() => undefined);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
});

function openCreate() {
    if (!canCreate.value) return;
    createOpen.value = true;
}

defineExpose({ openCreate, exportCsv, visibleCount });

watch(
    () => route.query.account,
    () => {
        void loadWallet().catch(() => undefined);
    }
);

async function confirmDelete() {
    if (!deleteTarget.value) return;
    localError.value = null;
    try {
        await store.deletePaymentMethod(deleteTarget.value.publicId, deleteTarget.value.accountPublicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('paymentMethodsPage.errors.notFound') : getErrorMessage(e);
        if (err.status === 404) {
            deleteTarget.value = null;
            void loadWallet(true).catch(() => undefined);
        }
    }
}
</script>

<template>
    <div class="wallet-panel">
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

        <div class="wallet-panel__scroll">
            <div v-if="store.loading && !store.items.length" class="su-loading">
                <span class="su-spin" />
            </div>
            <div v-else-if="!visibleItems.length" class="su-empty">
                <p>{{ emptyCopy }}</p>
            </div>
            <div v-else class="wallet-directory">
                <div class="wallet-directory__list">
                    <PaymentMethodListItem
                        v-for="method in visibleItems"
                        :key="method.publicId"
                        :method="method"
                        :account-name="filterAccountId ? null : accountName(method.accountPublicId)"
                        :can-write="canWrite(method.accountPublicId)"
                        :acting="store.acting"
                        @edit="editTarget = $event"
                        @delete="deleteTarget = $event"
                    />
                </div>
                <PaymentMethodTable
                    class="wallet-directory__table"
                    :items="visibleItems"
                    :sort="sort"
                    :acting="store.acting"
                    :account-name="accountName"
                    :can-write="canWrite"
                    @edit="editTarget = $event"
                    @delete="deleteTarget = $event"
                    @sort="emit('sort', $event)"
                />
            </div>

            <div v-if="store.hasMore" class="su-more">
                <button type="button" class="su-btn su-btn--ghost" :disabled="store.loadingMore" @click="store.loadMore()">
                    {{ t('paymentMethodsPage.loadMore') }}
                </button>
            </div>
        </div>

        <PaymentMethodFormModal v-model="createOpen" :default-account-public-id="filterAccountId" />
        <PaymentMethodFormModal v-model="editOpen" :method="editTarget" />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('paymentMethodsPage.deleteModal.title')"
            :message="t('paymentMethodsPage.deleteModal.body')"
            :confirm-label="t('paymentMethodsPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.wallet-panel {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.wallet-panel__scroll {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.wallet-directory {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 4px 16px 10px;
}

.wallet-directory__list {
    display: flex;
    flex-direction: column;
}

.wallet-directory__table {
    display: none;
}

@media (min-width: 768px) {
    .wallet-directory__list {
        display: none;
    }

    .wallet-directory__table {
        display: flex;
        flex: 1 1 auto;
        min-height: 0;
        flex-direction: column;
    }
}

@media (max-width: 767px) {
    .wallet-panel__scroll {
        display: block;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
    }

    .wallet-directory {
        display: block;
        padding: 0 4px 4px;
    }
}
</style>
