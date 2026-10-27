<script setup lang="ts">
/**
 * Champs du formulaire prêt entre personnes. `form` est détenu par le parent (modale).
 * Sens et contrepartie verrouillés hors prêt `active` (`lockIdentity`).
 */
/* eslint-disable vue/no-mutating-props -- formulaire réactif partagé, détenu par le parent */
defineOptions({ name: 'PersonalLoanForm' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { TierPicker } from '@/features/tiers';
import {
    LOAN_DIRECTIONS,
    PERSONAL_LOAN_CURRENCIES,
    PERSONAL_LOAN_LABEL_MAX,
    PERSONAL_LOAN_NOTES_MAX
} from '@/features/personal-loans/types';
import type { PersonalLoanFormFields } from '@/features/personal-loans/payload';

export type PersonalLoanFormFieldErrors = {
    direction?: string | null;
    counterpartTierPublicId?: string | null;
    label?: string | null;
    initialAmount?: string | null;
    remainingAmount?: string | null;
    startDate?: string | null;
    plannedEndDate?: string | null;
    notes?: string | null;
    currency?: string | null;
};

const props = withDefaults(
    defineProps<{
        form: PersonalLoanFormFields;
        isEdit: boolean;
        /** Prêt stocké non `active` : sens et contrepartie en lecture seule. */
        lockIdentity?: boolean;
        fieldErrors?: PersonalLoanFormFieldErrors;
        currencyHint?: string | null;
        remainingHint?: string | null;
    }>(),
    {
        lockIdentity: false,
        fieldErrors: () => ({}),
        currencyHint: null,
        remainingHint: null
    }
);

const { t } = useI18n();

const directionItems = computed(() => LOAN_DIRECTIONS.map((value) => ({ title: t(`personalLoansPage.directions.${value}`), value })));
const currencyItems = computed(() => PERSONAL_LOAN_CURRENCIES.map((value) => ({ title: value, value })));

const startDateModel = computed({
    get: () => props.form.startDate,
    set: (value: string | null) => {
        props.form.startDate = value;
    }
});

const plannedEndDateModel = computed({
    get: () => props.form.plannedEndDate,
    set: (value: string | null) => {
        props.form.plannedEndDate = value;
    }
});
</script>

<template>
    <div class="loan-form">
        <div v-if="isEdit" class="loan-form__row">
            <label class="loan-form__label" for="loan-form-cancel">{{ t('personalLoansPage.form.fields.cancel') }}</label>
            <div class="loan-form__field">
                <AppSwitch id="loan-form-cancel" v-model="form.cancel" />
                <p class="text-caption text-medium-emphasis mb-0 mt-1">{{ t('personalLoansPage.form.cancelHint') }}</p>
            </div>
        </div>

        <div class="loan-form__row">
            <label class="loan-form__label">{{ t('personalLoansPage.form.fields.direction') }} *</label>
            <div class="loan-form__field">
                <AppSelect
                    id="loan-form-direction"
                    v-model="form.direction"
                    :items="directionItems"
                    :label="t('personalLoansPage.form.fields.direction')"
                    :disabled="lockIdentity"
                    hide-details="auto"
                    :error="!!fieldErrors.direction"
                    :error-messages="fieldErrors.direction || undefined"
                />
            </div>
        </div>

        <div class="loan-form__row">
            <label class="loan-form__label">{{ t('personalLoansPage.form.fields.counterpart') }} *</label>
            <div class="loan-form__field">
                <TierPicker
                    v-model="form.counterpartTierPublicId"
                    :label="t('personalLoansPage.form.fields.counterpart')"
                    :disabled="lockIdentity"
                    hide-details="auto"
                    :error="!!fieldErrors.counterpartTierPublicId"
                    :error-messages="fieldErrors.counterpartTierPublicId || undefined"
                />
                <p class="text-caption text-medium-emphasis mb-0 mt-1">
                    {{ lockIdentity ? t('personalLoansPage.form.identityLockedHint') : t('personalLoansPage.form.counterpartHint') }}
                </p>
            </div>
        </div>

        <div class="loan-form__row">
            <label class="loan-form__label" for="loan-form-label">{{ t('personalLoansPage.form.fields.label') }}</label>
            <div class="loan-form__field">
                <v-text-field
                    id="loan-form-label"
                    v-model="form.label"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :maxlength="PERSONAL_LOAN_LABEL_MAX"
                    :placeholder="t('personalLoansPage.form.placeholders.label')"
                    :error="!!fieldErrors.label"
                    :error-messages="fieldErrors.label || undefined"
                />
            </div>
        </div>

        <div class="loan-form__row">
            <label class="loan-form__label" for="loan-form-initial">{{ t('personalLoansPage.form.fields.initialAmount') }} *</label>
            <div class="loan-form__field">
                <v-text-field
                    id="loan-form-initial"
                    v-model="form.initialAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error="!!fieldErrors.initialAmount"
                    :error-messages="fieldErrors.initialAmount || undefined"
                />
            </div>
        </div>

        <div class="loan-form__row">
            <label class="loan-form__label" for="loan-form-remaining">
                {{ t('personalLoansPage.form.fields.remainingAmount') }}<template v-if="isEdit"> *</template>
            </label>
            <div class="loan-form__field">
                <v-text-field
                    id="loan-form-remaining"
                    v-model="form.remainingAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error="!!fieldErrors.remainingAmount"
                    :error-messages="fieldErrors.remainingAmount || undefined"
                />
                <p v-if="remainingHint" class="text-caption text-medium-emphasis mb-0 mt-1">{{ remainingHint }}</p>
            </div>
        </div>

        <div class="loan-form__row">
            <label class="loan-form__label">{{ t('personalLoansPage.form.fields.startDate') }} *</label>
            <div class="loan-form__field">
                <AppDatePicker v-model="startDateModel" :label="t('personalLoansPage.form.fields.startDate')" />
                <p v-if="fieldErrors.startDate" class="text-caption text-error mt-1 mb-0">{{ fieldErrors.startDate }}</p>
            </div>
        </div>

        <div class="loan-form__row">
            <label class="loan-form__label">{{ t('personalLoansPage.form.fields.plannedEndDate') }}</label>
            <div class="loan-form__field">
                <AppDatePicker
                    v-model="plannedEndDateModel"
                    :label="t('personalLoansPage.form.fields.plannedEndDate')"
                    :min="form.startDate || undefined"
                    clearable
                />
                <p v-if="fieldErrors.plannedEndDate" class="text-caption text-error mt-1 mb-0">{{ fieldErrors.plannedEndDate }}</p>
            </div>
        </div>

        <div class="loan-form__row">
            <label class="loan-form__label">{{ t('personalLoansPage.form.fields.currency') }}</label>
            <div class="loan-form__field">
                <AppSelect
                    id="loan-form-currency"
                    v-model="form.currency"
                    :items="currencyItems"
                    :label="t('personalLoansPage.form.fields.currency')"
                    :disabled="isEdit"
                    hide-details="auto"
                    :error="!!fieldErrors.currency"
                    :error-messages="fieldErrors.currency || undefined"
                />
                <p v-if="currencyHint" class="text-caption text-medium-emphasis mb-0 mt-1">{{ currencyHint }}</p>
            </div>
        </div>

        <div class="loan-form__row loan-form__row--top">
            <label class="loan-form__label" for="loan-form-notes">{{ t('personalLoansPage.form.fields.notes') }}</label>
            <div class="loan-form__field">
                <v-textarea
                    id="loan-form-notes"
                    v-model="form.notes"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    rows="3"
                    auto-grow
                    :maxlength="PERSONAL_LOAN_NOTES_MAX"
                    :error="!!fieldErrors.notes"
                    :error-messages="fieldErrors.notes || undefined"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Formulaire de modale : libellé à gauche sur 170 px | champ carré. */
.loan-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.loan-form__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    align-items: center;
    gap: 8px 16px;
}

.loan-form__row--top {
    align-items: start;
}

.loan-form__row--top .loan-form__label {
    padding-top: 10px;
}

.loan-form__label {
    color: var(--ink);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.3;
}

.loan-form__field {
    min-width: 0;
}

/* champ texte Vuetify : 42 px, carré (bordure et focus gérés par le kit) */
.loan-form__field :deep(.v-field) {
    --v-input-control-height: 42px;
}

.loan-form__field :deep(.v-input--density-default .v-field--variant-outlined) {
    --v-input-control-height: 42px;
}

.loan-form__field :deep(.v-text-field input) {
    min-height: 42px;
    padding-top: 0;
    padding-bottom: 0;
}

.loan-form__field .text-caption {
    color: var(--gray) !important;
    font-size: 13px !important;
}

.loan-form__field .text-error {
    color: var(--danger) !important;
}

@media (max-width: 599.98px) {
    .loan-form__row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }

    .loan-form__row--top .loan-form__label {
        padding-top: 0;
    }
}
</style>
