<script setup lang="ts">
/**
 * Champs du formulaire moyen de paiement. `form` est détenu par le parent.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'PaymentMethodForm' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
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
        accountDisabled?: boolean;
    }>(),
    {
        fieldErrors: () => ({}),
        accountDisabled: false
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
        <!-- Actif : libellé 700 à gauche, interrupteur rond à droite -->
        <div class="payment-method-form__switch">
            <label class="payment-method-form__switch-title" for="pm-form-active">
                {{ t('paymentMethodsPage.form.fields.isActive') }}
            </label>
            <AppSwitch id="pm-form-active" v-model="form.isActive" />
        </div>

        <div class="payment-method-form__row">
            <label class="payment-method-form__label" for="pm-form-account">
                {{ t('paymentMethodsPage.form.fields.account') }} <span class="payment-method-form__required" aria-hidden="true">*</span>
            </label>
            <div class="payment-method-form__field">
                <AppSelect
                    id="pm-form-account"
                    v-model="form.accountPublicId"
                    :items="accountItems"
                    :disabled="isEdit || accountDisabled"
                    :label="t('paymentMethodsPage.form.fields.account')"
                    hide-details="auto"
                    :error="!!fieldErrors.accountPublicId"
                    :error-messages="fieldErrors.accountPublicId || undefined"
                />
            </div>
        </div>

        <div class="payment-method-form__row">
            <label class="payment-method-form__label" for="pm-form-type">
                {{ t('paymentMethodsPage.form.fields.type') }} <span class="payment-method-form__required" aria-hidden="true">*</span>
            </label>
            <div class="payment-method-form__field">
                <AppSelect
                    id="pm-form-type"
                    v-model="form.type"
                    :items="typeItems"
                    :label="t('paymentMethodsPage.form.fields.type')"
                    hide-details="auto"
                    :error="!!fieldErrors.type"
                    :error-messages="fieldErrors.type || undefined"
                />
            </div>
        </div>

        <div class="payment-method-form__row">
            <label class="payment-method-form__label" for="pm-form-label">
                {{ t('paymentMethodsPage.form.fields.label') }} <span class="payment-method-form__required" aria-hidden="true">*</span>
            </label>
            <div class="payment-method-form__field">
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
            </div>
        </div>

        <div class="payment-method-form__row">
            <label class="payment-method-form__label" for="pm-form-reference">{{ t('paymentMethodsPage.form.fields.reference') }}</label>
            <div class="payment-method-form__field">
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
            </div>
        </div>

        <div class="payment-method-form__row">
            <label class="payment-method-form__label" for="pm-form-last4">{{ t('paymentMethodsPage.form.fields.lastFourDigits') }}</label>
            <div class="payment-method-form__field">
                <v-text-field
                    id="pm-form-last4"
                    :model-value="form.lastFourDigits"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    maxlength="4"
                    inputmode="numeric"
                    autocomplete="off"
                    class="payment-method-form__mono"
                    :placeholder="t('paymentMethodsPage.form.lastFourPlaceholder')"
                    :error="!!fieldErrors.lastFourDigits"
                    :error-messages="fieldErrors.lastFourDigits || undefined"
                    @update:model-value="onLastFourInput"
                />
            </div>
        </div>

        <div class="payment-method-form__row">
            <span class="payment-method-form__label">{{ t('paymentMethodsPage.form.fields.expirationDate') }}</span>
            <div class="payment-method-form__field">
                <AppDatePicker
                    v-model="expirationModel"
                    color="primary"
                    hide-details="auto"
                    :min="minExpiration"
                    :placeholder="t('paymentMethodsPage.form.expirationPlaceholder')"
                />
                <p v-if="fieldErrors.expirationDate" class="payment-method-form__error">{{ fieldErrors.expirationDate }}</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Lignes libellé (170 px, étoile bleue) | champ carré ; libellé au-dessus sur mobile. */
.payment-method-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.payment-method-form__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    gap: 8px 16px;
    align-items: center;
}

.payment-method-form__label {
    font-size: 14px;
    color: var(--ink);
    line-height: 1.3;
}

.payment-method-form__required {
    color: var(--blue-ink);
}

.payment-method-form__field {
    min-width: 0;
}

.payment-method-form__mono :deep(input) {
    font-family: var(--font-mono);
    letter-spacing: 0.02em;
}

.payment-method-form__switch {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--line);
}

.payment-method-form__switch-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--ink);
}

.payment-method-form__error {
    margin: 6px 0 0;
    color: var(--danger);
    font-size: 12.5px;
}

@media (max-width: 599.98px) {
    .payment-method-form__row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }
}
</style>
