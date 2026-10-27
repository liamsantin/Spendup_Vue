<script setup lang="ts">
/**
 * Détail du bien immobilier (`realEstate` plat de la requête d’actif) : type, adresse, pays (2 lettres
 * majuscules), surfaces, pièces, étage, 4 équipements, années et valeur fiscale (informative).
 * `fields` est détenu par le formulaire parent.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'RealEstateDetailsFields' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { PROPERTY_TYPES } from '@/features/assets/types';
import type { RealEstateFormFields } from '@/features/assets/payload';
import AssetFormRow from '@/features/assets/components/forms/AssetFormRow.vue';
import type { AssetFieldErrors } from '@/features/assets/components/forms/asset-form-errors';

const props = withDefaults(
    defineProps<{
        fields: RealEstateFormFields;
        errors?: AssetFieldErrors;
        currency?: string | null;
    }>(),
    { errors: () => ({}), currency: null }
);

const { t } = useI18n();

const typeItems = computed(() => PROPERTY_TYPES.map((value) => ({ title: t(`assetsPage.propertyTypes.${value}`), value })));

type NumericKey = 'livingAreaM2' | 'landAreaM2' | 'rooms' | 'bedrooms' | 'bathrooms' | 'floor' | 'constructionYear' | 'renovationYear';

const numericRows: { key: NumericKey; step: string; min?: string; suffix?: string; decimal?: boolean }[] = [
    { key: 'livingAreaM2', step: '0.01', min: '0', suffix: 'm²', decimal: true },
    { key: 'landAreaM2', step: '0.01', min: '0', suffix: 'm²', decimal: true },
    { key: 'rooms', step: '0.5', min: '0', decimal: true },
    { key: 'bedrooms', step: '1', min: '0' },
    { key: 'bathrooms', step: '1', min: '0' },
    { key: 'floor', step: '1' },
    { key: 'constructionYear', step: '1', min: '1800' },
    { key: 'renovationYear', step: '1', min: '1800' }
];

const switches = ['hasElevator', 'hasBalcony', 'hasCellar', 'hasGarage'] as const;

const err = (key: string) => props.errors[`realEstate.${key}`] || undefined;

function onCountryInput(value: string) {
    props.fields.country = value
        .replace(/[^a-zA-Z]/g, '')
        .slice(0, 2)
        .toUpperCase();
}
</script>

<template>
    <AssetFormRow :label="t('assetsPage.form.fields.propertyType')" for-id="asset-re-type" required>
        <AppSelect
            id="asset-re-type"
            v-model="fields.propertyType"
            :items="typeItems"
            :label="t('assetsPage.form.fields.propertyType')"
            hide-details="auto"
            :error="!!err('propertyType')"
            :error-messages="err('propertyType')"
        />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.addressLine1')" for-id="asset-re-address1">
        <v-text-field id="asset-re-address1" v-model="fields.addressLine1" color="primary" variant="outlined" hide-details="auto" />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.addressLine2')" for-id="asset-re-address2">
        <v-text-field id="asset-re-address2" v-model="fields.addressLine2" color="primary" variant="outlined" hide-details="auto" />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.postalCode')" for-id="asset-re-postal">
        <v-text-field id="asset-re-postal" v-model="fields.postalCode" color="primary" variant="outlined" hide-details="auto" />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.city')" for-id="asset-re-city">
        <v-text-field id="asset-re-city" v-model="fields.city" color="primary" variant="outlined" hide-details="auto" />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.country')" for-id="asset-re-country" :hint="t('assetsPage.form.countryHint')">
        <v-text-field
            id="asset-re-country"
            :model-value="fields.country"
            maxlength="2"
            color="primary"
            variant="outlined"
            hide-details="auto"
            :error="!!err('country')"
            :error-messages="err('country')"
            @update:model-value="onCountryInput"
        />
    </AssetFormRow>
    <AssetFormRow v-for="row in numericRows" :key="row.key" :label="t(`assetsPage.form.fields.${row.key}`)" :for-id="`asset-re-${row.key}`">
        <v-text-field
            :id="`asset-re-${row.key}`"
            v-model="fields[row.key]"
            :type="row.decimal ? 'text' : 'number'"
            :inputmode="row.decimal ? 'decimal' : 'numeric'"
            :step="row.step"
            :min="row.min"
            :suffix="row.suffix"
            color="primary"
            variant="outlined"
            hide-details="auto"
            :error="!!err(row.key)"
            :error-messages="err(row.key)"
        />
    </AssetFormRow>
    <AssetFormRow v-for="key in switches" :key="key" :label="t(`assetsPage.form.fields.${key}`)" :for-id="`asset-re-${key}`">
        <AppSwitch :id="`asset-re-${key}`" v-model="fields[key]" />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.taxValue')" for-id="asset-re-tax" :hint="t('assetsPage.form.taxValueHint')">
        <v-text-field
            id="asset-re-tax"
            v-model="fields.taxValue"
            type="number"
            step="0.01"
            min="0"
            :suffix="currency || undefined"
            color="primary"
            variant="outlined"
            hide-details="auto"
            :error="!!err('taxValue')"
            :error-messages="err('taxValue')"
        />
    </AssetFormRow>
</template>
