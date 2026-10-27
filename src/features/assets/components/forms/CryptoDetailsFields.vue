<script setup lang="ts">
/**
 * Détail crypto : nom, symbole (majuscules), quantité (jusqu’à 12 décimales), prix moyen, plateforme.
 * `fields` est détenu par le formulaire parent.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'CryptoDetailsFields' });

import { useI18n } from 'vue-i18n';
import type { CryptoFormFields } from '@/features/assets/payload';
import AssetFormRow from '@/features/assets/components/forms/AssetFormRow.vue';
import type { AssetFieldErrors } from '@/features/assets/components/forms/asset-form-errors';

const props = withDefaults(
    defineProps<{
        fields: CryptoFormFields;
        errors?: AssetFieldErrors;
        currency?: string | null;
    }>(),
    { errors: () => ({}), currency: null }
);

const { t } = useI18n();

const err = (key: string) => props.errors[`crypto.${key}`] || undefined;

function onSymbolInput(value: string) {
    props.fields.symbol = value.toUpperCase();
}
</script>

<template>
    <AssetFormRow :label="t('assetsPage.form.fields.cryptoName')" for-id="asset-crypto-name" required>
        <v-text-field
            id="asset-crypto-name"
            v-model="fields.name"
            color="primary"
            variant="outlined"
            hide-details="auto"
            :error="!!err('name')"
            :error-messages="err('name')"
        />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.symbol')" for-id="asset-crypto-symbol" required>
        <v-text-field
            id="asset-crypto-symbol"
            :model-value="fields.symbol"
            maxlength="20"
            color="primary"
            variant="outlined"
            hide-details="auto"
            :error="!!err('symbol')"
            :error-messages="err('symbol')"
            @update:model-value="onSymbolInput"
        />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.quantity')" for-id="asset-crypto-quantity" required>
        <v-text-field
            id="asset-crypto-quantity"
            v-model="fields.quantity"
            inputmode="decimal"
            color="primary"
            variant="outlined"
            hide-details="auto"
            :error="!!err('quantity')"
            :error-messages="err('quantity')"
        />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.averagePurchasePrice')" for-id="asset-crypto-average">
        <v-text-field
            id="asset-crypto-average"
            v-model="fields.averagePurchasePrice"
            type="number"
            step="0.01"
            min="0"
            :suffix="currency || undefined"
            color="primary"
            variant="outlined"
            hide-details="auto"
            :error="!!err('averagePurchasePrice')"
            :error-messages="err('averagePurchasePrice')"
        />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.platform')" for-id="asset-crypto-platform">
        <v-text-field id="asset-crypto-platform" v-model="fields.platform" color="primary" variant="outlined" hide-details="auto" />
    </AssetFormRow>
</template>
