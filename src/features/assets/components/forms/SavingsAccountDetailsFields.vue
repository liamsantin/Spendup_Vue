<script setup lang="ts">
/**
 * Détail épargne : type, compte lié (la valeur suit alors son solde), taux, fonds bloqués, libération.
 * `fields` est détenu par le formulaire parent ; `accountItems` contient déjà l’option « aucun ».
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'SavingsAccountDetailsFields' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { SAVINGS_TYPES } from '@/features/assets/types';
import type { SavingsAccountFormFields } from '@/features/assets/payload';
import AssetFormRow from '@/features/assets/components/forms/AssetFormRow.vue';
import type { AssetFieldErrors } from '@/features/assets/components/forms/asset-form-errors';

const props = withDefaults(
    defineProps<{
        fields: SavingsAccountFormFields;
        accountItems: { title: string; value: string }[];
        errors?: AssetFieldErrors;
    }>(),
    { errors: () => ({}) }
);

const { t } = useI18n();

const typeItems = computed(() => SAVINGS_TYPES.map((value) => ({ title: t(`assetsPage.savingsTypes.${value}`), value })));

const releaseDateModel = computed({
    get: () => props.fields.releaseDate,
    set: (value: string | null) => {
        props.fields.releaseDate = value;
    }
});

const err = (key: string) => props.errors[`savingsAccount.${key}`] || undefined;
</script>

<template>
    <AssetFormRow :label="t('assetsPage.form.fields.savingsType')" for-id="asset-savings-type" required>
        <AppSelect
            id="asset-savings-type"
            v-model="fields.savingsType"
            :items="typeItems"
            :label="t('assetsPage.form.fields.savingsType')"
            hide-details="auto"
            :error="!!err('savingsType')"
            :error-messages="err('savingsType')"
        />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.account')" for-id="asset-savings-account" :hint="t('assetsPage.form.accountHint')">
        <AppSelect
            id="asset-savings-account"
            v-model="fields.accountPublicId"
            :items="accountItems"
            :label="t('assetsPage.form.fields.account')"
            searchable
            hide-details="auto"
            :error="!!err('accountPublicId')"
            :error-messages="err('accountPublicId')"
        />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.interestRate')" for-id="asset-savings-rate">
        <v-text-field
            id="asset-savings-rate"
            v-model="fields.interestRate"
            inputmode="decimal"
            suffix="%"
            color="primary"
            variant="outlined"
            hide-details="auto"
            :error="!!err('interestRate')"
            :error-messages="err('interestRate')"
        />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.isBlocked')" for-id="asset-savings-blocked">
        <AppSwitch id="asset-savings-blocked" v-model="fields.isBlocked" />
    </AssetFormRow>
    <AssetFormRow :label="t('assetsPage.form.fields.releaseDate')" :error="err('releaseDate')">
        <AppDatePicker v-model="releaseDateModel" :label="t('assetsPage.form.fields.releaseDate')" clearable />
    </AssetFormRow>
</template>
