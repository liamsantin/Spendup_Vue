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
import type { PaymentMethod } from '@/features/payment-methods/types';
import PaymentMethodListItem from '@/features/payment-methods/components/list/PaymentMethodListItem.vue';
import PaymentMethodFormModal from '@/features/payment-methods/components/modals/PaymentMethodFormModal.vue';

const props = withDefaults(
    defineProps<{
        showInactive?: boolean;
    }>(),
    { showInactive: true }
);

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

const visibleItems = computed(() => {
    const list = props.showInactive ? store.items : store.items.filter((item) => item.isActive);
    const accountId = filterAccountId.value;
    return accountId ? list.filter((item) => item.accountPublicId === accountId) : list;
});

const groups = computed(() => {
    const order: string[] = [];
    const map = new Map<string, PaymentMethod[]>();
    for (const item of visibleItems.value) {
        if (!map.has(item.accountPublicId)) {
            map.set(item.accountPublicId, []);
            order.push(item.accountPublicId);
        }
        map.get(item.accountPublicId)!.push(item);
    }
    return order.map((id) => ({
        accountPublicId: id,
        accountName: accountsStore.accounts.find((a) => a.publicId === id)?.name ?? t('paymentMethodsPage.unknownAccount'),
        canWrite: (() => {
            const account = accountsStore.accounts.find((a) => a.publicId === id);
            return account ? canWritePaymentMethods(account) : false;
        })(),
        items: map.get(id)!
    }));
});

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

defineExpose({ openCreate });

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
    <div>
        <AppAlert
            v-if="localError || store.error"
            color="error"
            variant="tonal"
            density="default"
            class="mb-4"
            closable
            @dismiss="
                localError = null;
                store.clearError();
            "
        >
            {{ localError || store.error }}
        </AppAlert>

        <div v-if="store.loading && !store.items.length" class="py-8 text-center">
            <v-progress-circular indeterminate color="primary" size="32" />
        </div>
        <div v-else-if="!visibleItems.length" class="py-8 text-center text-medium-emphasis">
            {{ t('paymentMethodsPage.empty.wallet') }}
        </div>
        <div v-else>
            <section v-for="group in groups" :key="group.accountPublicId" class="mb-6">
                <h5 class="text-subtitle-1 font-weight-bold mb-2">{{ group.accountName }}</h5>
                <v-list class="py-0">
                    <PaymentMethodListItem
                        v-for="method in group.items"
                        :key="method.publicId"
                        :method="method"
                        :can-write="group.canWrite"
                        :acting="store.acting"
                        @edit="editTarget = $event"
                        @delete="deleteTarget = $event"
                    />
                </v-list>
            </section>
        </div>

        <div v-if="store.hasMore" class="text-center mt-2">
            <v-btn variant="text" :loading="store.loadingMore" @click="store.loadMore()">
                {{ t('paymentMethodsPage.loadMore') }}
            </v-btn>
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
