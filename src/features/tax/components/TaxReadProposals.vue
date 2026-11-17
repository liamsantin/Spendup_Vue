<script setup lang="ts">
/**
 * Montants lus dans le PDF importé pour l'étape ouverte. Chaque ligne dit si un total imprimé la recoupe.
 * Le cas courant tient en un geste : « Accepter les lignes vérifiées ». Les lignes à vérifier restent à part.
 */
defineOptions({ name: 'TaxReadProposals' });

import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { useTaxMoney } from '@/features/tax/composables/useTaxMoney';
import type { TaxCheck, TaxSuggestion } from '@/features/tax/types';

const props = defineProps<{
    items: TaxSuggestion[];
    saving: boolean;
}>();

const emit = defineEmits<{
    accept: [item: TaxSuggestion];
    acceptMany: [items: TaxSuggestion[]];
}>();

const { t } = useI18n();
const money = useTaxMoney();

const keyOf = (item: TaxSuggestion) => `${item.code}|${item.person}|${item.competence}`;

/** Un montant sans contrôle connu (lecture enregistrée avant ce marquage) compte comme « à vérifier ». */
const checkOf = (item: TaxSuggestion): TaxCheck => item.check ?? 'toCheck';

const verified = computed(() => props.items.filter((item) => checkOf(item) === 'verified'));
const toCheck = computed(() => props.items.filter((item) => checkOf(item) === 'toCheck'));

const confirmOpen = ref(false);

function acceptAlerts() {
    confirmOpen.value = false;
    emit('acceptMany', [...toCheck.value]);
}
</script>

<template>
    <section class="tax-form">
        <h2 class="tax-form__legend">{{ t('taxPage.detectedTitle') }}</h2>
        <article v-for="item in items" :key="keyOf(item)" class="tax-fiche">
            <div>
                <p class="tax-fiche__title">
                    {{ item.label }}
                    <small v-if="item.person === '2'">{{ t('taxPage.review.spouse') }}</small>
                    <small v-if="item.competence !== 'both'">{{ t(`taxPage.${item.competence}`) }}</small>
                    <small class="tax-check" :class="`is-${checkOf(item)}`">{{ t(`taxPage.check.${checkOf(item)}`) }}</small>
                </p>
                <p class="tax-fiche__detail">{{ item.originLabel }}</p>
                <p v-if="item.previousAmount != null" class="tax-fiche__detail tax-check is-toCheck">
                    {{ t('taxPage.check.previousYear', { amount: money(item.previousAmount) }) }}
                </p>
            </div>
            <p class="tax-fiche__amount">{{ money(item.amount) }}</p>
            <button type="button" class="su-btn su-btn--ink" :disabled="saving" @click="emit('accept', item)">
                {{ t('taxPage.accept') }}
            </button>
        </article>
        <div v-if="verified.length > 1 || toCheck.length > 1" class="tax-form__actions">
            <button
                v-if="verified.length > 1"
                type="button"
                class="su-btn su-btn--ink"
                :disabled="saving"
                @click="emit('acceptMany', [...verified])"
            >
                {{ t('taxPage.acceptVerified', { count: verified.length }) }}
            </button>
            <button v-if="toCheck.length > 1" type="button" class="su-btn" :disabled="saving" @click="confirmOpen = true">
                {{ t('taxPage.acceptAlerts', { count: toCheck.length }) }}
            </button>
        </div>

        <AppConfirmationModal
            v-model="confirmOpen"
            :title="t('taxPage.acceptAlertsModal.title', { count: toCheck.length })"
            :message="t('taxPage.acceptAlertsModal.message')"
            :confirm-label="t('taxPage.acceptAlertsModal.confirm')"
            :loading="saving"
            @confirm="acceptAlerts"
        />
    </section>
</template>
