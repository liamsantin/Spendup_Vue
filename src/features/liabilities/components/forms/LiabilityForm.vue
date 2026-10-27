<script setup lang="ts">
/**
 * Champs du formulaire passif. `form` est détenu par le parent (modale).
 */
/* eslint-disable vue/no-mutating-props -- formulaire réactif partagé, détenu par le parent */
defineOptions({ name: 'LiabilityForm' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { TierPicker } from '@/features/tiers';
import { LIABILITY_CURRENCIES, LIABILITY_NAME_MAX, LIABILITY_TYPES } from '@/features/liabilities/types';
import type { LiabilityFormFields } from '@/features/liabilities/payload';

export type LiabilityFormFieldErrors = {
    name?: string | null;
    type?: string | null;
    initialAmount?: string | null;
    remainingAmount?: string | null;
    interestRate?: string | null;
    startDate?: string | null;
    plannedEndDate?: string | null;
    currency?: string | null;
    lenderTierPublicId?: string | null;
    assetPublicId?: string | null;
};

const props = withDefaults(
    defineProps<{
        form: LiabilityFormFields;
        isEdit: boolean;
        /** Actifs actifs du user : « nom · type ». */
        assetItems: { title: string; value: string }[];
        fieldErrors?: LiabilityFormFieldErrors;
        currencyHint?: string | null;
        remainingHint?: string | null;
    }>(),
    {
        fieldErrors: () => ({}),
        currencyHint: null,
        remainingHint: null
    }
);

const { t } = useI18n();

const typeItems = computed(() => LIABILITY_TYPES.map((value) => ({ title: t(`liabilitiesPage.types.${value}`), value })));
const currencyItems = computed(() => LIABILITY_CURRENCIES.map((value) => ({ title: value, value })));

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
    <div class="liability-form">
        <div v-if="isEdit" class="liability-form__row">
            <label class="liability-form__label" for="liability-form-cancel">{{ t('liabilitiesPage.form.fields.cancel') }}</label>
            <div class="liability-form__field">
                <AppSwitch id="liability-form-cancel" v-model="form.cancel" />
                <p class="text-caption text-medium-emphasis mb-0 mt-1">{{ t('liabilitiesPage.form.cancelHint') }}</p>
            </div>
        </div>

        <div class="liability-form__row">
            <label class="liability-form__label" for="liability-form-name">{{ t('liabilitiesPage.form.fields.name') }} *</label>
            <div class="liability-form__field">
                <v-text-field
                    id="liability-form-name"
                    v-model="form.name"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :maxlength="LIABILITY_NAME_MAX"
                    :error="!!fieldErrors.name"
                    :error-messages="fieldErrors.name || undefined"
                />
            </div>
        </div>

        <div class="liability-form__row">
            <label class="liability-form__label">{{ t('liabilitiesPage.form.fields.type') }} *</label>
            <div class="liability-form__field">
                <AppSelect
                    id="liability-form-type"
                    v-model="form.type"
                    :items="typeItems"
                    :label="t('liabilitiesPage.form.fields.type')"
                    hide-details="auto"
                    :error="!!fieldErrors.type"
                    :error-messages="fieldErrors.type || undefined"
                />
            </div>
        </div>

        <div class="liability-form__row">
            <label class="liability-form__label">{{ t('liabilitiesPage.form.fields.lender') }}</label>
            <div class="liability-form__field">
                <TierPicker
                    v-model="form.lenderTierPublicId"
                    :label="t('liabilitiesPage.form.fields.lender')"
                    :none-label="t('liabilitiesPage.form.noLender')"
                    hide-details="auto"
                    :error="!!fieldErrors.lenderTierPublicId"
                    :error-messages="fieldErrors.lenderTierPublicId || undefined"
                />
                <p class="text-caption text-medium-emphasis mb-0 mt-1">{{ t('liabilitiesPage.form.lenderHint') }}</p>
            </div>
        </div>

        <div class="liability-form__row">
            <label class="liability-form__label" for="liability-form-initial">{{ t('liabilitiesPage.form.fields.initialAmount') }} *</label>
            <div class="liability-form__field">
                <v-text-field
                    id="liability-form-initial"
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

        <div class="liability-form__row">
            <label class="liability-form__label" for="liability-form-remaining">
                {{ t('liabilitiesPage.form.fields.remainingAmount') }}<template v-if="isEdit"> *</template>
            </label>
            <div class="liability-form__field">
                <v-text-field
                    id="liability-form-remaining"
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

        <div class="liability-form__row">
            <label class="liability-form__label" for="liability-form-rate">{{ t('liabilitiesPage.form.fields.interestRate') }}</label>
            <div class="liability-form__field">
                <v-text-field
                    id="liability-form-rate"
                    v-model="form.interestRate"
                    type="number"
                    step="0.001"
                    min="0"
                    max="100"
                    suffix="%"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error="!!fieldErrors.interestRate"
                    :error-messages="fieldErrors.interestRate || undefined"
                />
            </div>
        </div>

        <div class="liability-form__row">
            <label class="liability-form__label">{{ t('liabilitiesPage.form.fields.startDate') }}</label>
            <div class="liability-form__field">
                <AppDatePicker v-model="startDateModel" :label="t('liabilitiesPage.form.fields.startDate')" clearable />
                <p v-if="fieldErrors.startDate" class="text-caption text-error mt-1 mb-0">{{ fieldErrors.startDate }}</p>
            </div>
        </div>

        <div class="liability-form__row">
            <label class="liability-form__label">{{ t('liabilitiesPage.form.fields.plannedEndDate') }}</label>
            <div class="liability-form__field">
                <AppDatePicker
                    v-model="plannedEndDateModel"
                    :label="t('liabilitiesPage.form.fields.plannedEndDate')"
                    :min="form.startDate || undefined"
                    clearable
                />
                <p v-if="fieldErrors.plannedEndDate" class="text-caption text-error mt-1 mb-0">{{ fieldErrors.plannedEndDate }}</p>
            </div>
        </div>

        <div class="liability-form__row">
            <label class="liability-form__label">{{ t('liabilitiesPage.form.fields.asset') }}</label>
            <div class="liability-form__field">
                <AppSelect
                    id="liability-form-asset"
                    v-model="form.assetPublicId"
                    :items="assetItems"
                    :label="t('liabilitiesPage.form.fields.asset')"
                    searchable
                    hide-details="auto"
                    :error="!!fieldErrors.assetPublicId"
                    :error-messages="fieldErrors.assetPublicId || undefined"
                />
                <p class="text-caption text-medium-emphasis mb-0 mt-1">{{ t('liabilitiesPage.form.assetHint') }}</p>
            </div>
        </div>

        <div class="liability-form__row">
            <label class="liability-form__label">{{ t('liabilitiesPage.form.fields.currency') }}</label>
            <div class="liability-form__field">
                <AppSelect
                    id="liability-form-currency"
                    v-model="form.currency"
                    :items="currencyItems"
                    :label="t('liabilitiesPage.form.fields.currency')"
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
/* Formulaire de modale : libellé à gauche sur 170 px | champ carré. */
.liability-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.liability-form__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    align-items: center;
    gap: 8px 16px;
}

.liability-form__label {
    color: var(--ink);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.3;
}

.liability-form__field {
    min-width: 0;
}

/* champ texte Vuetify : 42 px, carré (bordure et focus gérés par le kit) */
.liability-form__field :deep(.v-field) {
    --v-input-control-height: 42px;
}

.liability-form__field :deep(.v-input--density-default .v-field--variant-outlined) {
    --v-input-control-height: 42px;
}

.liability-form__field :deep(.v-text-field input) {
    min-height: 42px;
    padding-top: 0;
    padding-bottom: 0;
}

.liability-form__field .text-caption {
    color: var(--gray) !important;
    font-size: 13px !important;
}

.liability-form__field .text-error {
    color: var(--danger) !important;
}

@media (max-width: 599.98px) {
    .liability-form__row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }
}
</style>
