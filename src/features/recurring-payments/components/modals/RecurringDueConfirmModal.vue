<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import PaymentMethodFormModal from '@/features/payment-methods/components/modals/PaymentMethodFormModal.vue';
import { canWritePaymentMethods } from '@/features/payment-methods/rights';
import { usePaymentMethodsStore } from '@/features/payment-methods/stores/payment-methods-store';
import type { PaymentMethod } from '@/features/payment-methods/types';
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
const accountsStore = useAccountsStore();
const paymentMethodsStore = usePaymentMethodsStore();
const paymentMethodCreateOpen = ref(false);
const paymentMethodCreateLabel = ref('');

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

const canCreatePaymentMethod = computed(() => {
    const account = accountsStore.accounts.find((item) => item.publicId === props.accountPublicId);
    return !!account && canWritePaymentMethods(account);
});

const paymentDateModel = computed({
    get: () => form.paymentDate || null,
    set: (value: string | null) => {
        form.paymentDate = value ?? '';
    }
});

function onPaymentMethodCreated(method: PaymentMethod) {
    if (method.accountPublicId !== props.accountPublicId) return;
    form.paymentMethodPublicId = method.publicId;
}

function openPaymentMethodCreate(name: string) {
    paymentMethodCreateLabel.value = name;
    paymentMethodCreateOpen.value = true;
}

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

        <div class="due-form">
            <div class="due-form__row">
                <label class="due-form__label" for="due-confirm-date">{{ t('recurrencesPage.confirm.fields.paymentDate') }}</label>
                <div class="due-form__field">
                    <AppDatePicker
                        id="due-confirm-date"
                        v-model="paymentDateModel"
                        :label="t('recurrencesPage.confirm.fields.paymentDate')"
                        :max="todayLocalYmd()"
                        color="primary"
                        hide-details
                        :clearable="false"
                    />
                    <p v-if="fieldErrors.paymentDate" class="due-form__error">{{ fieldErrors.paymentDate }}</p>
                </div>
            </div>
            <div class="due-form__row">
                <label class="due-form__label" for="due-confirm-amount">{{ t('recurrencesPage.confirm.fields.amount') }}</label>
                <div class="due-form__field">
                    <v-text-field
                        id="due-confirm-amount"
                        :model-value="form.amount"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        inputmode="decimal"
                        :error="!!fieldErrors.amount"
                        :error-messages="fieldErrors.amount || undefined"
                        @update:model-value="onAmountInput"
                    />
                </div>
            </div>
            <div class="due-form__row">
                <label class="due-form__label">{{ t('recurrencesPage.confirm.fields.paymentMethod') }}</label>
                <div class="due-form__field">
                    <AppSelect
                        v-model="form.paymentMethodPublicId"
                        searchable
                        :label="t('recurrencesPage.confirm.fields.paymentMethod')"
                        :items="paymentMethodItems"
                        hide-details="auto"
                        :search-placeholder="t('transactionsPage.form.paymentMethodSearchPlaceholder')"
                        :no-results-label="t('transactionsPage.form.paymentMethodNoResults')"
                        :create-label="canCreatePaymentMethod ? t('recurrencesPage.form.createPaymentMethod') : undefined"
                        :create-named-label="
                            canCreatePaymentMethod ? t('transactionsPage.form.paymentMethodCreate', { name: '{name}' }) : undefined
                        "
                        @create="openPaymentMethodCreate"
                    />
                </div>
            </div>
            <div class="due-form__row due-form__row--top">
                <label class="due-form__label" for="due-confirm-notes">{{ t('recurrencesPage.form.fields.notes') }}</label>
                <div class="due-form__field">
                    <v-textarea
                        id="due-confirm-notes"
                        v-model="form.notes"
                        color="primary"
                        variant="outlined"
                        density="comfortable"
                        hide-details="auto"
                        rows="3"
                        :maxlength="RECURRING_NOTES_MAX"
                        :error="!!fieldErrors.notes"
                        :error-messages="fieldErrors.notes || undefined"
                    />
                </div>
            </div>
        </div>

        <template #footer="{ close }">
            <button type="button" class="su-btn" :disabled="store.acting" @click="close">{{ t('common.cancel') }}</button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="onConfirm">
                {{ t('recurrencesPage.actions.confirmDue') }}
            </button>
        </template>
    </AppModalBase>

    <PaymentMethodFormModal
        v-model="paymentMethodCreateOpen"
        :default-account-public-id="accountPublicId"
        :default-label="paymentMethodCreateLabel"
        lock-account
        @saved="onPaymentMethodCreated"
    />
</template>

<style scoped>
/* libellé à gauche sur 170 px | champ carré (maquette 04) */
.due-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.due-form__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    align-items: center;
    gap: 8px 16px;
}

.due-form__row--top {
    align-items: start;
}

.due-form__row--top .due-form__label {
    padding-top: 12px;
}

.due-form__label {
    color: var(--ink);
    font-size: 14px;
    line-height: 1.3;
}

.due-form__field {
    min-width: 0;
}

.due-form__error {
    margin: 4px 0 0;
    color: var(--danger);
    font-size: 13px;
}

@media (max-width: 599.98px) {
    .due-form__row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }

    .due-form__row--top .due-form__label {
        padding-top: 0;
    }
}
</style>
