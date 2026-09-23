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
        <v-row v-if="isEdit" class="align-center" no-gutters>
            <v-col cols="auto" sm="3" class="pr-3">
                <label class="v-label font-weight-medium" for="savings-goal-form-abandon">
                    {{ t('savingsGoalsPage.form.fields.abandon') }}
                </label>
            </v-col>
            <v-col cols="auto" sm="9">
                <AppSwitch id="savings-goal-form-abandon" v-model="form.abandon" />
                <p class="text-caption text-medium-emphasis mb-0 mt-1">{{ t('savingsGoalsPage.form.abandonHint') }}</p>
            </v-col>
        </v-row>

        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="savings-goal-form-name">
                    {{ t('savingsGoalsPage.form.fields.name') }} *
                </label>
            </v-col>
            <v-col cols="12" sm="9">
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
            </v-col>
        </v-row>

        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="savings-goal-form-target">
                    {{ t('savingsGoalsPage.form.fields.targetAmount') }} *
                </label>
            </v-col>
            <v-col cols="12" sm="9">
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
            </v-col>
        </v-row>

        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="savings-goal-form-opening">
                    {{ t('savingsGoalsPage.form.fields.openingAmount') }}
                </label>
            </v-col>
            <v-col cols="12" sm="9">
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
            </v-col>
        </v-row>

        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium">{{ t('savingsGoalsPage.form.fields.targetDate') }}</label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppDatePicker v-model="targetDateModel" :label="t('savingsGoalsPage.form.fields.targetDate')" clearable />
                <p v-if="fieldErrors.targetDate" class="text-caption text-error mt-1 mb-0">{{ fieldErrors.targetDate }}</p>
            </v-col>
        </v-row>

        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium">{{ t('savingsGoalsPage.form.fields.account') }}</label>
            </v-col>
            <v-col cols="12" sm="9">
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
            </v-col>
        </v-row>

        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium">{{ t('savingsGoalsPage.form.fields.currency') }}</label>
            </v-col>
            <v-col cols="12" sm="9">
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
            </v-col>
        </v-row>
    </div>
</template>

<style scoped>
.savings-goal-form :deep(.v-row) {
    margin-bottom: 12px;
}
</style>
