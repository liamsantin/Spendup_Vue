<script setup lang="ts">
/** Sous-totaux de la personne affichée, une carte par ressort (canton / Confédération). */
defineOptions({ name: 'TaxSubtotals' });

import { useI18n } from 'vue-i18n';
import { useTaxMoney } from '@/features/tax/composables/useTaxMoney';
import type { TaxSubtotal } from '@/features/tax/types';

defineProps<{ rows: TaxSubtotal[] }>();

const { t } = useI18n();
const money = useTaxMoney();
</script>

<template>
    <section class="tax-totals">
        <h2>{{ t('taxPage.subtotals') }}</h2>
        <article v-for="row in rows" :key="row.competence" class="tax-card">
            <h3 class="tax-card__name">{{ t(`taxPage.${row.competence}`) }}</h3>
            <div class="su-kv">
                <span>{{ t('taxPage.income') }}</span
                ><span>{{ money(row.income) }}</span>
            </div>
            <div class="su-kv">
                <span>{{ t('taxPage.deductions') }}</span
                ><span>{{ money(row.deductions) }}</span>
            </div>
            <div class="su-kv su-kv--strong">
                <span>{{ t('taxPage.netIncome') }}</span
                ><span>{{ money(row.netIncome) }}</span>
            </div>
            <div class="su-kv">
                <span>{{ t('taxPage.assets') }}</span
                ><span>{{ money(row.assets) }}</span>
            </div>
            <div class="su-kv">
                <span>{{ t('taxPage.liabilities') }}</span
                ><span>{{ money(row.liabilities) }}</span>
            </div>
            <div class="su-kv su-kv--strong">
                <span>{{ t('taxPage.netAssets') }}</span
                ><span>{{ money(row.netAssets) }}</span>
            </div>
        </article>
    </section>
</template>
