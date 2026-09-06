<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { canWritePaymentMethods } from '@/features/payment-methods/rights';
import { usePaymentMethodsStore } from '@/features/payment-methods/stores/payment-methods-store';
import {
    buildCreatePaymentMethodPayload,
    buildUpdatePaymentMethodPayload,
    type PaymentMethodFormFields,
    type PaymentMethodPayloadErrorCode
} from '@/features/payment-methods/payload';
import { PAYMENT_METHOD_TYPES, type PaymentMethod, type PaymentMethodType } from '@/features/payment-methods/types';
import PaymentMethodForm, { type PaymentMethodFormFieldErrors } from '@/features/payment-methods/components/forms/PaymentMethodForm.vue';

const props = defineProps<{
    modelValue: boolean;
    method?: PaymentMethod | null;
    /** Compte pré-sélectionné (fiche compte). */
    defaultAccountPublicId?: string | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [method: PaymentMethod];
}>();

const { t } = useI18n();
const accountsStore = useAccountsStore();
const store = usePaymentMethodsStore();

const isEdit = computed(() => !!props.method);

const writableAccounts = computed(() => accountsStore.accounts.filter((a) => canWritePaymentMethods(a)));

const accountItems = computed(() => writableAccounts.value.map((a) => ({ title: a.name, value: a.publicId })));

const typeItems = computed(() => PAYMENT_METHOD_TYPES.map((value) => ({ title: t(`paymentMethodsPage.types.${value}`), value })));

const localError = reactive({ message: null as string | null });
const fieldErrors = reactive<PaymentMethodFormFieldErrors>({});

const form = reactive<PaymentMethodFormFields>({
    accountPublicId: '',
    type: 'carte',
    label: '',
    reference: '',
    lastFourDigits: '',
    expirationDate: null,
    isActive: true
});

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

function clearFieldErrors() {
    fieldErrors.accountPublicId = null;
    fieldErrors.type = null;
    fieldErrors.label = null;
    fieldErrors.reference = null;
    fieldErrors.lastFourDigits = null;
    fieldErrors.expirationDate = null;
    fieldErrors.isActive = null;
}

function payloadErrorText(code: PaymentMethodPayloadErrorCode): string {
    return t(`paymentMethodsPage.form.errors.${code}`);
}

function applyPayloadErrors(code: PaymentMethodPayloadErrorCode, field?: string) {
    const message = payloadErrorText(code);
    if (field && field in fieldErrors) {
        (fieldErrors as Record<string, string | null>)[field] = message;
        return;
    }
    localError.message = message;
}

function resetForm() {
    localError.message = null;
    clearFieldErrors();
    if (props.method) {
        form.accountPublicId = props.method.accountPublicId;
        form.type = props.method.type;
        form.label = props.method.label;
        form.reference = props.method.reference ?? '';
        form.lastFourDigits = props.method.lastFourDigits ?? '';
        form.expirationDate = props.method.expirationDate;
        form.isActive = props.method.isActive;
        return;
    }
    form.accountPublicId = props.defaultAccountPublicId?.trim() || writableAccounts.value[0]?.publicId || '';
    form.type = 'carte' as PaymentMethodType;
    form.label = '';
    form.reference = '';
    form.lastFourDigits = '';
    form.expirationDate = null;
    form.isActive = true;
}

watch(
    () => props.modelValue,
    (value) => {
        if (value) resetForm();
    }
);

async function onSave() {
    localError.message = null;
    clearFieldErrors();
    const siblings = store.allKnownItems();
    const built = isEdit.value
        ? buildUpdatePaymentMethodPayload(form, siblings, props.method?.publicId)
        : buildCreatePaymentMethodPayload(form, siblings);
    if (!built.ok) {
        applyPayloadErrors(built.code, built.field);
        return;
    }
    try {
        const saved =
            isEdit.value && props.method
                ? await store.updatePaymentMethod(props.method.publicId, form)
                : await store.createPaymentMethod(form);
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.message = t('paymentMethodsPage.errors.notFound');
            return;
        }
        localError.message = getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="isEdit ? t('paymentMethodsPage.form.editTitle') : t('paymentMethodsPage.form.createTitle')"
        :subtitle="t('paymentMethodsPage.form.subtitle')"
        :max-width="640"
        :height="640"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <PaymentMethodForm
            :form="form"
            :is-edit="isEdit"
            :account-items="accountItems"
            :type-items="typeItems"
            :field-errors="fieldErrors"
        />

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalBase>
</template>
