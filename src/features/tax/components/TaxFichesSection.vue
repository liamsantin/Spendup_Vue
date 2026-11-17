<script setup lang="ts">
/** Fiches répétées (enfants, emplois, immeubles, dettes, établissements) de l'étape ouverte. */
defineOptions({ name: 'TaxFichesSection' });

import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTaxMoney } from '@/features/tax/composables/useTaxMoney';
import type { TaxEntry, TaxEntryKind, TaxPerson } from '@/features/tax/types';

export interface TaxFicheDraft {
    title: string;
    detail: string;
    amount: string;
    secondary: string;
}

const props = defineProps<{
    kinds: TaxEntryKind[];
    /** Toutes les fiches de la déclaration ; la personne affichée filtre. */
    entries: TaxEntry[];
    person: TaxPerson;
    saving: boolean;
    /** Enregistre une fiche ; `true` si elle l'est (le brouillon est alors vidé). */
    add: (kind: TaxEntryKind, draft: TaxFicheDraft) => Promise<boolean>;
}>();

const emit = defineEmits<{
    remove: [entryPublicId: string];
    report: [kind: TaxEntryKind];
}>();

const { t } = useI18n();
const money = useTaxMoney();

const drafts = ref<Record<string, TaxFicheDraft>>({});

function draftOf(kind: string): TaxFicheDraft {
    if (!drafts.value[kind]) {
        drafts.value[kind] = { title: '', detail: '', amount: '', secondary: '' };
    }
    return drafts.value[kind];
}

function entriesOf(kind: TaxEntryKind) {
    return props.entries.filter((entry) => entry.kind === kind && entry.person === props.person);
}

function amountLabel(kind: TaxEntryKind): string {
    if (kind === 'employment') return t('taxPage.fiches.employmentAmount');
    if (kind === 'property') return t('taxPage.fiches.propertyAmount');
    if (kind === 'debt') return t('taxPage.fiches.debtAmount');
    if (kind === 'institution') return t('taxPage.fiches.institutionAmount');
    return t('taxPage.fiches.amount');
}

function secondaryLabel(kind: TaxEntryKind): string {
    if (kind === 'property') return t('taxPage.fiches.propertyIncome');
    if (kind === 'debt') return t('taxPage.fiches.debtInterest');
    if (kind === 'institution') return t('taxPage.fiches.institutionIncome');
    return '';
}

async function submit(kind: TaxEntryKind) {
    const draft = draftOf(kind);
    if (await props.add(kind, draft)) {
        draft.title = '';
        draft.detail = '';
        draft.amount = '';
        draft.secondary = '';
    }
}
</script>

<template>
    <div class="tax-fiches">
        <section v-for="kind in kinds" :key="kind" class="tax-form">
            <h2 class="tax-form__legend">{{ t(`taxPage.fiches.${kind}`) }}</h2>
            <article v-for="entry in entriesOf(kind)" :key="entry.publicId" class="tax-fiche">
                <div>
                    <p class="tax-fiche__title">{{ entry.title }}</p>
                    <p v-if="entry.detail" class="tax-fiche__detail">{{ entry.detail }}</p>
                </div>
                <p v-if="entry.amount != null" class="tax-fiche__amount">{{ money(entry.amount) }}</p>
                <p v-if="entry.secondaryAmount != null" class="tax-fiche__amount">{{ money(entry.secondaryAmount) }}</p>
                <button type="button" class="su-btn" :disabled="saving" @click="emit('remove', entry.publicId)">
                    {{ t('taxPage.fiches.remove') }}
                </button>
            </article>
            <form class="tax-form" @submit.prevent="submit(kind)">
                <div class="tax-form__row">
                    <label class="tax-form__label">{{ t('taxPage.fiches.title') }}</label>
                    <div class="tax-form__field">
                        <v-text-field v-model="draftOf(kind).title" color="primary" variant="outlined" hide-details />
                    </div>
                </div>
                <div class="tax-form__row">
                    <label class="tax-form__label">{{ t('taxPage.fiches.detail') }}</label>
                    <div class="tax-form__field">
                        <v-text-field v-model="draftOf(kind).detail" color="primary" variant="outlined" hide-details />
                    </div>
                </div>
                <div v-if="kind !== 'child'" class="tax-form__row">
                    <label class="tax-form__label">{{ amountLabel(kind) }}</label>
                    <div class="tax-form__field">
                        <v-text-field v-model="draftOf(kind).amount" color="primary" variant="outlined" hide-details />
                    </div>
                </div>
                <div v-if="secondaryLabel(kind)" class="tax-form__row">
                    <label class="tax-form__label">{{ secondaryLabel(kind) }}</label>
                    <div class="tax-form__field">
                        <v-text-field v-model="draftOf(kind).secondary" color="primary" variant="outlined" hide-details />
                    </div>
                </div>
                <div class="tax-form__actions">
                    <button type="submit" class="su-btn" :disabled="saving">{{ t('taxPage.fiches.save') }}</button>
                    <button
                        v-if="kind !== 'child'"
                        type="button"
                        class="su-btn su-btn--ink"
                        :disabled="saving"
                        @click="emit('report', kind)"
                    >
                        {{ t('taxPage.fiches.report') }}
                    </button>
                </div>
            </form>
        </section>
    </div>
</template>
