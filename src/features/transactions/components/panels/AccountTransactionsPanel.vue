<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { PlusIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import type { Account } from '@/features/accounts/types';
import { canWriteTransaction, canWriteTransactions } from '@/features/transactions/rights';
import { useTransactionsStore } from '@/features/transactions/stores/transactions-store';
import type { Transaction } from '@/features/transactions/types';
import TransactionListItem from '@/features/transactions/components/list/TransactionListItem.vue';
import TransactionFormModal from '@/features/transactions/components/modals/TransactionFormModal.vue';

const props = defineProps<{
    account: Account;
}>();

const { t } = useI18n();
const accountsStore = useAccountsStore();
const store = useTransactionsStore();

const canWrite = computed(() => canWriteTransactions(props.account));
const createOpen = ref(false);
const editTarget = ref<Transaction | null>(null);
const deleteTarget = ref<Transaction | null>(null);
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

const items = computed(() => store.items);

watch(
    () => props.account.publicId,
    (id) => {
        localError.value = null;
        void store.loadList({ accountPublicId: id }).catch((e: unknown) => {
            const err = AppError.fromUnknown(e);
            localError.value = err.status === 404 ? t('transactionsPage.errors.notFound') : getErrorMessage(e);
        });
    },
    { immediate: true }
);

function canWriteItem(transaction: Transaction): boolean {
    return canWriteTransaction(transaction, accountsStore.accounts);
}

async function confirmDelete() {
    if (!deleteTarget.value) return;
    localError.value = null;
    try {
        await store.deleteTransaction(deleteTarget.value.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('transactionsPage.errors.notFound') : getErrorMessage(e);
        if (err.status === 404) {
            deleteTarget.value = null;
        }
    }
}
</script>

<template>
    <div class="account-transactions-panel d-flex flex-column h-100">
        <div class="d-flex align-center justify-space-between ga-3 flex-wrap mb-4 px-2">
            <div class="min-width-0">
                <h5 class="text-h6 mb-0">{{ t('transactionsPage.detail.title') }}</h5>
                <div class="text-body-2 text-medium-emphasis">{{ t('transactionsPage.detail.subtitle') }}</div>
            </div>
            <button v-if="canWrite" type="button" class="su-btn su-btn--ink" @click="createOpen = true">
                <PlusIcon size="16" stroke-width="1.6" />
                {{ t('transactionsPage.actions.create') }}
            </button>
        </div>

        <AppAlert
            v-if="localError || store.error"
            type="error"
            class="mb-3"
            closable
            @dismiss="
                localError = null;
                store.clearError();
            "
        >
            {{ localError || store.error }}
        </AppAlert>

        <div v-if="store.loading && !items.length" class="py-8 text-center">
            <span class="su-spin" />
        </div>
        <div v-else-if="!items.length" class="py-8 text-center text-medium-emphasis">
            {{ t('transactionsPage.empty.account') }}
        </div>
        <v-list v-else class="py-0 account-transactions-panel__list">
            <TransactionListItem
                v-for="transaction in items"
                :key="transaction.publicId"
                :transaction="transaction"
                :can-write="canWriteItem(transaction)"
                :acting="store.acting"
                :statement-account-public-id="account.publicId"
                @edit="editTarget = $event"
                @delete="deleteTarget = $event"
            />
        </v-list>

        <div v-if="store.hasMore && store.activeQuery.accountPublicId === account.publicId" class="text-center mt-3">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.loadingMore" @click="store.loadMore()">
                {{ t('transactionsPage.loadMore') }}
            </button>
        </div>

        <TransactionFormModal v-model="createOpen" :default-account-public-id="account.publicId" />
        <TransactionFormModal v-model="editOpen" :transaction="editTarget" />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('transactionsPage.deleteModal.title')"
            :message="t('transactionsPage.deleteModal.body')"
            :confirm-label="t('transactionsPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.account-transactions-panel__list {
    overflow: visible !important;
    background: transparent;
    padding: 8px;
}
</style>
