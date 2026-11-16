<script setup lang="ts">
/**
 * Vérification d'une déclaration lue dans un PDF (lecture 100 % locale) : montants proposés, avec leur origine,
 * contrôle des totaux imprimés sur le formulaire, et lignes lues sans équivalent dans l'application.
 */
defineOptions({ name: 'TaxImportReview' });

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ReadLine, TotalCheck } from '@/features/tax/reader/types';
import type { TaxSuggestion } from '@/features/tax/types';

const props = defineProps<{
    profileLabel: string;
    items: TaxSuggestion[];
    totals: TotalCheck[];
    unmapped: ReadLine[];
    saving: boolean;
}>();

const emit = defineEmits<{
    accept: [items: TaxSuggestion[]];
    dismiss: [];
}>();

const { t, locale } = useI18n();

const itemKey = (item: TaxSuggestion) => `${item.code}|${item.person}|${item.competence}`;
const selected = ref<Set<string>>(new Set());
watch(
    () => props.items,
    (items) => {
        // tout est coché par défaut ; ce qui disparaît (accepté) quitte la sélection
        const keys = new Set(items.map(itemKey));
        const next = new Set([...selected.value].filter((key) => keys.has(key)));
        for (const key of keys) if (!selected.value.has(key) && !next.has(key)) next.add(key);
        selected.value = next;
    },
    { immediate: true }
);

const chosen = computed(() => props.items.filter((item) => selected.value.has(itemKey(item))));
const checked = computed(() => props.totals.filter((total) => total.status !== 'missing'));
const okCount = computed(() => checked.value.filter((total) => total.status === 'ok').length);
const mismatches = computed(() => props.totals.filter((total) => total.status === 'mismatch'));

function toggle(item: TaxSuggestion) {
    const next = new Set(selected.value);
    const key = itemKey(item);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    selected.value = next;
}

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

        <p v-if="checked.length" class="tax-review__checks" :class="{ 'is-warn': mismatches.length }">
            {{ t('taxPage.review.checks', { ok: okCount, n: checked.length }, checked.length) }}
            <template v-if="mismatches.length">
                {{ t('taxPage.review.mismatch', { lines: mismatches.map((total) => total.label).join(', ') }) }}
            </template>
        </p>

        <p v-if="!items.length" class="tax-review__muted">{{ t('taxPage.review.none') }}</p>
        <ul v-else class="tax-review__list">
            <li v-for="item in items" :key="itemKey(item)" class="tax-review__row">
                <label class="tax-review__check">
                    <input type="checkbox" :checked="selected.has(itemKey(item))" :disabled="saving" @change="toggle(item)" />
                    <span class="tax-review__label">
                        {{ item.label }}
                        <small v-if="item.person === '2'">{{ t('taxPage.review.spouse') }}</small>
                    </span>
                </label>
                <span class="tax-review__origin">{{ item.originLabel }}</span>
                <strong class="tax-review__amount">{{ money(item.amount) }}</strong>
            </li>
        </ul>

        <div v-if="items.length" class="tax-review__actions">
            <button type="button" class="su-btn su-btn--ink" :disabled="saving || !chosen.length" @click="emit('accept', chosen)">
                {{ t('taxPage.review.acceptSelected', { count: chosen.length }) }}
            </button>
        </div>

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
