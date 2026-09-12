<script setup lang="ts">
/**
 * Champs du formulaire template récurrent. `form` est détenu par le parent.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'RecurringTemplateForm' });

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import CategoryFormModal from '@/features/categories/components/modals/CategoryFormModal.vue';
import type { Category, CategoryType } from '@/features/categories/types';
import PaymentMethodFormModal from '@/features/payment-methods/components/modals/PaymentMethodFormModal.vue';
import { canWritePaymentMethods } from '@/features/payment-methods/rights';
import type { PaymentMethod } from '@/features/payment-methods/types';
import type { RecurringTemplateFormFields } from '@/features/recurring-payments/payload';
import {
    RECURRING_EXPENSE_NAME_MAX,
    RECURRING_INCOME_NAME_MAX,
    RECURRING_NOTES_MAX,
    type RecurringExpenseFrequency,
    type RecurringExpenseType,
    type RecurringIncomeFrequency,
    type RecurringIncomeType
} from '@/features/recurring-payments/types';
import TierPicker from '@/features/tiers/components/forms/TierPicker.vue';

export type RecurringTemplateFormFieldErrors = {
    name?: string | null;
    expenseType?: string | null;
    incomeType?: string | null;
    expenseFrequency?: string | null;
    incomeFrequency?: string | null;
    plannedAmount?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    accountPublicId?: string | null;
    paymentDay?: string | null;
    notes?: string | null;
};

const props = withDefaults(
    defineProps<{
        form: RecurringTemplateFormFields;
        isEdit: boolean;
        accountItems: { title: string; value: string }[];
        expenseTypeItems: { title: string; value: RecurringExpenseType }[];
        incomeTypeItems: { title: string; value: RecurringIncomeType }[];
        expenseFrequencyItems: { title: string; value: RecurringExpenseFrequency }[];
        incomeFrequencyItems: { title: string; value: RecurringIncomeFrequency }[];
        paymentMethodItems: { title: string; value: string }[];
        categoryItems: { title: string; value: string; indent?: number }[];
        fieldErrors?: RecurringTemplateFormFieldErrors;
        accountLocked?: boolean;
        archivedHint?: string | null;
        pauseHint?: string | null;
        section?: 'template' | 'classification' | 'all';
    }>(),
    {
        fieldErrors: () => ({}),
        accountLocked: false,
        archivedHint: null,
        pauseHint: null,
        section: 'all'
    }
);

const { t } = useI18n();
const accountsStore = useAccountsStore();

const isExpense = computed(() => props.form.kind === 'expense');
const nameMax = computed(() => (isExpense.value ? RECURRING_EXPENSE_NAME_MAX : RECURRING_INCOME_NAME_MAX));
const showPaymentDay = computed(() => !isExpense.value && props.form.incomeFrequency !== 'hebdomadaire');
const categoryDefaultType = computed<CategoryType>(() => (isExpense.value ? 'depense' : 'revenu'));
const showTemplate = computed(() => props.section === 'all' || props.section === 'template');
const showClassification = computed(() => props.section === 'all' || props.section === 'classification');

const categoryCreateOpen = ref(false);
const categoryCreateName = ref('');
const paymentMethodCreateOpen = ref(false);
const paymentMethodCreateLabel = ref('');

const canCreatePaymentMethod = computed(() => {
    const account = accountsStore.accounts.find((item) => item.publicId === props.form.accountPublicId);
    return !!account && canWritePaymentMethods(account);
});

const startDateModel = computed({
    get: () => props.form.startDate || null,
    set: (value: string | null) => {
        props.form.startDate = value ?? '';
    }
});

const endDateModel = computed({
    get: () => props.form.endDate,
    set: (value: string | null) => {
        props.form.endDate = value;
    }
});

function onAmountInput(value: string) {
    props.form.plannedAmount = value.replace(/[^\d.,]/g, '');
}

function onPaymentDayInput(value: string) {
    props.form.paymentDay = value.replace(/\D/g, '').slice(0, 2);
}

function onCategoryCreated(category: Category) {
    props.form.categoryPublicId = category.publicId;
}

function onPaymentMethodCreated(method: PaymentMethod) {
    if (method.accountPublicId !== props.form.accountPublicId) return;
    props.form.paymentMethodPublicId = method.publicId;
}

watch(
    () => props.form.incomeFrequency,
    (value) => {
        if (value === 'hebdomadaire') props.form.paymentDay = '';
    }
);

function openCategoryCreate(name: string) {
    categoryCreateName.value = name;
    categoryCreateOpen.value = true;
}

function openPaymentMethodCreate(name: string) {
    paymentMethodCreateLabel.value = name;
    paymentMethodCreateOpen.value = true;
}
</script>

<template>
    <div class="recurring-form">
        <p v-if="showTemplate && archivedHint" class="text-caption text-warning mb-2">{{ archivedHint }}</p>
        <v-row v-if="showTemplate" class="align-center" no-gutters>
            <v-col cols="auto" sm="3" class="pr-3">
                <label class="v-label font-weight-medium" for="rec-form-active">{{ t('recurrencesPage.form.fields.isActive') }}</label>
            </v-col>
            <v-col cols="auto" sm="9">
                <AppSwitch id="rec-form-active" v-model="form.isActive" />
                <p v-if="pauseHint && !form.isActive" class="text-caption text-medium-emphasis mb-0 mt-1">{{ pauseHint }}</p>
            </v-col>
        </v-row>
        <v-row v-if="showTemplate" class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="rec-form-account">{{ t('recurrencesPage.form.fields.account') }} *</label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppSelect
                    id="rec-form-account"
                    v-model="form.accountPublicId"
                    :items="accountItems"
                    :disabled="accountLocked"
                    :label="t('recurrencesPage.form.fields.account')"
                    hide-details="auto"
                    :error="!!fieldErrors.accountPublicId"
                    :error-messages="fieldErrors.accountPublicId || undefined"
                />
            </v-col>
        </v-row>
        <v-row v-if="showTemplate" class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="rec-form-name">{{ t('recurrencesPage.form.fields.name') }} *</label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    id="rec-form-name"
                    v-model="form.name"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :maxlength="nameMax"
                    :error="!!fieldErrors.name"
                    :error-messages="fieldErrors.name || undefined"
                />
            </v-col>
        </v-row>
        <v-row v-if="showTemplate && isExpense" class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="rec-form-expense-type"
                    >{{ t('recurrencesPage.form.fields.expenseType') }} *</label
                >
            </v-col>
            <v-col cols="12" sm="9">
                <AppSelect
                    id="rec-form-expense-type"
                    v-model="form.expenseType"
                    :items="expenseTypeItems"
                    :label="t('recurrencesPage.form.fields.expenseType')"
                    hide-details="auto"
                    :error="!!fieldErrors.expenseType"
                    :error-messages="fieldErrors.expenseType || undefined"
                />
            </v-col>
        </v-row>
        <v-row v-if="showTemplate && !isExpense" class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="rec-form-income-type"
                    >{{ t('recurrencesPage.form.fields.incomeType') }} *</label
                >
            </v-col>
            <v-col cols="12" sm="9">
                <AppSelect
                    id="rec-form-income-type"
                    v-model="form.incomeType"
                    :items="incomeTypeItems"
                    :label="t('recurrencesPage.form.fields.incomeType')"
                    hide-details="auto"
                    :error="!!fieldErrors.incomeType"
                    :error-messages="fieldErrors.incomeType || undefined"
                />
            </v-col>
        </v-row>
        <v-row v-if="showTemplate" class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="rec-form-frequency"
                    >{{ t('recurrencesPage.form.fields.frequency') }} *</label
                >
            </v-col>
            <v-col cols="12" sm="9">
                <AppSelect
                    v-if="isExpense"
                    id="rec-form-frequency"
                    v-model="form.expenseFrequency"
                    :items="expenseFrequencyItems"
                    :label="t('recurrencesPage.form.fields.frequency')"
                    hide-details="auto"
                    :error="!!fieldErrors.expenseFrequency"
                    :error-messages="fieldErrors.expenseFrequency || undefined"
                />
                <AppSelect
                    v-else
                    id="rec-form-frequency"
                    v-model="form.incomeFrequency"
                    :items="incomeFrequencyItems"
                    :label="t('recurrencesPage.form.fields.frequency')"
                    hide-details="auto"
                    :error="!!fieldErrors.incomeFrequency"
                    :error-messages="fieldErrors.incomeFrequency || undefined"
                />
            </v-col>
        </v-row>
        <v-row v-if="showTemplate && showPaymentDay" class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="rec-form-payment-day">{{
                    t('recurrencesPage.form.fields.paymentDay')
                }}</label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    id="rec-form-payment-day"
                    :model-value="form.paymentDay"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    inputmode="numeric"
                    :placeholder="t('recurrencesPage.form.paymentDayPlaceholder')"
                    :error="!!fieldErrors.paymentDay"
                    :error-messages="fieldErrors.paymentDay || undefined"
                    @update:model-value="onPaymentDayInput"
                />
            </v-col>
        </v-row>
        <v-row v-if="showTemplate" class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="rec-form-amount"
                    >{{ t('recurrencesPage.form.fields.plannedAmount') }} *</label
                >
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    id="rec-form-amount"
                    :model-value="form.plannedAmount"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    inputmode="decimal"
                    :error="!!fieldErrors.plannedAmount"
                    :error-messages="fieldErrors.plannedAmount || undefined"
                    @update:model-value="onAmountInput"
                />
            </v-col>
        </v-row>
        <v-row v-if="showTemplate" class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium">{{ t('recurrencesPage.form.fields.startDate') }} *</label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppDatePicker
                    v-model="startDateModel"
                    :label="t('recurrencesPage.form.fields.startDate')"
                    :error="!!fieldErrors.startDate"
                    :error-messages="fieldErrors.startDate || undefined"
                />
            </v-col>
        </v-row>
        <v-row v-if="showTemplate" class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium">{{ t('recurrencesPage.form.fields.endDate') }}</label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppDatePicker
                    v-model="endDateModel"
                    clearable
                    :min="form.startDate || undefined"
                    :label="t('recurrencesPage.form.fields.endDate')"
                    :error="!!fieldErrors.endDate"
                    :error-messages="fieldErrors.endDate || undefined"
                />
            </v-col>
        </v-row>
        <v-row v-if="showClassification" class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium">{{ t('recurrencesPage.form.fields.paymentMethod') }}</label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppSelect
                    v-model="form.paymentMethodPublicId"
                    :items="paymentMethodItems"
                    searchable
                    :label="t('recurrencesPage.form.fields.paymentMethod')"
                    hide-details="auto"
                    :create-label="canCreatePaymentMethod ? t('recurrencesPage.form.createPaymentMethod') : undefined"
                    :create-named-label="
                        canCreatePaymentMethod ? t('transactionsPage.form.paymentMethodCreate', { name: '{name}' }) : undefined
                    "
                    @create="openPaymentMethodCreate"
                />
            </v-col>
        </v-row>
        <v-row v-if="showClassification" class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium">{{ t('recurrencesPage.form.fields.category') }}</label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppSelect
                    v-model="form.categoryPublicId"
                    :items="categoryItems"
                    searchable
                    :label="t('recurrencesPage.form.fields.category')"
                    hide-details="auto"
                    :create-label="t('recurrencesPage.form.createCategory')"
                    :create-named-label="t('transactionsPage.form.categoryCreate', { name: '{name}' })"
                    @create="openCategoryCreate"
                />
            </v-col>
        </v-row>
        <v-row v-if="showClassification" class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium">{{ t('recurrencesPage.form.fields.tier') }}</label>
            </v-col>
            <v-col cols="12" sm="9">
                <TierPicker v-model="form.tierPublicId" />
            </v-col>
        </v-row>
        <v-row v-if="showClassification" class="align-start" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="rec-form-notes">{{ t('recurrencesPage.form.fields.notes') }}</label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-textarea
                    id="rec-form-notes"
                    v-model="form.notes"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    rows="3"
                    :maxlength="RECURRING_NOTES_MAX"
                    :error="!!fieldErrors.notes"
                    :error-messages="fieldErrors.notes || undefined"
                />
            </v-col>
        </v-row>

        <CategoryFormModal
            v-if="showClassification"
            v-model="categoryCreateOpen"
            :default-type="categoryDefaultType"
            :default-name="categoryCreateName"
            @saved="onCategoryCreated"
        />
        <PaymentMethodFormModal
            v-if="showClassification"
            v-model="paymentMethodCreateOpen"
            :default-account-public-id="form.accountPublicId"
            lock-account
            :default-label="paymentMethodCreateLabel"
            @saved="onPaymentMethodCreated"
        />
    </div>
</template>

<style scoped>
.recurring-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.recurring-form > .v-row {
    flex: 0 0 auto;
    width: 100%;
}

.recurring-form .v-row:has(.app-switch) .v-label {
    margin-bottom: 0 !important;
}

@media (max-width: 599.98px) {
    .recurring-form {
        gap: 12px;
    }

    .recurring-form :deep(.v-label) {
        margin-bottom: 4px;
    }
}
</style>
