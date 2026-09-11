<script setup lang="ts">
defineOptions({ name: 'AppAmountRangeFields' });

import { useI18n } from 'vue-i18n';

const min = defineModel<string>('min', { default: '' });
const max = defineModel<string>('max', { default: '' });

const { t } = useI18n();
</script>

<template>
    <div class="app-amount-range">
        <v-text-field
            v-model="min"
            :label="t('common.minAmount')"
            color="primary"
            variant="outlined"
            hide-details
            density="comfortable"
            inputmode="decimal"
            autocomplete="off"
        />
        <v-text-field
            v-model="max"
            :label="t('common.maxAmount')"
            color="primary"
            variant="outlined"
            hide-details
            density="comfortable"
            inputmode="decimal"
            autocomplete="off"
        />
    </div>
</template>

<style scoped>
.app-amount-range {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}
</style>
