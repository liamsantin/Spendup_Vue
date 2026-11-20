<script setup lang="ts">
/**
 * Saisie guidée des totaux : les grandes lignes de la déclaration en un écran, pour un PDF illisible (scan, photo,
 * formulaire non reconnu) ou une déclaration qu'on veut juste esquisser. Une ligne canton / Confédération reçoit le
 * même montant des deux côtés ; le détail se complète ensuite étape par étape.
 */
defineOptions({ name: 'TaxTotalsEntry' });

import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { TaxAmountItem } from '@/features/tax/api';
import { buildGuidedItems, guidedLines, parseGuidedAmount } from '@/features/tax/guided-totals';
import type { TaxLine, TaxPerson } from '@/features/tax/types';

const props = defineProps<{
    lines: TaxLine[];
    couple: boolean;
    saving: boolean;
    /** Le PDF importé n'a pas pu être lu : le texte d'introduction le dit. */
    unreadImport: boolean;
}>();

const emit = defineEmits<{
    submit: [items: TaxAmountItem[]];
    dismiss: [];
}>();

const { t } = useI18n();

const PERSONS: TaxPerson[] = ['1', '2', '1+2'];
const person = ref<TaxPerson>('1');
const values = reactive<Record<string, string>>({});

/** Lignes du formulaire guidé, dans l'ordre de la déclaration. */
const fields = computed(() => guidedLines(props.lines));

const parse = parseGuidedAmount;
const invalid = computed(() => fields.value.some((line) => parse(values[line.code]) === undefined));
const items = computed(() => buildGuidedItems(fields.value, values, person.value));

function submit() {
    if (props.saving || invalid.value || !items.value.length) return;
    emit('submit', items.value);
}
</script>

<template>
    <section class="tax-form tax-totals-entry" :aria-label="t('taxPage.guided.title')">
        <h2 class="tax-form__legend">{{ t('taxPage.guided.title') }}</h2>
        <p class="tax-muted">{{ unreadImport ? t('taxPage.guided.introUnread') : t('taxPage.guided.intro') }}</p>
        <div v-if="couple" class="tax-form__row">
            <span class="tax-form__label">{{ t('taxPage.person') }}</span>
            <div class="tax-form__field tax-form__actions">
                <button
                    v-for="value in PERSONS"
                    :key="value"
                    type="button"
                    class="su-btn"
                    :class="{ 'su-btn--ink': person === value }"
                    :aria-pressed="person === value"
                    @click="person = value"
                >
                    {{ value === '1+2' ? t('taxPage.persons.both') : t(`taxPage.persons.${value}`) }}
                </button>
            </div>
        </div>
        <form class="tax-form tax-form--modal" @submit.prevent="submit">
            <div v-for="line in fields" :key="line.code" class="tax-form__row tax-line">
                <label class="tax-form__label" :for="`tax-guided-${line.code}`">
                    {{ line.label }}
                    <small v-if="line.splitsCompetence" class="tax-line__hint">{{ t('taxPage.guided.both') }}</small>
                </label>
                <div class="tax-form__field">
                    <v-text-field
                        :id="`tax-guided-${line.code}`"
                        v-model="values[line.code]"
                        :placeholder="t('taxPage.emptyCell')"
                        :error="parse(values[line.code]) === undefined"
                        color="primary"
                        variant="outlined"
                        hide-details
                    />
                </div>
            </div>
            <div class="tax-form__actions">
                <button type="submit" class="su-btn su-btn--ink" :disabled="saving || invalid || !items.length">
                    {{ t('taxPage.guided.submit', { count: items.length }, items.length) }}
                </button>
                <button type="button" class="su-btn su-btn--ghost" :disabled="saving" @click="emit('dismiss')">
                    {{ t('taxPage.guided.dismiss') }}
                </button>
            </div>
        </form>
    </section>
</template>
