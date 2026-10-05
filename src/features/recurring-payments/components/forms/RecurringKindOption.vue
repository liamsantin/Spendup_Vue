<script setup lang="ts">
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
        class="recurring-kind-option"
        :class="[`recurring-kind-option--${kind}`, `recurring-kind-option--${variant}`]"
        @click="emit('select')"
    >
        <span class="recurring-kind-option__icon">
            <component :is="kind === 'expense' ? Receipt2Icon : TrendingUpIcon" :size="variant === 'menu' ? 18 : 20" stroke-width="1.75" />
        </span>
        <span class="recurring-kind-option__copy">
            <span class="recurring-kind-option__title">{{ t(`recurrencesPage.createAs.${kind}`) }}</span>
            <span class="recurring-kind-option__hint">{{ t(`recurrencesPage.createHints.${kind}`) }}</span>
        </span>
        <ChevronRightIcon class="recurring-kind-option__chevron" :size="16" stroke-width="1.8" />
    </button>
</template>

<style scoped>
.recurring-kind-option {
    --kind-tint: rgb(var(--v-theme-primary));
    appearance: none;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    margin: 0;
    border: 0;
    background: transparent;
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

.recurring-kind-option--expense {
    --kind-tint: rgb(var(--v-theme-error));
}

.recurring-kind-option--income {
    --kind-tint: rgb(var(--v-theme-success));
}

.recurring-kind-option--menu {
    padding: 9px 10px 9px 8px;
    border-radius: 16px;
}

.recurring-kind-option--panel {
    padding: 13px 14px;
    border: 1px solid var(--thread);
    border-radius: 18px;
    background: var(--surface-raised);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset;
}

.recurring-kind-option:hover,
.recurring-kind-option:focus-visible {
    background: color-mix(in srgb, var(--kind-tint) 11%, var(--surface-raised));
}

.recurring-kind-option--panel:hover,
.recurring-kind-option--panel:focus-visible {
    border-color: color-mix(in srgb, var(--kind-tint) 45%, var(--thread));
    box-shadow:
        0 10px 22px -16px color-mix(in srgb, var(--kind-tint) 55%, transparent),
        0 0 0 2px color-mix(in srgb, var(--kind-tint) 35%, transparent);
    transform: translateY(-1px);
}

.recurring-kind-option:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--kind-tint) 55%, transparent);
}

.recurring-kind-option__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 13px;
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0) 58%),
        color-mix(in srgb, var(--kind-tint) 16%, var(--surface-raised));
    color: var(--kind-tint);
    box-shadow:
        0 1px 0 rgba(255, 255, 255, 0.8) inset,
        0 6px 14px -10px color-mix(in srgb, var(--kind-tint) 70%, transparent);
}

.recurring-kind-option--menu .recurring-kind-option__icon {
    width: 38px;
    height: 38px;
    border-radius: 12px;
}

.recurring-kind-option__copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1 1 auto;
}

.recurring-kind-option__title {
    font-family: var(--font-heading);
    font-size: 0.94rem;
    font-weight: 680;
    letter-spacing: -0.02em;
    line-height: 1.2;
    color: var(--ink);
}

.recurring-kind-option__hint {
    font-size: 0.75rem;
    font-weight: 450;
    line-height: 1.35;
    color: var(--ink-muted);
}

.recurring-kind-option--menu .recurring-kind-option__hint {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.recurring-kind-option__chevron {
    flex: none;
    color: var(--ink-muted);
    opacity: 0;
    transform: translateX(-4px);
    transition:
        opacity 0.2s ease,
        transform 0.2s var(--ease, ease),
        color 0.2s ease;
}

.recurring-kind-option:hover .recurring-kind-option__chevron,
.recurring-kind-option:focus-visible .recurring-kind-option__chevron {
    opacity: 0.85;
    transform: translateX(0);
    color: var(--kind-tint);
}
</style>
