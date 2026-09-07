<script setup lang="ts">
/**
 * Champs du formulaire transaction. `form` est détenu par le parent.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'TransactionForm' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { todayUtcYmd } from '@/features/transactions/format';
import { TRANSACTION_LABEL_MAX, type TransactionType } from '@/features/transactions/types';
import type { TransactionFormFields } from '@/features/transactions/payload';

export type TransactionFormFieldErrors = {
    type?: string | null;
    accountPublicId?: string | null;
    counterpartyAccountPublicId?: string | null;
    label?: string | null;
    amount?: string | null;
    operationDate?: string | null;
    valueDate?: string | null;
    paymentMethodPublicId?: string | null;
};

const props = withDefaults(
    defineProps<{
        form: TransactionFormFields;
        isEdit: boolean;
        accountItems: { title: string; value: string }[];
        counterpartyItems: { title: string; value: string }[];
        typeItems: { title: string; value: TransactionType }[];
        paymentMethodItems: { title: string; value: string }[];
        fieldErrors?: TransactionFormFieldErrors;
        archivedHint?: string | null;
    }>(),
    {
        fieldErrors: () => ({}),
        archivedHint: null
    }
);

const { t } = useI18n();

const isTransfer = computed(() => props.form.type === 'transfert');
const todayUtc = computed(() => todayUtcYmd());

const operationDateModel = computed({
    get: () => props.form.operationDate || null,
    set: (value: string | null) => {
        props.form.operationDate = value ?? '';
    }
});

const valueDateModel = computed({
    get: () => props.form.valueDate,
    set: (value: string | null) => {
        props.form.valueDate = value;
    }
});

function onAmountInput(value: string) {
    props.form.amount = value.replace(/[^\d.,]/g, '');
}
</script>

<template>
    <div class="transaction-form">
        <p v-if="archivedHint" class="text-caption text-warning mb-2">{{ archivedHint }}</p>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="tx-form-type"> {{ t('transactionsPage.form.fields.type') }} * </label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppSelect
                    id="tx-form-type"
                    v-model="form.type"
                    :items="typeItems"
                    :disabled="isEdit"
                    :label="t('transactionsPage.form.fields.type')"
                    hide-details="auto"
                    :error="!!fieldErrors.type"
                    :error-messages="fieldErrors.type || undefined"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="tx-form-account">
                    {{ isTransfer ? t('transactionsPage.form.fields.sourceAccount') : t('transactionsPage.form.fields.account') }} *
                </label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppSelect
                    id="tx-form-account"
                    v-model="form.accountPublicId"
                    :items="accountItems"
                    :disabled="isEdit"
                    :label="t('transactionsPage.form.fields.account')"
                    hide-details="auto"
                    :error="!!fieldErrors.accountPublicId"
                    :error-messages="fieldErrors.accountPublicId || undefined"
                />
            </v-col>
        </v-row>
        <v-row v-if="isTransfer" class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="tx-form-counterparty">
                    {{ t('transactionsPage.form.fields.counterpartyAccount') }} *
                </label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppSelect
                    id="tx-form-counterparty"
                    v-model="form.counterpartyAccountPublicId"
                    :items="counterpartyItems"
                    :disabled="isEdit"
                    :label="t('transactionsPage.form.fields.counterpartyAccount')"
                    hide-details="auto"
                    :error="!!fieldErrors.counterpartyAccountPublicId"
                    :error-messages="fieldErrors.counterpartyAccountPublicId || undefined"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="tx-form-label"> {{ t('transactionsPage.form.fields.label') }} * </label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    id="tx-form-label"
                    v-model="form.label"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :maxlength="TRANSACTION_LABEL_MAX"
                    :error="!!fieldErrors.label"
                    :error-messages="fieldErrors.label || undefined"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="tx-form-amount"> {{ t('transactionsPage.form.fields.amount') }} * </label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    id="tx-form-amount"
                    :model-value="form.amount"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    inputmode="decimal"
                    autocomplete="off"
                    :placeholder="t('transactionsPage.form.amountPlaceholder')"
                    :error="!!fieldErrors.amount"
                    :error-messages="fieldErrors.amount || undefined"
                    @update:model-value="onAmountInput"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium">{{ t('transactionsPage.form.fields.operationDate') }} *</label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppDatePicker
                    v-model="operationDateModel"
                    color="primary"
                    hide-details="auto"
                    :max="todayUtc"
                    :placeholder="t('transactionsPage.form.operationDatePlaceholder')"
                />
                <div v-if="fieldErrors.operationDate" class="text-caption text-error mt-1">{{ fieldErrors.operationDate }}</div>
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium">{{ t('transactionsPage.form.fields.valueDate') }}</label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppDatePicker
                    v-model="valueDateModel"
                    color="primary"
                    hide-details="auto"
                    :min="form.operationDate || undefined"
                    :placeholder="t('transactionsPage.form.valueDatePlaceholder')"
                />
                <div v-if="fieldErrors.valueDate" class="text-caption text-error mt-1">{{ fieldErrors.valueDate }}</div>
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="tx-form-payment-method">
                    {{ t('transactionsPage.form.fields.paymentMethod') }}
                </label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppSelect
                    id="tx-form-payment-method"
                    v-model="form.paymentMethodPublicId"
                    :items="paymentMethodItems"
                    :label="t('transactionsPage.form.fields.paymentMethod')"
                    hide-details="auto"
                    :error="!!fieldErrors.paymentMethodPublicId"
                    :error-messages="fieldErrors.paymentMethodPublicId || undefined"
                />
            </v-col>
        </v-row>
    </div>
</template>

<style scoped>
.transaction-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

@media (max-width: 599.98px) {
    .transaction-form {
        gap: 12px;
    }

    .transaction-form :deep(.v-label) {
        margin-bottom: 4px;
    }
}
</style>
