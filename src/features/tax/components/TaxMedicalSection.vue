<script setup lang="ts">
/** « Frais médicaux de l'année » : brut, remboursé, à charge. Information seulement : le seuil de déduction dépend du canton. */
defineOptions({ name: 'TaxMedicalSection' });

import { useI18n } from 'vue-i18n';
import { useTaxMoney } from '@/features/tax/composables/useTaxMoney';
import type { TaxMedical } from '@/features/tax/types';

defineProps<{
    data: TaxMedical;
}>();

const { t } = useI18n();
const money = useTaxMoney();
</script>

<template>
    <section class="tax-form" data-test="tax-medical">
        <h2 class="tax-form__legend">{{ t('taxPage.medical.title', { year: data.year }) }}</h2>
        <p class="tax-muted">{{ t('taxPage.medical.hint') }}</p>
        <p class="tax-fiche__title" data-test="tax-medical-net">
            {{ t('taxPage.medical.summary', { gross: money(data.gross), reimbursed: money(data.reimbursed), net: money(data.net) }) }}
        </p>
        <ul v-if="data.invoices.length" class="tax-pillar3a__list">
            <li v-for="item in data.invoices" :key="item.transactionPublicId">
                {{ item.label }} · {{ money(item.amount) }}
                <span class="tax-muted">({{ t('taxPage.medical.reimbursedLine', { amount: money(item.reimbursed) }) }})</span>
            </li>
        </ul>
        <p v-else class="tax-muted">{{ t('taxPage.medical.none') }}</p>
        <p v-if="data.unlinkedReimbursements.length" class="tax-muted">
            {{ t('taxPage.medical.unlinked', { count: data.unlinkedReimbursements.length }) }}
        </p>
    </section>
</template>
