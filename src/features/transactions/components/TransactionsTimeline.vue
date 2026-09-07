<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { canWriteTransaction, canWriteTransactions } from '@/features/transactions/rights';
import { formatOperationDate } from '@/features/transactions/format';
import { useTransactionsStore } from '@/features/transactions/stores/transactions-store';
import type { Transaction } from '@/features/transactions/types';
import TransactionListItem from '@/features/transactions/components/list/TransactionListItem.vue';
import TransactionFormModal from '@/features/transactions/components/modals/TransactionFormModal.vue';

const props = defineProps<{
    /** Si défini, force le filtre compte (fiche compte) et ignore la query. */
    lockedAccountPublicId?: string | null;
}>();

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const accountsStore = useAccountsStore();
const store = useTransactionsStore();

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

function queryString(name: string): string | null {
    const raw = route.query[name];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

const filterAccountId = computed(() => props.lockedAccountPublicId?.trim() || queryString('account'));
const filterFrom = computed(() => (props.lockedAccountPublicId ? null : queryString('from')));
const filterTo = computed(() => (props.lockedAccountPublicId ? null : queryString('to')));

const canCreate = computed(() => {
    if (filterAccountId.value) {
        const account = accountsStore.accounts.find((a) => a.publicId === filterAccountId.value);
        return !!account && canWriteTransactions(account);
    }
    return accountsStore.accounts.some((a) => canWriteTransactions(a));
});

const dateGroups = computed(() => {
    const order: string[] = [];
    const map = new Map<string, Transaction[]>();
    for (const item of store.items) {
        const key = item.operationDate;
        if (!map.has(key)) {
            map.set(key, []);
            order.push(key);
        }
        map.get(key)!.push(item);
    }
    return order.map((date) => ({
        date,
        label: formatOperationDate(date, locale.value),
        items: map.get(date)!
    }));
});

function canWriteItem(transaction: Transaction): boolean {
    return canWriteTransaction(transaction, accountsStore.accounts);
}

async function loadTimeline(force = false) {
    localError.value = null;
    try {
        await accountsStore.loadAccounts(force);
        await store.loadList({
            accountPublicId: filterAccountId.value ?? undefined,
            from: filterFrom.value ?? undefined,
            to: filterTo.value ?? undefined,
            force
        });
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.value = t('transactionsPage.errors.notFound');
            if (!props.lockedAccountPublicId && filterAccountId.value) {
                await store
                    .loadList({ from: filterFrom.value ?? undefined, to: filterTo.value ?? undefined, force: true })
                    .catch(() => undefined);
                await router.replace({
                    path: '/app/finances/transactions',
                    query: {
                        ...(filterFrom.value ? { from: filterFrom.value } : {}),
                        ...(filterTo.value ? { to: filterTo.value } : {})
                    }
                });
            }
            return;
        }
        localError.value = getErrorMessage(e);
    }
}

function onVisibilityChange() {
    if (document.visibilityState !== 'visible' || !store.initialized) return;
    void loadTimeline(true).catch(() => undefined);
}

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void loadTimeline().catch(() => undefined);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
});

function openCreate() {
    if (!canCreate.value) return;
    createOpen.value = true;
}

defineExpose({ openCreate });

watch(
    () => [filterAccountId.value, filterFrom.value, filterTo.value] as const,
    () => {
        void loadTimeline().catch(() => undefined);
    }
);

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
            void loadTimeline(true).catch(() => undefined);
        }
    }
}
</script>

<template>
    <div>
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

        <div v-if="store.loading && !store.items.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <div v-else-if="!store.items.length" class="su-empty">
            {{ filterAccountId ? t('transactionsPage.empty.account') : t('transactionsPage.empty.timeline') }}
        </div>
        <div v-else class="su-stack">
            <section v-for="group in dateGroups" :key="group.date" class="su-surface">
                <header class="su-panel__head">
                    <div>
                        <h2>{{ group.label }}</h2>
                    </div>
                </header>
                <v-list class="py-0">
                    <TransactionListItem
                        v-for="transaction in group.items"
                        :key="transaction.publicId"
                        :transaction="transaction"
                        :can-write="canWriteItem(transaction)"
                        :acting="store.acting"
                        :statement-account-public-id="filterAccountId"
                        @edit="editTarget = $event"
                        @delete="deleteTarget = $event"
                    />
                </v-list>
            </section>
        </div>

        <div v-if="store.hasMore" class="su-more">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.loadingMore" @click="store.loadMore()">
                {{ t('transactionsPage.loadMore') }}
            </button>
        </div>

        <TransactionFormModal v-model="createOpen" :default-account-public-id="filterAccountId" />
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
