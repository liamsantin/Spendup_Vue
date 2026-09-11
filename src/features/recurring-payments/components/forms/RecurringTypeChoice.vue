<script setup lang="ts">
defineOptions({ name: 'RecurringTypeChoice' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ChevronRightIcon, Receipt2Icon, TrendingUpIcon } from 'vue-tabler-icons';
import {
    RECURRING_EXPENSE_TYPES,
    RECURRING_INCOME_TYPES,
    type RecurringExpenseType,
    type RecurringIncomeType,
    type RecurringKind
} from '@/features/recurring-payments/types';

const props = withDefaults(
    defineProps<{
        kind?: RecurringKind;
        variant?: 'menu' | 'panel';
    }>(),
    { kind: 'income', variant: 'panel' }
);

export type RecurringTypePick =
    | { kind: 'expense'; type: RecurringExpenseType }
    | { kind: 'income'; type: RecurringIncomeType };

const emit = defineEmits<{
    select: [pick: RecurringTypePick];
}>();

const { t } = useI18n();

const isIncome = computed(() => props.kind === 'income');
const types = computed(() => (isIncome.value ? RECURRING_INCOME_TYPES : RECURRING_EXPENSE_TYPES));

function pick(type: RecurringExpenseType | RecurringIncomeType) {
    if (isIncome.value) emit('select', { kind: 'income', type: type as RecurringIncomeType });
    else emit('select', { kind: 'expense', type: type as RecurringExpenseType });
}
</script>

<template>
    <div class="recurring-type-choice" :class="`recurring-type-choice--${variant}`" role="list">
        <button
            v-for="type in types"
            :key="`${kind}-${type}`"
            type="button"
            class="recurring-type-option"
            :class="[
                isIncome ? 'recurring-type-option--income' : 'recurring-type-option--expense',
                `recurring-type-option--${variant}`
            ]"
            role="listitem"
            @click="pick(type)"
        >
            <span class="recurring-type-option__icon">
                <component :is="isIncome ? TrendingUpIcon : Receipt2Icon" :size="18" stroke-width="1.75" />
            </span>
            <span class="recurring-type-option__title">{{
                t(isIncome ? `recurrencesPage.incomeTypes.${type}` : `recurrencesPage.expenseTypes.${type}`)
            }}</span>
            <ChevronRightIcon class="recurring-type-option__chevron" :size="16" stroke-width="1.8" />
        </button>
    </div>
</template>

<style scoped>
.recurring-type-choice {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.recurring-type-choice--menu {
    gap: 2px;
}

.recurring-type-option {
    --kind-tint: rgb(var(--v-theme-success));
    appearance: none;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    margin: 0;
    padding: 11px 12px;
    border: 1px solid var(--thread);
    border-radius: 18px;
    background: var(--surface-raised);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition:
        background 0.22s var(--ease, ease),
        transform 0.22s var(--ease, ease),
        box-shadow 0.22s var(--ease, ease),
        border-color 0.22s var(--ease, ease);
}

.recurring-type-option--menu {
    padding: 9px 10px 9px 8px;
    border: 0;
    border-radius: 16px;
    background: transparent;
    box-shadow: none;
}

.recurring-type-option--expense {
    --kind-tint: rgb(var(--v-theme-warning));
}

.recurring-type-option:hover,
.recurring-type-option:focus-visible {
    background: color-mix(in srgb, var(--kind-tint) 11%, var(--surface-raised));
    outline: none;
}

.recurring-type-option--panel:hover,
.recurring-type-option--panel:focus-visible {
    border-color: color-mix(in srgb, var(--kind-tint) 45%, var(--thread));
    box-shadow:
        0 10px 22px -16px color-mix(in srgb, var(--kind-tint) 55%, transparent),
        0 0 0 2px color-mix(in srgb, var(--kind-tint) 35%, transparent);
    transform: translateY(-1px);
}

.recurring-type-option--menu:hover,
.recurring-type-option--menu:focus-visible {
    box-shadow: none;
    transform: none;
}

.recurring-type-option__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0) 58%),
        color-mix(in srgb, var(--kind-tint) 16%, var(--surface-raised));
    color: var(--kind-tint);
}

.recurring-type-option--menu .recurring-type-option__icon {
    width: 38px;
    height: 38px;
}

.recurring-type-option__title {
    flex: 1 1 auto;
    min-width: 0;
    font-family: var(--font-heading);
    font-size: 0.92rem;
    font-weight: 650;
    letter-spacing: -0.02em;
    color: var(--ink);
}

.recurring-type-option__chevron {
    flex: none;
    color: var(--ink-muted);
    opacity: 0;
    transform: translateX(-4px);
    transition:
        opacity 0.2s ease,
        transform 0.2s var(--ease, ease),
        color 0.2s ease;
}

.recurring-type-option:hover .recurring-type-option__chevron,
.recurring-type-option:focus-visible .recurring-type-option__chevron {
    opacity: 0.85;
    transform: translateX(0);
    color: var(--kind-tint);
}
</style>
