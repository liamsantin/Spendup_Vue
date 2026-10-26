<script setup lang="ts">
/** Choix « Une dépense / Un revenu » : item de menu Swiss (carré teinté + titre 700 + description grise). */
defineOptions({ name: 'RecurringKindOption' });

import { ChevronRightIcon, Receipt2Icon, TrendingUpIcon } from 'vue-tabler-icons';
import { useI18n } from 'vue-i18n';
import type { RecurringKind } from '@/features/recurring-payments/types';

withDefaults(
    defineProps<{
        kind: RecurringKind;
        variant?: 'menu' | 'panel';
    }>(),
    { variant: 'panel' }
);

const emit = defineEmits<{
    select: [];
}>();

const { t } = useI18n();
</script>

<template>
    <button
        type="button"
        class="su-menu-item recurring-kind-option"
        :class="[`recurring-kind-option--${kind}`, `recurring-kind-option--${variant}`]"
        @click="emit('select')"
    >
        <span class="su-menu-item__icon recurring-kind-option__icon" aria-hidden="true">
            <component :is="kind === 'expense' ? Receipt2Icon : TrendingUpIcon" :size="18" stroke-width="1.7" />
        </span>
        <span class="recurring-kind-option__copy">
            <span class="su-menu-item__title">{{ t(`recurrencesPage.createAs.${kind}`) }}</span>
            <span class="su-menu-item__desc">{{ t(`recurrencesPage.createHints.${kind}`) }}</span>
        </span>
        <ChevronRightIcon class="recurring-kind-option__chevron" :size="16" stroke-width="1.8" aria-hidden="true" />
    </button>
</template>

<style scoped>
/* variante panneau (modale) : lignes sur filet fin, sans fond */
.recurring-kind-option--panel {
    padding: 12px 8px;
    border-top: 1px solid var(--line);
}

.recurring-kind-option--expense .recurring-kind-option__icon {
    background: var(--t-gray-bg);
    color: var(--ink);
}

.recurring-kind-option--income .recurring-kind-option__icon {
    background: var(--t-blue-bg);
    color: var(--t-blue-ink);
}

.recurring-kind-option__copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1 1 auto;
}

.recurring-kind-option--menu .su-menu-item__desc {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.recurring-kind-option__chevron {
    flex: none;
    color: var(--gray);
    opacity: 0;
    transition: opacity 0.15s var(--ease);
}

.recurring-kind-option:hover .recurring-kind-option__chevron,
.recurring-kind-option:focus-visible .recurring-kind-option__chevron {
    opacity: 1;
}
</style>
