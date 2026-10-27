<script setup lang="ts">
/**
 * Détail véhicule : marque, modèle, type, carburant, 1re mise en circulation, plaque, kilométrage.
 * `fields` est détenu par le formulaire parent.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'VehicleDetailsFields' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { VEHICLE_FUELS, VEHICLE_TYPES } from '@/features/assets/types';
import type { VehicleFormFields } from '@/features/assets/payload';
import AssetFormRow from '@/features/assets/components/forms/AssetFormRow.vue';
import type { AssetFieldErrors } from '@/features/assets/components/forms/asset-form-errors';

const props = withDefaults(
    defineProps<{
        fields: VehicleFormFields;
        errors?: AssetFieldErrors;
    }>(),
    { errors: () => ({}) }
);

const { t } = useI18n();

const typeItems = computed(() => VEHICLE_TYPES.map((value) => ({ title: t(`assetsPage.vehicleTypes.${value}`), value })));
const fuelItems = computed(() => [
    { title: t('assetsPage.form.noFuel'), value: '' },
    ...VEHICLE_FUELS.map((value) => ({ title: t(`assetsPage.fuels.${value}`), value }))
]);

const err = (key: string) => props.errors[`vehicle.${key}`] || undefined;
</script>

<template>
    <AssetFormRow :label="t('assetsPage.form.fields.brand')" for-id="asset-vehicle-brand" required>
        <v-text-field
            id="asset-vehicle-brand"
            v-model="fields.brand"
            color="primary"
            variant="outlined"
            hide-details="auto"
            :error="!!err('brand')"
            :error-messages="err('brand')"
        />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.model')" for-id="asset-vehicle-model" required>
        <v-text-field
            id="asset-vehicle-model"
            v-model="fields.model"
            color="primary"
            variant="outlined"
            hide-details="auto"
            :error="!!err('model')"
            :error-messages="err('model')"
        />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.vehicleType')" for-id="asset-vehicle-type" required>
        <AppSelect
            id="asset-vehicle-type"
            v-model="fields.vehicleType"
            :items="typeItems"
            :label="t('assetsPage.form.fields.vehicleType')"
            hide-details="auto"
            :error="!!err('vehicleType')"
            :error-messages="err('vehicleType')"
        />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.fuel')" for-id="asset-vehicle-fuel">
        <AppSelect
            id="asset-vehicle-fuel"
            v-model="fields.fuel"
            :items="fuelItems"
            :label="t('assetsPage.form.fields.fuel')"
            hide-details="auto"
            :error="!!err('fuel')"
            :error-messages="err('fuel')"
        />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.firstRegistrationYear')" for-id="asset-vehicle-year">
        <v-text-field
            id="asset-vehicle-year"
            v-model="fields.firstRegistrationYear"
            type="number"
            step="1"
            min="1800"
            color="primary"
            variant="outlined"
            hide-details="auto"
            :error="!!err('firstRegistrationYear')"
            :error-messages="err('firstRegistrationYear')"
        />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.plate')" for-id="asset-vehicle-plate">
        <v-text-field id="asset-vehicle-plate" v-model="fields.plate" color="primary" variant="outlined" hide-details="auto" />
    </AssetFormRow>
    <AssetFormRow
        :label="t('assetsPage.form.fields.currentMileage')"
        for-id="asset-vehicle-mileage"
        :hint="fields.currentMileage.trim() ? t('assetsPage.form.mileageHint') : null"
    >
        <v-text-field
            id="asset-vehicle-mileage"
            v-model="fields.currentMileage"
            type="number"
            step="1"
            min="0"
            suffix="km"
            color="primary"
            variant="outlined"
            hide-details="auto"
            :error="!!err('currentMileage')"
            :error-messages="err('currentMileage')"
        />
    </AssetFormRow>
</template>
