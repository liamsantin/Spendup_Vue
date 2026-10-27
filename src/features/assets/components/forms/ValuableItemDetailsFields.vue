<script setup lang="ts">
/**
 * Détail objet de valeur : type, marque, modèle, assurance (valeur assurée si assuré).
 * `fields` est détenu par le formulaire parent.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'ValuableItemDetailsFields' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { VALUABLE_ITEM_TYPES } from '@/features/assets/types';
import type { ValuableItemFormFields } from '@/features/assets/payload';
import AssetFormRow from '@/features/assets/components/forms/AssetFormRow.vue';
import type { AssetFieldErrors } from '@/features/assets/components/forms/asset-form-errors';

const props = withDefaults(
    defineProps<{
        fields: ValuableItemFormFields;
        errors?: AssetFieldErrors;
        currency?: string | null;
    }>(),
    { errors: () => ({}), currency: null }
);

const { t } = useI18n();

const typeItems = computed(() => VALUABLE_ITEM_TYPES.map((value) => ({ title: t(`assetsPage.valuableItemTypes.${value}`), value })));

const err = (key: string) => props.errors[`valuableItem.${key}`] || undefined;
</script>

<template>
    <AssetFormRow :label="t('assetsPage.form.fields.itemType')" for-id="asset-valuable-type" required>
        <AppSelect
            id="asset-valuable-type"
            v-model="fields.itemType"
            :items="typeItems"
            :label="t('assetsPage.form.fields.itemType')"
            hide-details="auto"
            :error="!!err('itemType')"
            :error-messages="err('itemType')"
        />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.brand')" for-id="asset-valuable-brand">
        <v-text-field id="asset-valuable-brand" v-model="fields.brand" color="primary" variant="outlined" hide-details="auto" />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.model')" for-id="asset-valuable-model">
        <v-text-field id="asset-valuable-model" v-model="fields.model" color="primary" variant="outlined" hide-details="auto" />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.isInsured')" for-id="asset-valuable-insured">
        <AppSwitch id="asset-valuable-insured" v-model="fields.isInsured" />
    </AssetFormRow>
    <AssetFormRow v-if="fields.isInsured" :label="t('assetsPage.form.fields.insuredValue')" for-id="asset-valuable-insured-value">
        <v-text-field
            id="asset-valuable-insured-value"
            v-model="fields.insuredValue"
            type="number"
            step="0.01"
            min="0"
            :suffix="currency || undefined"
            color="primary"
            variant="outlined"
            hide-details="auto"
            :error="!!err('insuredValue')"
            :error-messages="err('insuredValue')"
        />
    </AssetFormRow>
</template>
