<script setup lang="ts">
/**
 * Ligne d'information « Provision d'impôts » des pages Mon mois et Prévisions. Elle n'entre dans aucun total : les tranches
 * et les paiements d'impôts y figurent déjà quand ils sont saisis. Rien ne s'affiche sans base de provision.
 */
defineOptions({ name: 'TaxProvisionNote' });

import { computed, onMounted, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatAccountBalance } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import { DASHBOARD_MASKED_AMOUNT } from '@/features/dashboard/format';
import { TAX_PROVISION_PATH } from '@/features/tax/paths';
import { hasProvision, taxProvisionApi, type TaxProvision } from '@/features/tax/provision';
import { useUserSettingsStore } from '@/features/user-settings/stores/user-settings-store';

const { t, locale } = useI18n();
const settings = useUserSettingsStore();
const provision = shallowRef<TaxProvision | null>(null);

const amount = computed(() => {
    const value = provision.value?.monthlyAmount ?? 0;
    if (settings.current.hideSensitiveAmounts) return DASHBOARD_MASKED_AMOUNT;
    return formatAccountBalance(value, (provision.value?.currency ?? 'CHF') as Currency, locale.value);
});

onMounted(async () => {
    try {
        provision.value = await taxProvisionApi.get();
    } catch {
        provision.value = null;
    }
});
</script>

<template>
    <p v-if="hasProvision(provision)" class="provision-note">
        {{ t('taxProvision.note', { amount }) }}
        <RouterLink :to="TAX_PROVISION_PATH" class="su-link">{{ t('taxProvision.noteLink') }}</RouterLink>
    </p>
</template>

<style scoped>
.provision-note {
    margin: 0;
    color: var(--gray);
    font-size: 0.875rem;
}
</style>
