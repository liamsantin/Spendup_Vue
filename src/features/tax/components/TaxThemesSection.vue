<script setup lang="ts">
/** Dons, garde, pensions, formation, transports : total de l'année par thème (natures confirmées) et pièce attendue. Information seulement. */
defineOptions({ name: 'TaxThemesSection' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTaxMoney } from '@/features/tax/composables/useTaxMoney';
import type { TaxThemes } from '@/features/tax/types';

const props = defineProps<{
    data: TaxThemes;
    /** Lignes de l'étape affichée : seuls les thèmes qui les alimentent sont montrés. */
    lines: string[];
}>();

const { t } = useI18n();
const money = useTaxMoney();
const items = computed(() => props.data.items.filter((item) => props.lines.includes(item.line)));
</script>

<template>
    <section class="tax-form" data-test="tax-themes">
        <h2 class="tax-form__legend">{{ t('taxPage.themes.title', { year: data.year }) }}</h2>
        <p class="tax-muted">{{ t('taxPage.themes.hint') }}</p>
        <article v-for="item in items" :key="item.nature" class="tax-fiche" :data-test="`tax-theme-${item.nature}`">
            <p class="tax-fiche__title">{{ t(`taxPage.themes.natures.${item.nature}`) }} · {{ money(item.total) }}</p>
            <ul v-if="item.transactions.length" class="tax-pillar3a__list">
                <li v-for="row in item.transactions" :key="row.transactionPublicId">{{ row.label }} · {{ money(row.amount) }}</li>
            </ul>
            <p v-else class="tax-muted">{{ t('taxPage.themes.empty') }}</p>
            <p v-if="item.documentExpected" class="tax-muted">{{ t('taxPage.themes.document', { label: item.documentExpected }) }}</p>
        </article>
    </section>
</template>
