<script setup lang="ts">
/**
 * Champs du formulaire objectif d'épargne. `form` est détenu par le parent.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'SavingsGoalForm' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { SAVINGS_GOAL_CURRENCIES, SAVINGS_GOAL_NAME_MAX } from '@/features/savings-goals/types';
import type { SavingsGoalFormFields } from '@/features/savings-goals/payload';

export type SavingsGoalFormFieldErrors = {
    name?: string | null;
    targetAmount?: string | null;
    openingAmount?: string | null;
    targetDate?: string | null;
    accountPublicId?: string | null;
    currency?: string | null;
};

const props = withDefaults(
    defineProps<{
        form: SavingsGoalFormFields;
        isEdit: boolean;
        accountItems: { title: string; value: string }[];
        fieldErrors?: SavingsGoalFormFieldErrors;
        currencyHint?: string | null;
        accountHint?: string | null;
        accountChangeHint?: string | null;
        progressHint?: string | null;
    }>(),
    {
        fieldErrors: () => ({}),
        currencyHint: null,
        accountHint: null,
        accountChangeHint: null,
        progressHint: null
    }
);

const { t } = useI18n();

const currencyItems = computed(() => SAVINGS_GOAL_CURRENCIES.map((value) => ({ title: value, value })));

const targetDateModel = computed({
    get: () => props.form.targetDate,
    set: (value: string | null) => {
        props.form.targetDate = value;
    }
});
</script>

<template>
    <div class="savings-goal-form">
        <div v-if="isEdit" class="savings-goal-form__row">
            <label class="savings-goal-form__label" for="savings-goal-form-abandon">
                {{ t('savingsGoalsPage.form.fields.abandon') }}
            </label>
            <div class="savings-goal-form__field">
                <AppSwitch id="savings-goal-form-abandon" v-model="form.abandon" />
                <p class="text-caption text-medium-emphasis mb-0 mt-1">{{ t('savingsGoalsPage.form.abandonHint') }}</p>
            </div>
        </div>

        <div class="savings-goal-form__row">
            <label class="savings-goal-form__label" for="savings-goal-form-name"> {{ t('savingsGoalsPage.form.fields.name') }} * </label>
            <div class="savings-goal-form__field">
                <v-text-field
                    id="savings-goal-form-name"
                    v-model="form.name"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :maxlength="SAVINGS_GOAL_NAME_MAX"
                    :error="!!fieldErrors.name"
                    :error-messages="fieldErrors.name || undefined"
                />
            </div>
        </div>

        <div class="savings-goal-form__row">
            <label class="savings-goal-form__label" for="savings-goal-form-target">
                {{ t('savingsGoalsPage.form.fields.targetAmount') }} *
            </label>
            <div class="savings-goal-form__field">
                <v-text-field
                    id="savings-goal-form-target"
                    v-model="form.targetAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error="!!fieldErrors.targetAmount"
                    :error-messages="fieldErrors.targetAmount || undefined"
                />
            </div>
        </div>

        <div class="savings-goal-form__row">
            <label class="savings-goal-form__label" for="savings-goal-form-opening">
                {{ t('savingsGoalsPage.form.fields.openingAmount') }}
            </label>
            <div class="savings-goal-form__field">
                <v-text-field
                    id="savings-goal-form-opening"
                    v-model="form.openingAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error="!!fieldErrors.openingAmount"
                    :error-messages="fieldErrors.openingAmount || undefined"
                />
                <p class="text-caption text-medium-emphasis mb-0 mt-1">{{ t('savingsGoalsPage.form.openingAmountHint') }}</p>
                <p v-if="progressHint" class="text-caption text-medium-emphasis mb-0 mt-1">{{ progressHint }}</p>
            </div>
        </div>

        <div class="savings-goal-form__row">
            <label class="savings-goal-form__label">{{ t('savingsGoalsPage.form.fields.targetDate') }}</label>
            <div class="savings-goal-form__field">
                <AppDatePicker v-model="targetDateModel" :label="t('savingsGoalsPage.form.fields.targetDate')" clearable />
                <p v-if="fieldErrors.targetDate" class="text-caption text-error mt-1 mb-0">{{ fieldErrors.targetDate }}</p>
            </div>
        </div>

        <div class="savings-goal-form__row">
            <label class="savings-goal-form__label">{{ t('savingsGoalsPage.form.fields.account') }}</label>
            <div class="savings-goal-form__field">
                <AppSelect
                    id="savings-goal-form-account"
                    v-model="form.accountPublicId"
                    :items="accountItems"
                    :label="t('savingsGoalsPage.form.fields.account')"
                    searchable
                    hide-details="auto"
                    :error="!!fieldErrors.accountPublicId"
                    :error-messages="fieldErrors.accountPublicId || undefined"
                />
                <p v-if="accountHint" class="text-caption text-medium-emphasis mb-0 mt-1">{{ accountHint }}</p>
                <p v-if="accountChangeHint" class="text-caption text-medium-emphasis mb-0 mt-1">{{ accountChangeHint }}</p>
            </div>
        </div>

        <div class="savings-goal-form__row">
            <label class="savings-goal-form__label">{{ t('savingsGoalsPage.form.fields.currency') }}</label>
            <div class="savings-goal-form__field">
                <AppSelect
                    id="savings-goal-form-currency"
                    v-model="form.currency"
                    :items="currencyItems"
                    :label="t('savingsGoalsPage.form.fields.currency')"
                    :disabled="isEdit"
                    hide-details="auto"
                    :error="!!fieldErrors.currency"
                    :error-messages="fieldErrors.currency || undefined"
                />
                <p v-if="currencyHint" class="text-caption text-medium-emphasis mb-0 mt-1">{{ currencyHint }}</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Formulaire de fenêtre modale (maquette 04) : libellé à gauche sur 170 px | champ carré. */
.savings-goal-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.savings-goal-form__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    align-items: center;
    gap: 8px 16px;
}

.savings-goal-form__label {
    color: var(--ink);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.3;
}

.savings-goal-form__field {
    min-width: 0;
}

/* champ texte Vuetify : 42 px, carré (bordure et focus gérés par le kit) */
.savings-goal-form__field :deep(.v-field) {
    --v-input-control-height: 42px;
}

.savings-goal-form__field :deep(.v-input--density-default .v-field--variant-outlined) {
    --v-input-control-height: 42px;
}

.savings-goal-form__field :deep(.v-text-field input) {
    min-height: 42px;
    padding-top: 0;
    padding-bottom: 0;
}

.savings-goal-form__field .text-caption {
    color: var(--gray) !important;
    font-size: 13px !important;
}

.savings-goal-form__field .text-error {
    color: var(--danger) !important;
}

@media (max-width: 599.98px) {
    .savings-goal-form__row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }
}
</style>
