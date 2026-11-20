<script setup lang="ts">
/** Choix du type (salaire, abonnement…) : items de menu Swiss, pictogramme trait de chaque type. */
defineOptions({ name: 'RecurringTypeChoice' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ChevronRightIcon } from 'vue-tabler-icons';
import { recurringTypeVisual } from '@/features/recurring-payments/components/list/recurring-icons';
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

export type RecurringTypePick = { kind: 'expense'; type: RecurringExpenseType } | { kind: 'income'; type: RecurringIncomeType };

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
            class="su-menu-item recurring-type-option"
            :class="`recurring-type-option--${variant}`"
            role="listitem"
            @click="pick(type)"
        >
            <span
                class="su-tile recurring-type-option__icon"
                :class="`su-tile--${recurringTypeVisual(kind, type).tone}`"
                aria-hidden="true"
            >
                <component :is="recurringTypeVisual(kind, type).icon" :size="18" stroke-width="1.7" />
            </span>
            <span class="su-menu-item__title recurring-type-option__title">{{
                t(isIncome ? `recurrencesPage.incomeTypes.${type}` : `recurrencesPage.expenseTypes.${type}`)
            }}</span>
            <ChevronRightIcon class="recurring-type-option__chevron" :size="16" stroke-width="1.8" aria-hidden="true" />
        </button>
    </div>
</template>

<style scoped>
.recurring-type-choice {
    display: flex;
    flex-direction: column;
}

.recurring-type-option--menu {
    min-height: 48px;
    padding: 6px 10px;
}

/* variante panneau (modale) : lignes sur filet fin */
.recurring-type-option--panel {
    min-height: 56px;
    padding: 10px 8px;
    border-top: 1px solid var(--line);
}

.recurring-type-option__icon {
    flex: none;
}

.recurring-type-option__title {
    flex: 1 1 auto;
    min-width: 0;
}

.recurring-type-option__chevron {
    flex: none;
    color: var(--gray);
    opacity: 0;
    transition: opacity 0.15s var(--ease);
}

.recurring-type-option:hover .recurring-type-option__chevron,
.recurring-type-option:focus-visible .recurring-type-option__chevron {
    opacity: 1;
}
</style>
