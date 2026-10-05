<script setup lang="ts">
/** Suggestions détectées dans l’historique d’un compte (éditeur), avec relance de la détection. */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { RefreshIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import RecurringSuggestionsPanel from '@/features/recurring-payments/components/RecurringSuggestionsPanel.vue';
import { canWriteRecurringOnAccount } from '@/features/recurring-payments/rights';
import { useRecurringSuggestionsStore } from '@/features/recurring-payments/stores/recurring-suggestions-store';

const props = defineProps<{
    modelValue: boolean;
    /** Compte pré-sélectionné (filtre de la page), s’il est éditable. */
    accountPublicId?: string | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
}>();

const { t } = useI18n();
const store = useRecurringSuggestionsStore();
const accountsStore = useAccountsStore();

const selectedAccountId = ref('');
const scanError = ref<string | null>(null);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

/** Suggestions personnelles : seulement les comptes où l’utilisateur peut créer une récurrence. */
const writableAccounts = computed(() => accountsStore.accounts.filter((account) => canWriteRecurringOnAccount(account)));
const accountItems = computed(() => writableAccounts.value.map((account) => ({ title: account.name, value: account.publicId })));

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        scanError.value = null;
        const preferred = writableAccounts.value.find((account) => account.publicId === props.accountPublicId);
        selectedAccountId.value = preferred?.publicId ?? writableAccounts.value[0]?.publicId ?? '';
    },
    { immediate: true }
);

async function onScan() {
    if (!selectedAccountId.value || store.scanning) return;
    scanError.value = null;
    try {
        await store.scan(selectedAccountId.value);
    } catch (e: unknown) {
        scanError.value = getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t('recurrencesPage.suggestions.title')"
        :subtitle="t('recurrencesPage.suggestions.subtitle')"
        :max-width="640"
    >
        <AppAlert v-if="scanError" type="error" class="mb-4" closable @dismiss="scanError = null">{{ scanError }}</AppAlert>
        <div class="recurring-suggestions-modal__bar">
            <AppSelect
                v-model="selectedAccountId"
                :items="accountItems"
                :label="t('recurrencesPage.suggestions.account')"
                :disabled="!accountItems.length"
                hide-details
                class="recurring-suggestions-modal__account"
            />
            <button type="button" class="su-btn" :disabled="!selectedAccountId || store.scanning" @click="onScan">
                <RefreshIcon :size="16" stroke-width="1.6" />
                {{ store.scanning ? t('recurrencesPage.suggestions.scanning') : t('recurrencesPage.suggestions.scan') }}
            </button>
        </div>
        <RecurringSuggestionsPanel v-if="open" :account-public-id="selectedAccountId || null" />

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" @click="close">{{ t('common.close') }}</button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.recurring-suggestions-modal__bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
}

.recurring-suggestions-modal__account {
    flex: 1;
    min-width: 0;
}

@media (max-width: 767px) {
    .recurring-suggestions-modal__bar {
        flex-direction: column;
        align-items: stretch;
    }
}
</style>
