<script setup lang="ts">
/**
 * Formulaire d’actif : racine (nom, type, valeur, devise, acquisition, description, notes, cédé)
 * + sous-formulaire du détail selon le type. `form` est détenu par le parent.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'AssetForm' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { ASSET_CURRENCIES, ASSET_DESCRIPTION_MAX, ASSET_NAME_MAX, ASSET_NOTES_MAX, ASSET_TYPES } from '@/features/assets/types';
import type { AssetFormFields } from '@/features/assets/payload';
import AssetFormRow from '@/features/assets/components/forms/AssetFormRow.vue';
import CryptoDetailsFields from '@/features/assets/components/forms/CryptoDetailsFields.vue';
import OtherDetailsFields from '@/features/assets/components/forms/OtherDetailsFields.vue';
import RealEstateDetailsFields from '@/features/assets/components/forms/RealEstateDetailsFields.vue';
import SavingsAccountDetailsFields from '@/features/assets/components/forms/SavingsAccountDetailsFields.vue';
import ValuableItemDetailsFields from '@/features/assets/components/forms/ValuableItemDetailsFields.vue';
import VehicleDetailsFields from '@/features/assets/components/forms/VehicleDetailsFields.vue';
import type { AssetFieldErrors } from '@/features/assets/components/forms/asset-form-errors';

const props = withDefaults(
    defineProps<{
        form: AssetFormFields;
        isEdit: boolean;
        /** Type figé (édition, ou création depuis une page dédiée). */
        typeLocked?: boolean;
        /** Propose l’immobilier dans la liste des types (masqué sur la page Actifs). */
        allowRealEstate?: boolean;
        /** Épargne adossée à un compte : valeur masquée, elle suit le solde. */
        valueFromAccount?: boolean;
        /** Comptes liables pour une épargne (option « aucun » incluse). */
        accountItems?: { title: string; value: string }[];
        fieldErrors?: AssetFieldErrors;
        currencyHint?: string | null;
    }>(),
    {
        typeLocked: false,
        allowRealEstate: false,
        valueFromAccount: false,
        accountItems: () => [],
        fieldErrors: () => ({}),
        currencyHint: null
    }
);

const { t } = useI18n();

const typeItems = computed(() =>
    ASSET_TYPES.filter((type) => type !== 'immobilier' || props.allowRealEstate || props.form.type === 'immobilier').map((value) => ({
        title: t(`assetsPage.types.${value}`),
        value
    }))
);

const currencyItems = computed(() => ASSET_CURRENCIES.map((value) => ({ title: value, value })));
const currencySuffix = computed(() => props.form.currency || undefined);

const acquisitionDateModel = computed({
    get: () => props.form.acquisitionDate,
    set: (value: string | null) => {
        props.form.acquisitionDate = value;
    }
});

const err = (key: string) => props.fieldErrors[key] || undefined;
</script>

<template>
    <div class="asset-form">
        <AssetFormRow :label="t('assetsPage.form.fields.name')" for-id="asset-form-name" required>
            <v-text-field
                id="asset-form-name"
                v-model="form.name"
                color="primary"
                variant="outlined"
                hide-details="auto"
                :maxlength="ASSET_NAME_MAX"
                :error="!!err('name')"
                :error-messages="err('name')"
            />
        </AssetFormRow>

        <AssetFormRow
            :label="t('assetsPage.form.fields.type')"
            for-id="asset-form-type"
            required
            :hint="typeLocked && isEdit ? t('assetsPage.form.typeLockedHint') : null"
        >
            <AppSelect
                id="asset-form-type"
                v-model="form.type"
                :items="typeItems"
                :label="t('assetsPage.form.fields.type')"
                :disabled="typeLocked"
                hide-details="auto"
                :error="!!err('type')"
                :error-messages="err('type')"
            />
        </AssetFormRow>

        <AssetFormRow
            v-if="!valueFromAccount"
            :label="t('assetsPage.form.fields.estimatedValue')"
            for-id="asset-form-value"
            :hint="t('assetsPage.form.estimatedValueHint')"
        >
            <v-text-field
                id="asset-form-value"
                v-model="form.estimatedValue"
                type="number"
                step="0.01"
                min="0"
                :suffix="currencySuffix"
                color="primary"
                variant="outlined"
                hide-details="auto"
                :error="!!err('estimatedValue')"
                :error-messages="err('estimatedValue')"
            />
        </AssetFormRow>
        <AssetFormRow v-else :label="t('assetsPage.form.fields.estimatedValue')">
            <p class="asset-form__readonly">{{ t('assetsPage.form.valueFromAccountHint') }}</p>
        </AssetFormRow>

        <AssetFormRow :label="t('assetsPage.form.fields.currency')" for-id="asset-form-currency" :hint="currencyHint">
            <AppSelect
                id="asset-form-currency"
                v-model="form.currency"
                :items="currencyItems"
                :label="t('assetsPage.form.fields.currency')"
                :disabled="isEdit"
                hide-details="auto"
                :error="!!err('currency')"
                :error-messages="err('currency')"
            />
        </AssetFormRow>

        <div v-if="form.type" class="asset-form__section">
            <p class="asset-form__section-title">{{ t(`assetsPage.types.${form.type}`) }}</p>
            <VehicleDetailsFields v-if="form.type === 'vehicule'" :fields="form.vehicle" :errors="fieldErrors" />
            <CryptoDetailsFields
                v-else-if="form.type === 'crypto'"
                :fields="form.crypto"
                :errors="fieldErrors"
                :currency="form.currency || null"
            />
            <ValuableItemDetailsFields
                v-else-if="form.type === 'objetValeur'"
                :fields="form.valuableItem"
                :errors="fieldErrors"
                :currency="form.currency || null"
            />
            <SavingsAccountDetailsFields
                v-else-if="form.type === 'compteEpargne'"
                :fields="form.savingsAccount"
                :account-items="accountItems"
                :errors="fieldErrors"
            />
            <RealEstateDetailsFields
                v-else-if="form.type === 'immobilier'"
                :fields="form.realEstate"
                :errors="fieldErrors"
                :currency="form.currency || null"
            />
            <OtherDetailsFields v-else :fields="form.other" />
        </div>

        <div class="asset-form__section">
            <AssetFormRow :label="t('assetsPage.form.fields.acquisitionDate')" :error="err('acquisitionDate')">
                <AppDatePicker v-model="acquisitionDateModel" :label="t('assetsPage.form.fields.acquisitionDate')" clearable />
            </AssetFormRow>
            <AssetFormRow :label="t('assetsPage.form.fields.acquisitionPrice')" for-id="asset-form-price">
                <v-text-field
                    id="asset-form-price"
                    v-model="form.acquisitionPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    :suffix="currencySuffix"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error="!!err('acquisitionPrice')"
                    :error-messages="err('acquisitionPrice')"
                />
            </AssetFormRow>
            <AssetFormRow :label="t('assetsPage.form.fields.description')" for-id="asset-form-description">
                <v-text-field
                    id="asset-form-description"
                    v-model="form.description"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :maxlength="ASSET_DESCRIPTION_MAX"
                    :error="!!err('description')"
                    :error-messages="err('description')"
                />
            </AssetFormRow>
            <AssetFormRow :label="t('assetsPage.form.fields.notes')" for-id="asset-form-notes">
                <v-textarea
                    id="asset-form-notes"
                    v-model="form.notes"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    rows="3"
                    auto-grow
                    :maxlength="ASSET_NOTES_MAX"
                    :error="!!err('notes')"
                    :error-messages="err('notes')"
                />
            </AssetFormRow>
            <AssetFormRow
                v-if="isEdit"
                :label="t('assetsPage.form.fields.sold')"
                for-id="asset-form-sold"
                :hint="t('assetsPage.form.soldHint')"
            >
                <AppSwitch id="asset-form-sold" v-model="form.sold" />
            </AssetFormRow>
        </div>
    </div>
</template>

<style scoped>
.asset-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

/* bloc de champs séparé par un filet fin, intitulé 13 px gris */
.asset-form__section {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 8px;
    padding-top: 16px;
    border-top: 1px solid var(--line);
}

.asset-form__section-title {
    margin: 0;
    color: var(--gray);
    font-size: 13px;
}

.asset-form__readonly {
    margin: 0;
    color: var(--gray);
    font-size: 14px;
    line-height: 1.4;
}
</style>
