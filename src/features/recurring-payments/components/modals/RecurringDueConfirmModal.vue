<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { usePaymentMethodsStore } from '@/features/payment-methods/stores/payment-methods-store';
import { buildConfirmDuePayload, type ConfirmDueFormFields, type RecurringPayloadErrorCode } from '@/features/recurring-payments/payload';
import { todayLocalYmd } from '@/features/recurring-payments/format';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import { RECURRING_NOTES_MAX, type RecurringDue, type RecurringKind } from '@/features/recurring-payments/types';

const props = defineProps<{
    modelValue: boolean;
    kind: RecurringKind;
    templatePublicId: string;
    accountPublicId: string;
    due: RecurringDue | null;
    defaultPaymentMethodPublicId?: string | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    confirmed: [due: RecurringDue];
}>();

const { t } = useI18n();
const store = useRecurringPaymentsStore();
const paymentMethodsStore = usePaymentMethodsStore();

const localError = reactive({ message: null as string | null });
const fieldErrors = reactive<{ paymentDate?: string | null; amount?: string | null; notes?: string | null }>({});
const form = reactive<ConfirmDueFormFields>({
    paymentDate: todayLocalYmd(),
    amount: '',
    paymentMethodPublicId: '',
    notes: ''
});

const open = computed({
    get: () => props.modelValue && !!props.due,
    set: (value: boolean) => emit('update:modelValue', value)
});

const paymentMethodItems = computed(() => [
    { title: t('recurrencesPage.form.noPaymentMethod'), value: '' },
    ...paymentMethodsStore.items
        .filter((item) => item.accountPublicId === props.accountPublicId && item.isActive)
        .map((item) => ({ title: item.label, value: item.publicId }))
]);

const paymentDateModel = computed({
    get: () => form.paymentDate || null,
    set: (value: string | null) => {
        form.paymentDate = value ?? '';
    }
});

function onAmountInput(value: string) {
    form.amount = value.replace(/[^\d.,]/g, '');
}

function payloadErrorText(code: RecurringPayloadErrorCode): string {
    return t(`recurrencesPage.form.errors.${code}`);
}

watch(
    () => props.modelValue,
    (value) => {
        if (!value || !props.due) return;
        localError.message = null;
        fieldErrors.paymentDate = null;
        fieldErrors.amount = null;
        fieldErrors.notes = null;
        form.paymentDate = todayLocalYmd();
        form.amount = String(props.due.plannedAmount);
        form.paymentMethodPublicId = props.defaultPaymentMethodPublicId ?? '';
        form.notes = props.due.notes ?? '';
        void paymentMethodsStore.loadList({ accountPublicId: props.accountPublicId });
    }
);

async function onConfirm() {
    if (!props.due) return;
    localError.message = null;
    fieldErrors.paymentDate = null;
    fieldErrors.amount = null;
    fieldErrors.notes = null;
    const built = buildConfirmDuePayload(form);
    if (!built.ok) {
        const message = payloadErrorText(built.code);
        if (built.field && built.field in fieldErrors) {
            (fieldErrors as Record<string, string | null>)[built.field] = message;
        } else {
            localError.message = message;
        }
        return;
    }
    try {
        const due = await store.confirmDue(props.kind, props.templatePublicId, props.due.publicId, form);
        emit('confirmed', due);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.message = err.status === 404 ? t('recurrencesPage.errors.notFound') : getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="kind === 'expense' ? t('recurrencesPage.confirm.expenseTitle') : t('recurrencesPage.confirm.incomeTitle')"
        :subtitle="t('recurrencesPage.confirm.subtitle')"
        :max-width="560"
        :height="520"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <div class="mb-2">
            <AppDatePicker
                v-model="paymentDateModel"
                :label="t('recurrencesPage.confirm.fields.paymentDate')"
                :max="todayLocalYmd()"
                color="primary"
                hide-details
                :clearable="false"
            />
            <div v-if="fieldErrors.paymentDate" class="text-caption text-error mt-1">{{ fieldErrors.paymentDate }}</div>
        </div>
        <v-text-field
            :model-value="form.amount"
            :label="t('recurrencesPage.confirm.fields.amount')"
            color="primary"
            variant="outlined"
            density="comfortable"
            class="mb-2"
            hide-details="auto"
            inputmode="decimal"
            :error="!!fieldErrors.amount"
            :error-messages="fieldErrors.amount || undefined"
            @update:model-value="onAmountInput"
        />
        <div class="mb-2">
            <AppSelect
                v-model="form.paymentMethodPublicId"
                :label="t('recurrencesPage.form.fields.paymentMethod')"
                :items="paymentMethodItems"
                hide-details="auto"
            />
        </div>
        <v-textarea
            v-model="form.notes"
            :label="t('recurrencesPage.form.fields.notes')"
            color="primary"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            rows="3"
            :maxlength="RECURRING_NOTES_MAX"
            :error="!!fieldErrors.notes"
            :error-messages="fieldErrors.notes || undefined"
        />

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="close">{{ t('common.cancel') }}</button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="onConfirm">
                {{ t('recurrencesPage.actions.confirmDue') }}
            </button>
        </template>
    </AppModalBase>
</template>
