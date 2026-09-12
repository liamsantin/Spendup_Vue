<script setup lang="ts">
/**
 * Champs du formulaire budget. `form` est détenu par le parent.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'BudgetForm' });

import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import CategoryFormModal from '@/features/categories/components/modals/CategoryFormModal.vue';
import type { Category } from '@/features/categories/types';
import { BUDGET_CURRENCIES, BUDGET_NAME_MAX, BUDGET_PERIODES } from '@/features/budgets/types';
import type { BudgetFormFields } from '@/features/budgets/payload';

export type BudgetFormFieldErrors = {
    name?: string | null;
    limitAmount?: string | null;
    periode?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    categoryPublicId?: string | null;
    currency?: string | null;
};

const props = withDefaults(
    defineProps<{
        form: BudgetFormFields;
        isEdit: boolean;
        categoryItems: { title: string; value: string; indent?: number }[];
        fieldErrors?: BudgetFormFieldErrors;
        pauseHint?: string | null;
        currencyHint?: string | null;
    }>(),
    {
        fieldErrors: () => ({}),
        pauseHint: null,
        currencyHint: null
    }
);

const { t } = useI18n();

const periodeItems = computed(() => BUDGET_PERIODES.map((value) => ({ title: t(`budgetsPage.periodes.${value}`), value })));
const currencyItems = computed(() => BUDGET_CURRENCIES.map((value) => ({ title: value, value })));

const categoryCreateOpen = ref(false);
const categoryCreateName = ref('');

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

function onCategoryCreated(category: Category) {
    props.form.categoryPublicId = category.publicId;
}
</script>

<template>
    <div class="budget-form">
        <v-row class="align-center" no-gutters>
            <v-col cols="auto" sm="3" class="pr-3">
                <label class="v-label font-weight-medium" for="budget-form-active">{{ t('budgetsPage.form.fields.isActive') }}</label>
            </v-col>
            <v-col cols="auto" sm="9">
                <AppSwitch id="budget-form-active" v-model="form.isActive" />
                <p v-if="pauseHint && !form.isActive" class="text-caption text-medium-emphasis mb-0 mt-1">{{ pauseHint }}</p>
            </v-col>
        </v-row>

        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="budget-form-name">{{ t('budgetsPage.form.fields.name') }} *</label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    id="budget-form-name"
                    v-model="form.name"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :maxlength="BUDGET_NAME_MAX"
                    :error="!!fieldErrors.name"
                    :error-messages="fieldErrors.name || undefined"
                />
            </v-col>
        </v-row>

        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="budget-form-amount">{{ t('budgetsPage.form.fields.limitAmount') }} *</label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    id="budget-form-amount"
                    v-model="form.limitAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error="!!fieldErrors.limitAmount"
                    :error-messages="fieldErrors.limitAmount || undefined"
                />
            </v-col>
        </v-row>

        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium">{{ t('budgetsPage.form.fields.periode') }} *</label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppSelect
                    id="budget-form-periode"
                    v-model="form.periode"
                    :items="periodeItems"
                    :label="t('budgetsPage.form.fields.periode')"
                    hide-details="auto"
                    :error="!!fieldErrors.periode"
                    :error-messages="fieldErrors.periode || undefined"
                />
            </v-col>
        </v-row>

        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium">{{ t('budgetsPage.form.fields.startDate') }} *</label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppDatePicker v-model="startDateModel" :label="t('budgetsPage.form.fields.startDate')" />
                <p v-if="fieldErrors.startDate" class="text-caption text-error mt-1 mb-0">{{ fieldErrors.startDate }}</p>
            </v-col>
        </v-row>

        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium">{{ t('budgetsPage.form.fields.endDate') }}</label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppDatePicker
                    v-model="endDateModel"
                    :label="t('budgetsPage.form.fields.endDate')"
                    :min="form.startDate || undefined"
                    clearable
                />
                <p v-if="fieldErrors.endDate" class="text-caption text-error mt-1 mb-0">{{ fieldErrors.endDate }}</p>
            </v-col>
        </v-row>

        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium">{{ t('budgetsPage.form.fields.category') }}</label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppSelect
                    id="budget-form-category"
                    v-model="form.categoryPublicId"
                    :items="categoryItems"
                    :label="t('budgetsPage.form.fields.category')"
                    searchable
                    hide-details="auto"
                    :error="!!fieldErrors.categoryPublicId"
                    :error-messages="fieldErrors.categoryPublicId || undefined"
                    :create-label="t('budgetsPage.form.createCategory')"
                    :create-named-label="t('budgetsPage.form.createCategoryNamed')"
                    @create="
                        categoryCreateName = $event;
                        categoryCreateOpen = true;
                    "
                />
            </v-col>
        </v-row>

        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium">{{ t('budgetsPage.form.fields.currency') }}</label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppSelect
                    id="budget-form-currency"
                    v-model="form.currency"
                    :items="currencyItems"
                    :label="t('budgetsPage.form.fields.currency')"
                    :disabled="isEdit"
                    hide-details="auto"
                    :error="!!fieldErrors.currency"
                    :error-messages="fieldErrors.currency || undefined"
                />
                <p v-if="currencyHint" class="text-caption text-medium-emphasis mb-0 mt-1">{{ currencyHint }}</p>
            </v-col>
        </v-row>

        <CategoryFormModal
            v-model="categoryCreateOpen"
            default-type="depense"
            :default-name="categoryCreateName"
            @saved="onCategoryCreated"
        />
    </div>
</template>

<style scoped>
.budget-form :deep(.v-row) {
    margin-bottom: 12px;
}
</style>
