<script setup lang="ts">
/**
 * Détail « autre » : type personnalisé facultatif (vide = nom de l’actif).
 * `fields` est détenu par le formulaire parent.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'OtherDetailsFields' });

import { useI18n } from 'vue-i18n';
import type { OtherFormFields } from '@/features/assets/payload';
import AssetFormRow from '@/features/assets/components/forms/AssetFormRow.vue';

defineProps<{
    fields: OtherFormFields;
}>();

const { t } = useI18n();
</script>

<template>
    <AssetFormRow :label="t('assetsPage.form.fields.customType')" for-id="asset-other-type" :hint="t('assetsPage.form.customTypeHint')">
        <v-text-field id="asset-other-type" v-model="fields.customType" color="primary" variant="outlined" hide-details="auto" />
    </AssetFormRow>
</template>
