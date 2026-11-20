<script setup lang="ts">
/**
 * Champs du formulaire de dette entre amis. `form` est détenu par le parent.
 * Création : ami, transaction optionnelle, montant, libellé, devise, échéance.
 * Édition : libellé, montant, échéance seulement (ami / transaction / devise figés).
 */
/* eslint-disable vue/no-mutating-props -- formulaire réactif partagé, détenu par le parent */
defineOptions({ name: 'SharedDebtForm' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { SHARED_DEBT_CURRENCIES, SHARED_DEBT_LABEL_MAX } from '@/features/shared-debts/types';
import type { SharedDebtFormFields } from '@/features/shared-debts/payload';

export type SharedDebtFormFieldErrors = {
    debtorUserPublicId?: string | null;
    transactionPublicId?: string | null;
    label?: string | null;
    amount?: string | null;
    currency?: string | null;
    dueDate?: string | null;
};

export type SharedDebtFormSelectItem = { title: string; value: string };

const props = withDefaults(
    defineProps<{
        form: SharedDebtFormFields;
        isEdit: boolean;
        friendItems: SharedDebtFormSelectItem[];
        transactionItems: SharedDebtFormSelectItem[];
        friendsLoading?: boolean;
        transactionsLoading?: boolean;
        /** Devise imposée par la transaction liée. */
        currencyLocked?: boolean;
        fieldErrors?: SharedDebtFormFieldErrors;
        currencyHint?: string | null;
    }>(),
    {
        friendsLoading: false,
        transactionsLoading: false,
        currencyLocked: false,
        fieldErrors: () => ({}),
        currencyHint: null
    }
);

const { t } = useI18n();

const currencyItems = computed(() => SHARED_DEBT_CURRENCIES.map((value) => ({ title: value, value })));

const transactionSelectItems = computed(() => [{ title: t('sharedDebtsPage.form.noTransaction'), value: '' }, ...props.transactionItems]);

const dueDateModel = computed({
    get: () => props.form.dueDate,
    set: (value: string | null) => {
        props.form.dueDate = value;
    }
});
</script>

<template>
    <div class="shared-debt-form">
        <div v-if="!isEdit" class="shared-debt-form__row">
            <label class="shared-debt-form__label" for="shared-debt-form-friend">{{ t('sharedDebtsPage.form.fields.friend') }} *</label>
            <div class="shared-debt-form__field">
                <AppSelect
                    id="shared-debt-form-friend"
                    v-model="form.debtorUserPublicId"
                    :items="friendItems"
                    :label="t('sharedDebtsPage.form.fields.friend')"
                    searchable
                    :search-placeholder="t('sharedDebtsPage.form.friendSearch')"
                    :no-results-label="t('sharedDebtsPage.form.friendNoResults')"
                    :disabled="friendsLoading"
                    hide-details="auto"
                    :error="!!fieldErrors.debtorUserPublicId"
                    :error-messages="fieldErrors.debtorUserPublicId || undefined"
                />
                <p v-if="!friendsLoading && !friendItems.length" class="shared-debt-form__hint">
                    {{ t('sharedDebtsPage.form.noFriends') }}
                </p>
            </div>
        </div>

        <div v-if="!isEdit" class="shared-debt-form__row">
            <label class="shared-debt-form__label" for="shared-debt-form-transaction">{{
                t('sharedDebtsPage.form.fields.transaction')
            }}</label>
            <div class="shared-debt-form__field">
                <AppSelect
                    id="shared-debt-form-transaction"
                    v-model="form.transactionPublicId"
                    :items="transactionSelectItems"
                    :label="t('sharedDebtsPage.form.fields.transaction')"
                    searchable
                    :search-placeholder="t('sharedDebtsPage.form.transactionSearch')"
                    :no-results-label="t('sharedDebtsPage.form.transactionNoResults')"
                    :disabled="transactionsLoading"
                    hide-details="auto"
                    :error="!!fieldErrors.transactionPublicId"
                    :error-messages="fieldErrors.transactionPublicId || undefined"
                />
                <p class="shared-debt-form__hint">{{ t('sharedDebtsPage.form.transactionHint') }}</p>
            </div>
        </div>

        <div class="shared-debt-form__row">
            <label class="shared-debt-form__label" for="shared-debt-form-amount">{{ t('sharedDebtsPage.form.fields.amount') }} *</label>
            <div class="shared-debt-form__field">
                <v-text-field
                    id="shared-debt-form-amount"
                    v-model="form.amount"
                    type="number"
                    step="0.01"
                    min="0"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error="!!fieldErrors.amount"
                    :error-messages="fieldErrors.amount || undefined"
                />
            </div>
        </div>

        <div class="shared-debt-form__row">
            <label class="shared-debt-form__label" for="shared-debt-form-label">
                {{ t('sharedDebtsPage.form.fields.label') }}<template v-if="isEdit || !form.transactionPublicId"> *</template>
            </label>
            <div class="shared-debt-form__field">
                <v-text-field
                    id="shared-debt-form-label"
                    v-model="form.label"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :maxlength="SHARED_DEBT_LABEL_MAX"
                    :error="!!fieldErrors.label"
                    :error-messages="fieldErrors.label || undefined"
                />
            </div>
        </div>

        <div class="shared-debt-form__row">
            <label class="shared-debt-form__label">{{ t('sharedDebtsPage.form.fields.currency') }}</label>
            <div class="shared-debt-form__field">
                <AppSelect
                    id="shared-debt-form-currency"
                    v-model="form.currency"
                    :items="currencyItems"
                    :label="t('sharedDebtsPage.form.fields.currency')"
                    :disabled="isEdit || currencyLocked"
                    hide-details="auto"
                    :error="!!fieldErrors.currency"
                    :error-messages="fieldErrors.currency || undefined"
                />
                <p v-if="currencyHint" class="shared-debt-form__hint">{{ currencyHint }}</p>
            </div>
        </div>

        <div class="shared-debt-form__row">
            <label class="shared-debt-form__label">{{ t('sharedDebtsPage.form.fields.dueDate') }}</label>
            <div class="shared-debt-form__field">
                <AppDatePicker v-model="dueDateModel" :label="t('sharedDebtsPage.form.fields.dueDate')" clearable />
                <p v-if="fieldErrors.dueDate" class="shared-debt-form__hint shared-debt-form__hint--error">{{ fieldErrors.dueDate }}</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Formulaire de fenêtre modale : libellé à gauche sur 170 px | champ carré. */
.shared-debt-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.shared-debt-form__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    align-items: center;
    gap: 8px 16px;
}

.shared-debt-form__label {
    color: var(--ink);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.3;
}

.shared-debt-form__field {
    min-width: 0;
}

/* champ texte Vuetify : 42 px, carré (bordure et focus gérés par le kit) */
.shared-debt-form__field :deep(.v-field) {
    --v-input-control-height: 42px;
}

.shared-debt-form__field :deep(.v-input--density-default .v-field--variant-outlined) {
    --v-input-control-height: 42px;
}

.shared-debt-form__field :deep(.v-text-field input) {
    min-height: 42px;
    padding-top: 0;
    padding-bottom: 0;
}

.shared-debt-form__hint {
    margin: 4px 0 0;
    color: var(--gray);
    font-size: 13px;
}

.shared-debt-form__hint--error {
    color: var(--danger);
}

@media (max-width: 599.98px) {
    .shared-debt-form__row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }
}
</style>
