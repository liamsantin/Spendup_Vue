<script setup lang="ts">
/**
 * Champs du formulaire moyen de paiement. `form` est détenu par le parent.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'PaymentMethodForm' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { todayUtcYmd } from '@/features/payment-methods/format';
import { PAYMENT_METHOD_LABEL_MAX, PAYMENT_METHOD_REFERENCE_MAX, type PaymentMethodType } from '@/features/payment-methods/types';
import type { PaymentMethodFormFields } from '@/features/payment-methods/payload';

export type PaymentMethodFormFieldErrors = {
    accountPublicId?: string | null;
    type?: string | null;
    label?: string | null;
    reference?: string | null;
    lastFourDigits?: string | null;
    expirationDate?: string | null;
    isActive?: string | null;
};

const props = withDefaults(
    defineProps<{
        form: PaymentMethodFormFields;
        isEdit: boolean;
        accountItems: { title: string; value: string }[];
        typeItems: { title: string; value: PaymentMethodType }[];
        fieldErrors?: PaymentMethodFormFieldErrors;
    }>(),
    {
        fieldErrors: () => ({})
    }
);

const { t } = useI18n();

const minExpiration = computed(() => (props.form.isActive ? todayUtcYmd() : undefined));

const expirationModel = computed({
    get: () => props.form.expirationDate,
    set: (value: string | null) => {
        props.form.expirationDate = value;
    }
});

function onLastFourInput(value: string) {
    props.form.lastFourDigits = value.replace(/\D/g, '').slice(0, 4);
}
</script>

<template>
    <div class="payment-method-form">
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="pm-form-account">
                    {{ t('paymentMethodsPage.form.fields.account') }} *
                </label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-select
                    id="pm-form-account"
                    v-model="form.accountPublicId"
                    :items="accountItems"
                    :disabled="isEdit"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error="!!fieldErrors.accountPublicId"
                    :error-messages="fieldErrors.accountPublicId || undefined"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="pm-form-type"> {{ t('paymentMethodsPage.form.fields.type') }} * </label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-select
                    id="pm-form-type"
                    v-model="form.type"
                    :items="typeItems"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error="!!fieldErrors.type"
                    :error-messages="fieldErrors.type || undefined"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="pm-form-label"> {{ t('paymentMethodsPage.form.fields.label') }} * </label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    id="pm-form-label"
                    v-model="form.label"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :maxlength="PAYMENT_METHOD_LABEL_MAX"
                    :error="!!fieldErrors.label"
                    :error-messages="fieldErrors.label || undefined"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="pm-form-reference">
                    {{ t('paymentMethodsPage.form.fields.reference') }}
                </label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    id="pm-form-reference"
                    v-model="form.reference"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :maxlength="PAYMENT_METHOD_REFERENCE_MAX"
                    :placeholder="t('paymentMethodsPage.form.referencePlaceholder')"
                    :error="!!fieldErrors.reference"
                    :error-messages="fieldErrors.reference || undefined"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="pm-form-last4">
                    {{ t('paymentMethodsPage.form.fields.lastFourDigits') }}
                </label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    id="pm-form-last4"
                    :model-value="form.lastFourDigits"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    maxlength="4"
                    inputmode="numeric"
                    autocomplete="off"
                    :placeholder="t('paymentMethodsPage.form.lastFourPlaceholder')"
                    :error="!!fieldErrors.lastFourDigits"
                    :error-messages="fieldErrors.lastFourDigits || undefined"
                    @update:model-value="onLastFourInput"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium">{{ t('paymentMethodsPage.form.fields.expirationDate') }}</label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppDatePicker
                    v-model="expirationModel"
                    color="primary"
                    hide-details="auto"
                    :min="minExpiration"
                    :placeholder="t('paymentMethodsPage.form.expirationPlaceholder')"
                />
                <div v-if="fieldErrors.expirationDate" class="text-caption text-error mt-1">{{ fieldErrors.expirationDate }}</div>
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="auto" sm="3" class="pr-3">
                <label class="v-label font-weight-medium" for="pm-form-active">
                    {{ t('paymentMethodsPage.form.fields.isActive') }}
                </label>
            </v-col>
            <v-col cols="auto" sm="9">
                <AppSwitch id="pm-form-active" v-model="form.isActive" :inset="false" />
            </v-col>
        </v-row>
    </div>
</template>
