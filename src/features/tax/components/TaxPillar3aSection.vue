<script setup lang="ts">
/** « 3a de l'année » : versé, plafonds du canton (profil relu) et restant. Information seulement, jamais une déduction calculée. */
defineOptions({ name: 'TaxPillar3aSection' });

import { useI18n } from 'vue-i18n';
import { useTaxMoney } from '@/features/tax/composables/useTaxMoney';
import type { TaxPillar3a } from '@/features/tax/types';

defineProps<{
    data: TaxPillar3a;
}>();

const { t, locale } = useI18n();
const money = useTaxMoney();

function dateLabel(value: string): string {
    return new Intl.DateTimeFormat(locale.value).format(new Date(`${value}T00:00:00`));
}
</script>

<template>
    <section class="tax-form" data-test="tax-pillar3a">
        <h2 class="tax-form__legend">{{ t('taxPage.pillar3a.title', { year: data.year }) }}</h2>
        <p class="tax-muted">{{ t('taxPage.pillar3a.hint') }}</p>
        <p class="tax-fiche__title" data-test="tax-pillar3a-paid">{{ t('taxPage.pillar3a.paid', { amount: money(data.paid) }) }}</p>

        <ul v-if="data.contributions.length" class="tax-pillar3a__list">
            <li v-for="item in data.contributions" :key="item.transactionPublicId">
                {{ dateLabel(item.date) }} · {{ item.label }} · {{ money(item.amount) }}
                <span v-if="item.accountName" class="tax-muted">({{ item.accountName }})</span>
            </li>
        </ul>
        <p v-else class="tax-muted">{{ t('taxPage.pillar3a.none') }}</p>

        <ul v-if="data.limitsAvailable" class="tax-pillar3a__list" data-test="tax-pillar3a-limits">
            <li v-for="limit in data.limits" :key="limit.appliesTo">
                {{ t(`taxPage.pillar3a.appliesTo.${limit.appliesTo}`, limit.appliesTo) }} :
                <template v-if="limit.maxAmount != null">
                    {{ t('taxPage.pillar3a.limit', { max: money(limit.maxAmount), remaining: money(limit.remaining) }) }}
                </template>
                <template v-else>{{ t('taxPage.pillar3a.limitPercent', { percent: limit.percentOfIncome }) }}</template>
            </li>
        </ul>
        <p v-else class="tax-muted">{{ t('taxPage.pillar3a.noLimit') }}</p>
        <p class="tax-muted">{{ t('taxPage.pillar3a.certificate') }}</p>
    </section>
</template>
