<script setup lang="ts">
/** Ligne importée — carte mobile (tap = corriger). */
import { toRef } from 'vue';
import { useI18n } from 'vue-i18n';
import ImportLineActions from '@/features/imports/components/list/ImportLineActions.vue';
import ImportLineBadges from '@/features/imports/components/list/ImportLineBadges.vue';
import ImportStatusChip from '@/features/imports/components/list/ImportStatusChip.vue';
import { useImportLineDisplay } from '@/features/imports/composables/useImportLineDisplay';
import type { ImportLine } from '@/features/imports/types';

const props = defineProps<{
    line: ImportLine;
    currency?: string | null;
    editable: boolean;
    acting?: boolean;
}>();

const emit = defineEmits<{
    validate: [line: ImportLine];
    ignore: [line: ImportLine];
    restore: [line: ImportLine];
    edit: [line: ImportLine];
}>();

const { t } = useI18n();

const { dateLabel, amountText, amountTone, categoryLabel, paymentMethodLabel, labelText, badges } = useImportLineDisplay(
    toRef(props, 'line'),
    toRef(props, 'currency')
);

function onActivate(event: MouseEvent) {
    if (!props.editable || props.acting) return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    emit('edit', props.line);
}
</script>

<template>
    <article class="import-line-card" :class="[`is-${line.status}`, { 'is-muted': line.status === 'ignoree' }]" @click="onActivate">
        <div class="import-line-card__top">
            <div class="import-line-card__meta">
                <p class="import-line-card__label">{{ labelText }}</p>
                <p class="import-line-card__sub">
                    {{ t('importsPage.lines.lineNumber', { n: line.lineNumber }) }} · {{ dateLabel }}
                    <span v-if="categoryLabel"> · {{ categoryLabel }}</span>
                    <span v-if="paymentMethodLabel"> · {{ paymentMethodLabel }}</span>
                </p>
            </div>
            <span class="import-line-card__amount" :class="amountTone">{{ amountText }}</span>
        </div>
        <ImportLineBadges v-if="badges.length" :badges="badges" wrap :line="line" :currency="currency" :editable="editable && !acting" />
        <div class="import-line-card__bottom">
            <ImportStatusChip :status="line.status" kind="line" />
            <ImportLineActions
                v-if="editable"
                :line="line"
                :acting="acting"
                @validate="emit('validate', $event)"
                @ignore="emit('ignore', $event)"
                @restore="emit('restore', $event)"
                @edit="emit('edit', $event)"
            />
        </div>
    </article>
</template>

<style scoped>
.import-line-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border-radius: 16px;
    background: var(--surface-raised, rgba(255, 255, 255, 0.6));
    box-shadow: 0 0 0 1px var(--hair, rgba(16, 16, 20, 0.06));
}

.import-line-card.is-muted .import-line-card__top {
    opacity: 0.6;
}

.import-line-card__top,
.import-line-card__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.import-line-card__meta {
    flex: 1 1 auto;
    min-width: 0;
}

.import-line-card__label,
.import-line-card__sub {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.import-line-card__label {
    font-size: 0.92rem;
    font-weight: 600;
}

.import-line-card__sub {
    margin-top: 2px;
    font-size: 0.76rem;
    color: var(--ink-muted);
}

.import-line-card__amount {
    flex: none;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
}

.import-line-card__amount.is-debit {
    color: rgb(var(--amount-debit));
}

.import-line-card__amount.is-credit {
    color: rgb(var(--amount-credit));
}
</style>
