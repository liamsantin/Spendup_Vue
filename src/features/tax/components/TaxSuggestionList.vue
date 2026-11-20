<script setup lang="ts">
/** Propositions de l'application (revenus récurrents, dettes, biens…) pour les cases vides de l'étape. */
defineOptions({ name: 'TaxSuggestionList' });

import { useI18n } from 'vue-i18n';
import { useTaxMoney } from '@/features/tax/composables/useTaxMoney';
import { taxSuggestionTargets } from '@/features/tax/paths';
import type { TaxSuggestion } from '@/features/tax/types';

defineProps<{
    items: TaxSuggestion[];
    saving: boolean;
}>();

const emit = defineEmits<{
    accept: [item: TaxSuggestion];
    /** Ouvre la fiche d'où vient la proposition. */
    see: [path: string];
}>();

const { t } = useI18n();
const money = useTaxMoney();
</script>

<template>
    <section class="tax-form">
        <h2 class="tax-form__legend">{{ t('taxPage.suggestionsTitle') }}</h2>
        <article v-for="item in items" :key="`${item.code}-${item.person}-${item.competence}`" class="tax-fiche">
            <div>
                <p class="tax-fiche__title">
                    {{ item.label }}
                    <small v-if="item.competence !== 'both'">{{ t(`taxPage.${item.competence}`) }}</small>
                </p>
                <p class="tax-fiche__detail">{{ item.originLabel }}</p>
            </div>
            <p class="tax-fiche__amount">{{ money(item.amount) }}</p>
            <button
                v-if="taxSuggestionTargets(item).length === 1"
                type="button"
                class="su-btn su-btn--ghost"
                :disabled="saving"
                @click="emit('see', taxSuggestionTargets(item)[0].path)"
            >
                {{ t('taxPage.see') }}
            </button>
            <v-menu v-else-if="taxSuggestionTargets(item).length > 1" location="bottom end" :offset="4">
                <template #activator="{ props: menuProps }">
                    <button v-bind="menuProps" type="button" class="su-btn su-btn--ghost" :disabled="saving">
                        {{ t('taxPage.see') }}
                    </button>
                </template>
                <v-sheet class="su-menu tax-actions-menu">
                    <button
                        v-for="target in taxSuggestionTargets(item)"
                        :key="target.path"
                        type="button"
                        class="su-menu-item"
                        @click="emit('see', target.path)"
                    >
                        <span class="su-menu-item__title">{{ target.name }}</span>
                    </button>
                </v-sheet>
            </v-menu>
            <button type="button" class="su-btn su-btn--ink" :disabled="saving" @click="emit('accept', item)">
                {{ t('taxPage.accept') }}
            </button>
        </article>
    </section>
</template>
