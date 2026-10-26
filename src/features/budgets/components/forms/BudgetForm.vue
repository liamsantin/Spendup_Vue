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
        <div class="budget-form__row">
            <label class="budget-form__label" for="budget-form-active">{{ t('budgetsPage.form.fields.isActive') }}</label>
            <div class="budget-form__field">
                <AppSwitch id="budget-form-active" v-model="form.isActive" />
                <p v-if="pauseHint && !form.isActive" class="text-caption text-medium-emphasis mb-0 mt-1">{{ pauseHint }}</p>
            </div>
        </div>

        <div class="budget-form__row">
            <label class="budget-form__label" for="budget-form-name">{{ t('budgetsPage.form.fields.name') }} *</label>
            <div class="budget-form__field">
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
            </div>
        </div>

        <div class="budget-form__row">
            <label class="budget-form__label" for="budget-form-amount">{{ t('budgetsPage.form.fields.limitAmount') }} *</label>
            <div class="budget-form__field">
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
            </div>
        </div>

        <div class="budget-form__row">
            <label class="budget-form__label">{{ t('budgetsPage.form.fields.periode') }} *</label>
            <div class="budget-form__field">
                <AppSelect
                    id="budget-form-periode"
                    v-model="form.periode"
                    :items="periodeItems"
                    :label="t('budgetsPage.form.fields.periode')"
                    hide-details="auto"
                    :error="!!fieldErrors.periode"
                    :error-messages="fieldErrors.periode || undefined"
                />
            </div>
        </div>

        <div class="budget-form__row">
            <label class="budget-form__label">{{ t('budgetsPage.form.fields.startDate') }} *</label>
            <div class="budget-form__field">
                <AppDatePicker v-model="startDateModel" :label="t('budgetsPage.form.fields.startDate')" />
                <p v-if="fieldErrors.startDate" class="text-caption text-error mt-1 mb-0">{{ fieldErrors.startDate }}</p>
            </div>
        </div>

        <div class="budget-form__row">
            <label class="budget-form__label">{{ t('budgetsPage.form.fields.endDate') }}</label>
            <div class="budget-form__field">
                <AppDatePicker
                    v-model="endDateModel"
                    :label="t('budgetsPage.form.fields.endDate')"
                    :min="form.startDate || undefined"
                    clearable
                />
                <p v-if="fieldErrors.endDate" class="text-caption text-error mt-1 mb-0">{{ fieldErrors.endDate }}</p>
            </div>
        </div>

        <div class="budget-form__row">
            <label class="budget-form__label">{{ t('budgetsPage.form.fields.category') }}</label>
            <div class="budget-form__field">
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
            </div>
        </div>

        <div class="budget-form__row">
            <label class="budget-form__label">{{ t('budgetsPage.form.fields.currency') }}</label>
            <div class="budget-form__field">
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
            </div>
        </div>

        <CategoryFormModal
            v-model="categoryCreateOpen"
            default-type="depense"
            :default-name="categoryCreateName"
            @saved="onCategoryCreated"
        />
    </div>
</template>

<style scoped>
/* Formulaire de fenêtre modale (maquette 04) : libellé à gauche sur 170 px | champ carré. */
.budget-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.budget-form__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    align-items: center;
    gap: 8px 16px;
}

.budget-form__label {
    color: var(--ink);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.3;
}

.budget-form__field {
    min-width: 0;
}

/* champ texte Vuetify : 42 px, carré (bordure et focus gérés par le kit) */
.budget-form__field :deep(.v-field) {
    --v-input-control-height: 42px;
}

.budget-form__field :deep(.v-input--density-default .v-field--variant-outlined) {
    --v-input-control-height: 42px;
}

.budget-form__field :deep(.v-text-field input) {
    min-height: 42px;
    padding-top: 0;
    padding-bottom: 0;
}

.budget-form__field .text-caption {
    color: var(--gray) !important;
    font-size: 13px !important;
}

.budget-form__field .text-error {
    color: var(--danger) !important;
}

@media (max-width: 599.98px) {
    .budget-form__row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }
}
</style>
