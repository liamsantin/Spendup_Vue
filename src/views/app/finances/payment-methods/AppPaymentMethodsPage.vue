<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { CreditCardIcon, PlusIcon } from 'vue-tabler-icons';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { PaymentMethodsWallet, canWritePaymentMethods, usePaymentMethodsStore } from '@/features/payment-methods';
import { useAccountsStore } from '@/features/accounts';

const { t } = useI18n();
const store = usePaymentMethodsStore();
const accountsStore = useAccountsStore();
const walletRef = ref<{ openCreate: () => void } | null>(null);
const showInactive = ref(true);

const canCreate = computed(() => accountsStore.accounts.some((a) => canWritePaymentMethods(a)));

function onCreate() {
    walletRef.value?.openCreate();
}
</script>

<template>
    <AppPageShell :title="t('paymentMethodsPage.title')" :subtitle="t('paymentMethodsPage.subtitle')" :icon="CreditCardIcon">
        <template #actions>
            <AppDropdownFilter :label="t('paymentMethodsPage.actions.filter')">
                <v-list-item>
                    <AppSwitch v-model="showInactive" :inset="false" :label="t('paymentMethodsPage.filters.showInactive')" />
                </v-list-item>
            </AppDropdownFilter>
            <v-btn v-if="canCreate" color="primary" :disabled="store.acting" @click="onCreate">
                <PlusIcon size="18" class="mr-1" />
                {{ t('paymentMethodsPage.actions.create') }}
            </v-btn>
        </template>

        <PaymentMethodsWallet ref="walletRef" :show-inactive="showInactive" />
    </AppPageShell>
</template>
