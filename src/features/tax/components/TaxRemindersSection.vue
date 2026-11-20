<script setup lang="ts">
/** Rappels du dossier : natures à confirmer, pièces manquantes, 3e pilier en fin d'année. Calculés à la demande, aucune notification. */
defineOptions({ name: 'TaxRemindersSection' });

import { useI18n } from 'vue-i18n';
import { useTaxMoney } from '@/features/tax/composables/useTaxMoney';
import type { TaxReminder } from '@/features/tax/types';
import { formatTaxDate } from '@/features/tax/format';

defineProps<{
    items: TaxReminder[];
}>();

const { t, locale } = useI18n();
const money = useTaxMoney();
</script>

<template>
    <section class="tax-form" data-test="tax-reminders">
        <h2 class="tax-form__legend">{{ t('taxPage.reminders.title') }}</h2>
        <ul class="tax-pillar3a__list">
            <li v-for="item in items" :key="`${item.code}-${item.line ?? ''}`" :data-test="`tax-reminder-${item.code}`">
                <template v-if="item.code === 'unconfirmedNatures'">
                    {{ t('taxPage.reminders.unconfirmedNatures', { count: item.count, amount: money(item.amount) }, item.count) }}
                </template>
                <template v-else-if="item.code === 'missingDocument'">
                    {{ t('taxPage.reminders.missingDocument', { label: item.label ?? '', amount: money(item.amount) }) }}
                </template>
                <template v-else-if="item.code === 'deadlineSoon' || item.code === 'deadlineOverdue'">
                    {{
                        t(`taxPage.reminders.${item.code}`, {
                            label: item.label ?? '',
                            date: formatTaxDate(item.dueDate ?? null, locale),
                            amount: money(item.amount)
                        })
                    }}
                </template>
                <template v-else-if="item.code === 'pillar3aYearEnd'">
                    {{ t('taxPage.reminders.pillar3aYearEnd', { amount: money(item.amount) }) }}
                </template>
            </li>
        </ul>
    </section>
</template>
