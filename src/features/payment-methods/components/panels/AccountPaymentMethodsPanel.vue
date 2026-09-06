<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { PlusIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { canWritePaymentMethods } from '@/features/payment-methods/rights';
import { usePaymentMethodsStore } from '@/features/payment-methods/stores/payment-methods-store';
import type { PaymentMethod } from '@/features/payment-methods/types';
import type { Account } from '@/features/accounts/types';
import PaymentMethodListItem from '@/features/payment-methods/components/list/PaymentMethodListItem.vue';
import PaymentMethodFormModal from '@/features/payment-methods/components/modals/PaymentMethodFormModal.vue';

const props = defineProps<{
    account: Account;
}>();

const { t } = useI18n();
const accountsStore = useAccountsStore();
const store = usePaymentMethodsStore();

const canWrite = computed(() => canWritePaymentMethods(props.account));
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

const items = computed(() => store.items.filter((item) => item.accountPublicId === props.account.publicId));

watch(
    () => props.account.publicId,
    (id) => {
        localError.value = null;
        void store.loadList({ accountPublicId: id }).catch((e: unknown) => {
            const err = AppError.fromUnknown(e);
            localError.value = err.status === 404 ? t('paymentMethodsPage.errors.notFound') : getErrorMessage(e);
        });
    },
    { immediate: true }
);

async function confirmDelete() {
    if (!deleteTarget.value) return;
    localError.value = null;
    try {
        await store.deletePaymentMethod(deleteTarget.value.publicId, props.account.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('paymentMethodsPage.errors.notFound') : getErrorMessage(e);
        if (err.status === 404) {
            deleteTarget.value = null;
            void accountsStore.loadAccounts(true).catch(() => undefined);
        }
    }
}
</script>

<template>
    <div class="account-payment-methods-panel d-flex flex-column h-100">
        <div class="d-flex align-center justify-space-between ga-3 flex-wrap mb-4 px-1">
            <div class="min-width-0">
                <h5 class="text-h6 mb-0">{{ t('paymentMethodsPage.detail.title') }}</h5>
                <div class="text-body-2 text-medium-emphasis">{{ t('paymentMethodsPage.detail.subtitle') }}</div>
            </div>
            <button v-if="canWrite" type="button" class="su-btn su-btn--ink" @click="createOpen = true">
                <PlusIcon size="16" stroke-width="1.6" />
                {{ t('paymentMethodsPage.actions.create') }}
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
            {{ t('paymentMethodsPage.empty.account') }}
        </div>
        <v-list v-else class="py-0">
            <PaymentMethodListItem
                v-for="method in items"
                :key="method.publicId"
                :method="method"
                :can-write="canWrite"
                :acting="store.acting"
                @edit="editTarget = $event"
                @delete="deleteTarget = $event"
            />
        </v-list>

        <div v-if="store.hasMore && store.activeAccountPublicId === account.publicId" class="text-center mt-3">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.loadingMore" @click="store.loadMore()">
                {{ t('paymentMethodsPage.loadMore') }}
            </button>
        </div>

        <PaymentMethodFormModal v-model="createOpen" :default-account-public-id="account.publicId" />
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
