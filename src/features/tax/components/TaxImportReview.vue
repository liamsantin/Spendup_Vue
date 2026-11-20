<script setup lang="ts">
/**
 * Vérification d'une déclaration lue dans un PDF (lecture 100 % locale) : montants proposés, avec leur origine,
 * contrôle des totaux imprimés sur le formulaire, et lignes lues sans équivalent dans l'application.
 */
defineOptions({ name: 'TaxImportReview' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { scopeMismatch, type ReadScope } from '@/features/tax/read-checks';
import type { ReadLine, TotalCheck } from '@/features/tax/reader/types';
import type { TaxSuggestion } from '@/features/tax/types';

const props = defineProps<{
    profileLabel: string;
    /** Canton et année du formulaire lu. */
    scope?: ReadScope;
    /** Canton et année de la déclaration ouverte. */
    canton: string;
    year: number;
    items: TaxSuggestion[];
    totals: TotalCheck[];
    unmapped: ReadLine[];
}>();

const emit = defineEmits<{
    dismiss: [];
}>();

const { t, locale } = useI18n();

const checked = computed(() => props.totals.filter((total) => total.status !== 'missing'));
const okCount = computed(() => checked.value.filter((total) => total.status === 'ok').length);
const mismatches = computed(() => props.totals.filter((total) => total.status === 'mismatch'));
const wrongForm = computed(() => scopeMismatch(props.scope, props.canton, props.year));
const verifiedCount = computed(() => props.items.filter((item) => item.check === 'verified').length);
const toCheckCount = computed(() => props.items.length - verifiedCount.value);
const anomalies = computed(() => props.items.filter((item) => item.previousAmount != null).length);

function money(value: number) {
    return new Intl.NumberFormat(locale.value, { style: 'currency', currency: 'CHF' }).format(value);
}
</script>

<template>
    <section class="tax-review">
        <header class="tax-review__head">
            <h2 class="tax-review__title">{{ t('taxPage.review.title', { profile: profileLabel }) }}</h2>
            <button type="button" class="su-btn su-btn--ghost" @click="emit('dismiss')">{{ t('taxPage.review.dismiss') }}</button>
        </header>

        <p v-if="wrongForm && scope" class="tax-review__checks is-warn" role="alert">
            {{ t('taxPage.review.wrongForm', { formCanton: scope.canton, formYear: scope.year, canton, year }) }}
        </p>

        <p v-if="checked.length" class="tax-review__checks" :class="{ 'is-warn': mismatches.length }">
            {{ t('taxPage.review.checks', { ok: okCount, n: checked.length }, checked.length) }}
            <template v-if="mismatches.length">
                {{ t('taxPage.review.mismatch', { lines: mismatches.map((total) => total.label).join(', ') }) }}
            </template>
        </p>

        <p class="tax-review__muted">
            {{ items.length ? t('taxPage.review.detected', { count: items.length }, items.length) : t('taxPage.review.none') }}
            <template v-if="items.length">
                {{ t('taxPage.review.split', { verified: verifiedCount, toCheck: toCheckCount }) }}
            </template>
        </p>

        <p v-if="anomalies" class="tax-review__checks is-warn">
            {{ t('taxPage.review.previousYear', { count: anomalies }, anomalies) }}
        </p>

        <details v-if="unmapped.length" class="tax-review__unmapped">
            <summary>{{ t('taxPage.review.unmapped', { count: unmapped.length }) }}</summary>
            <ul class="tax-review__list">
                <li v-for="line in unmapped" :key="`${line.code}|${line.person}`" class="tax-review__row">
                    <span class="tax-review__label">{{ line.label }}</span>
                    <span class="tax-review__origin">{{ t('taxPage.review.code', { code: line.code, page: line.page }) }}</span>
                    <span class="tax-review__amount">{{ money(line.amount) }}</span>
                </li>
            </ul>
        </details>
    </section>
</template>

<style scoped>
.tax-review {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 0;
    margin-bottom: 8px;
    border-bottom: 1px solid var(--line);
}

.tax-review__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.tax-review__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
}

.tax-review__checks,
.tax-review__muted,
.tax-review__origin {
    margin: 0;
    font-size: 13px;
    color: var(--ink-3, var(--ink));
    opacity: 0.8;
}

.tax-review__checks.is-warn {
    color: var(--danger, #b3261e);
    opacity: 1;
}

.tax-review__list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.tax-review__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 16px;
    padding: 10px 0;
    border-top: 1px solid var(--line);
}

.tax-review__check {
    display: flex;
    flex: 1 1 260px;
    align-items: center;
    gap: 10px;
    cursor: pointer;
}

.tax-review__label {
    flex: 1 1 260px;
}

.tax-review__label small {
    margin-left: 6px;
    opacity: 0.7;
}

.tax-review__amount {
    margin-left: auto;
    font-variant-numeric: tabular-nums;
}

.tax-review__actions {
    display: flex;
    justify-content: flex-end;
}

.tax-review__unmapped summary {
    cursor: pointer;
    font-size: 13px;
}
</style>
